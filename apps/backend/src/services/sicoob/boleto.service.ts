/**
 * Sicoob Boleto Service
 * Gerenciamento de boletos bancários
 */

import axios, { AxiosInstance } from 'axios';
import pLimit from 'p-limit';
import {
  DadosBoleto,
  BoletoPayloadV3,
  BoletoResponse,
  ListaBoletos,
  FiltrosBoleto,
  SicoobConfig,
  SicoobValidationError,
  SicoobNotFoundError,
  SicoobServerError,
} from './types';
import { SicoobAuthService } from './auth.service';
import { sicoobLogger } from '../../utils/sicoob-logger';
import * as https from 'https';
import * as http from 'http';
import { buildCertificateConfig } from './certificate.util';

export class SicoobBoletoService {
  private axiosInstance: AxiosInstance;
  private authService: SicoobAuthService;
  private config: SicoobConfig;
  private limitPostBoleto = pLimit(2); // Max 2 req/s for POST /boletos

  constructor(config: SicoobConfig, authService: SicoobAuthService) {
    this.config = config;
    this.authService = authService;
    this.axiosInstance = this.setupHttpClient();
    sicoobLogger.info('SicoobBoletoService inicializado');
  }

  private setupHttpClient(): AxiosInstance {
    const httpsAgent = this.setupMTLS();

    // Usar URL específica de boleto se configurada, senão usar baseUrl + /boleto
    const boletoBaseUrl = process.env.SICOOB_BOLETO_BASE_URL || `${this.config.baseUrl}/cobranca-bancaria/v3`;

    return axios.create({
      baseURL: boletoBaseUrl,
      httpAgent: new http.Agent({ keepAlive: true }),
      httpsAgent: httpsAgent,
      timeout: this.config.timeout || 30000,
    });
  }

  private setupMTLS(): https.Agent {
    try {
      const certificates = buildCertificateConfig(this.config);

      return new https.Agent({
        cert: certificates.cert,
        key: certificates.key,
        ca: certificates.ca ? [certificates.ca] : undefined,
        rejectUnauthorized: this.config.environment === 'production',
      });
    } catch (error) {
      sicoobLogger.error('Erro ao configurar mTLS para Boleto', error as Error);
      throw error;
    }
  }

  /**
   * Gerar boleto bancário
   */
  async gerarBoleto(dados: DadosBoleto): Promise<BoletoResponse> {
    try {
      this.validarDadosBoleto(dados);
      sicoobLogger.debug('Gerando boleto', {
        valor: dados.valorTitulo,
        dataVencimento: dados.dataVencimento,
      });

      const token = await this.authService.getAccessToken();
      const response = await this.axiosInstance.post<BoletoResponse>(
        '/boletos',
        dados,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      sicoobLogger.info('Boleto gerado com sucesso', {
        nossoNumero: response.data.nosso_numero,
        valor: response.data.valor,
      });

      return response.data;
    } catch (error) {
      this.handleError(error, 'Erro ao gerar boleto');
      throw error;
    }
  }

  /**
   * Criar boleto (API V3) usando payload estrito e limpeza de campos
   */
  async criarBoleto(dados: BoletoPayloadV3): Promise<BoletoResponse> {
    // 1) Validar obrigatórios e formatos
    this.validarCamposObrigatorios(dados);
    this.validarFormatos(dados);

    // 2) Limpar payload de campos vazios/opcionais não usados
    const payloadLimpo = this.cleanPayload<BoletoPayloadV3>(dados);

    // 3) Logar requisição (sem dados sensíveis)
    const url = new URL('boletos', (this.axiosInstance.defaults.baseURL || '').replace(/\/$/, '/')).toString();
    sicoobLogger.debug('=== REQUISIÇÃO BOLETO SICOOB V3 ===', {
      url,
      method: 'POST',
      headers: {
        Authorization: 'Bearer [REDACTED]',
        'Content-Type': 'application/json',
      },
      payload: JSON.stringify(payloadLimpo, null, 2),
      payloadSize: JSON.stringify(payloadLimpo).length,
      propriedades: Object.keys(payloadLimpo),
    });

    // 4) Token e verificação de escopos (antes para reutilizar em fallback)
    const token = await this.authService.getAccessToken();
    await this.verificarEscopos(token, ['boletos_inclusao']);

    const doPost = (body: any) => {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };
      if (this.config.cooperativa) headers['x-cooperativa'] = String(this.config.cooperativa);
      if (this.config.conta) headers['x-conta-corrente'] = String(this.config.conta);

      return this.axiosInstance.post<BoletoResponse>(
        '/boletos',
        body,
        {
          headers,
          timeout: 30000,
        }
      );
    };

    try {
      // 5) POST com rate limit (2 req/s)
      const response = await this.limitPostBoleto(() => doPost(payloadLimpo));

      sicoobLogger.info('Boleto criado com sucesso', {
        nossoNumero: response.data?.nosso_numero,
        linhaDigitavel: response.data?.numero_boleto,
      });
      return response.data;
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        sicoobLogger.error('=== ERRO BOLETO SICOOB V3 ===', error, {
          status: error.response?.status,
          statusText: error.response?.statusText,
          errorData: JSON.stringify(error.response?.data, null, 2),
          headers: error.response?.headers,
          requestPayload: JSON.stringify(payloadLimpo, null, 2),
        });

        if (error.response?.status === 406) {
          const raw = error.response?.data;
          const rawStr = typeof raw === 'string' ? raw : JSON.stringify(raw);
          const indicaContrato = /numeroContrato/i.test(rawStr);
          const indicaModalidade = /modalidade/i.test(rawStr);
          const indicaEspecie = /especieDocumento/i.test(rawStr);
          const indicaConta = /numeroContaCorrente/i.test(rawStr);

          // Tentativa automática de compatibilidade: remover campos rejeitados
          if (indicaContrato || indicaModalidade || indicaEspecie || indicaConta) {
            // Para compatibilidade com sandbox: remova todos os campos sinalizados
            const payloadCompat: any = { ...payloadLimpo } as any;
            if (payloadCompat.numeroContrato !== undefined) delete payloadCompat.numeroContrato;
            if (payloadCompat.modalidade !== undefined) delete payloadCompat.modalidade;
            if (payloadCompat.especieDocumento !== undefined) delete payloadCompat.especieDocumento;
            if (payloadCompat.numeroContaCorrente !== undefined) delete payloadCompat.numeroContaCorrente;

            const compatLimpo = this.cleanPayload(payloadCompat);
            sicoobLogger.warn('Reenviando sem campos rejeitados (compat)', {
              removidos: {
                numeroContrato: indicaContrato,
                modalidade: indicaModalidade,
                especieDocumento: indicaEspecie,
                numeroContaCorrente: indicaConta,
              },
              payload: JSON.stringify(compatLimpo, null, 2),
            });

            try {
              const retryResp = await this.limitPostBoleto(() => doPost(compatLimpo));
              sicoobLogger.info('Boleto criado após compatibilidade', {
                nossoNumero: retryResp.data?.nosso_numero,
              });
              return retryResp.data;
            } catch (e2: any) {
              sicoobLogger.error('Falha também no modo compat', e2, {
                status: e2?.response?.status,
                data: e2?.response?.data,
              });
            }
          }

          // 406 específico: schema inválido / propriedade inesperada
          throw new SicoobValidationError(
            'Payload inválido - verifique propriedades enviadas',
            error.response?.data
          );
        }
      }
      this.handleError(error, 'Erro ao criar boleto');
      throw error;
    }
  }

  /**
   * Consultar boleto por nosso número
   */
  async consultarBoleto(nossoNumero: string): Promise<BoletoResponse> {
    try {
      if (!nossoNumero || nossoNumero.trim() === '') {
        throw new SicoobValidationError('Nosso número é obrigatório');
      }

      sicoobLogger.debug('Consultando boleto', { nossoNumero });

      const token = await this.authService.getAccessToken();
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      };
      if (this.config.cooperativa) headers['x-cooperativa'] = String(this.config.cooperativa);
      if (this.config.conta) headers['x-conta-corrente'] = String(this.config.conta);

      const response = await this.axiosInstance.get<BoletoResponse>(
        `/boletos/${nossoNumero}`,
        {
          headers,
        }
      );

      sicoobLogger.debug('Boleto consultado com sucesso', {
        nossoNumero,
        status: response.data.status,
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        throw new SicoobNotFoundError(`Boleto não encontrado: ${nossoNumero}`);
      }
      this.handleError(error, 'Erro ao consultar boleto');
      throw error;
    }
  }

  /**
   * Cancelar boleto
   */
  async cancelarBoleto(nossoNumero: string): Promise<void> {
    try {
      if (!nossoNumero || nossoNumero.trim() === '') {
        throw new SicoobValidationError('Nosso número é obrigatório');
      }

      sicoobLogger.debug('Cancelando boleto', { nossoNumero });

      const token = await this.authService.getAccessToken();
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      };
      if (this.config.cooperativa) headers['x-cooperativa'] = String(this.config.cooperativa);
      if (this.config.conta) headers['x-conta-corrente'] = String(this.config.conta);

      await this.axiosInstance.delete(
        `/boletos/${nossoNumero}`,
        {
          headers,
        }
      );

      sicoobLogger.info('Boleto cancelado com sucesso', { nossoNumero });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        throw new SicoobNotFoundError(`Boleto não encontrado: ${nossoNumero}`);
      }
      this.handleError(error, 'Erro ao cancelar boleto');
      throw error;
    }
  }

  /**
   * Listar boletos com filtros
   */
  async listarBoletos(filtros?: FiltrosBoleto): Promise<ListaBoletos> {
    try {
      sicoobLogger.debug('Listando boletos', filtros);

      const token = await this.authService.getAccessToken();
      const params = new URLSearchParams();

      if (filtros?.status) params.append('status', filtros.status);
      if (filtros?.data_inicio)
        params.append('data_inicio', filtros.data_inicio);
      if (filtros?.data_fim) params.append('data_fim', filtros.data_fim);
      if (filtros?.pagina) params.append('pagina', filtros.pagina.toString());
      if (filtros?.limite) params.append('limite', filtros.limite.toString());

      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      };
      if (this.config.cooperativa) headers['x-cooperativa'] = String(this.config.cooperativa);
      if (this.config.conta) headers['x-conta-corrente'] = String(this.config.conta);

      const response = await this.axiosInstance.get<ListaBoletos>(
        '/boletos',
        {
          params: Object.fromEntries(params),
          headers,
        }
      );

      sicoobLogger.debug('Boletos listados', {
        total: response.data.paginacao.total_itens,
      });

      return response.data;
    } catch (error) {
      this.handleError(error, 'Erro ao listar boletos');
      throw error;
    }
  }

  /**
   * Baixar PDF do boleto
   */
  async baixarPDF(nossoNumero: string): Promise<Buffer> {
    try {
      if (!nossoNumero || nossoNumero.trim() === '') {
        throw new SicoobValidationError('Nosso número é obrigatório');
      }

      sicoobLogger.debug('Baixando PDF do boleto', { nossoNumero });

      const token = await this.authService.getAccessToken();
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        Accept: 'application/pdf',
      };
      if (this.config.cooperativa) headers['x-cooperativa'] = String(this.config.cooperativa);
      if (this.config.conta) headers['x-conta-corrente'] = String(this.config.conta);

      const response = await this.axiosInstance.get(
        `/boletos/${nossoNumero}/pdf`,
        {
          headers,
          responseType: 'arraybuffer',
        }
      );

      sicoobLogger.info('PDF do boleto baixado com sucesso', { nossoNumero });

      return Buffer.from(response.data);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        throw new SicoobNotFoundError(`Boleto não encontrado: ${nossoNumero}`);
      }
      this.handleError(error, 'Erro ao baixar PDF do boleto');
      throw error;
    }
  }

  /**
   * Validar dados do boleto
   */
  private validarDadosBoleto(dados: DadosBoleto): void {
    // Validações conforme API Sicoob Cobrança Bancária V3
    if (!dados.modalidade || ![1].includes(dados.modalidade)) {
      throw new SicoobValidationError('Modalidade inválida (use 1 para Simples)');
    }

    if (!dados.numeroTituloCliente || dados.numeroTituloCliente.trim() === '') {
      throw new SicoobValidationError('Número do título do cliente (seu número) é obrigatório');
    }

    if (!dados.pagador || !dados.pagador.nome) {
      throw new SicoobValidationError('Nome do pagador é obrigatório');
    }

    if (!dados.pagador.numeroCpfCnpj) {
      throw new SicoobValidationError('CPF/CNPJ do pagador é obrigatório');
    }

    if (!dados.pagador.tipoPessoa || ![1, 2].includes(dados.pagador.tipoPessoa)) {
      throw new SicoobValidationError('Tipo de pessoa do pagador inválido (1 = Física, 2 = Jurídica)');
    }

    if (!dados.valorTitulo || dados.valorTitulo <= 0) {
      throw new SicoobValidationError('Valor do título deve ser maior que 0');
    }

    if (!dados.dataVencimento) {
      throw new SicoobValidationError('Data de vencimento é obrigatória');
    }

    const dataVencimento = new Date(dados.dataVencimento);
    if (isNaN(dataVencimento.getTime())) {
      throw new SicoobValidationError('Data de vencimento inválida');
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    if (dataVencimento < hoje) {
      throw new SicoobValidationError(
        'Data de vencimento não pode ser no passado'
      );
    }
  }

  // ---------------- V3 Helpers -----------------

  /**
   * Remove undefined, null, empty strings, and empties in arrays/objects
   */
  private cleanPayload<T extends Record<string, any>>(obj: T): Partial<T> {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // skip undefined, null, empty string
      if (
        value === undefined ||
        value === null ||
        (typeof value === 'string' && value.trim() === '')
      ) {
        continue;
      }

      if (Array.isArray(value)) {
        const cleanedArray = value
          .map((item) => (typeof item === 'object' && item !== null ? this.cleanPayload(item) : item))
          .filter((item) => item !== null && item !== undefined);
        if (cleanedArray.length > 0) cleaned[key] = cleanedArray;
        continue;
      }

      if (typeof value === 'object') {
        const cleanedObj = this.cleanPayload(value as Record<string, any>);
        if (Object.keys(cleanedObj).length > 0) cleaned[key] = cleanedObj;
        continue;
      }

      cleaned[key] = value;
    }
    return cleaned;
  }

  private validarCamposObrigatorios(dados: BoletoPayloadV3): void {
    const camposObrigatorios: Array<keyof BoletoPayloadV3> = [
      'numeroContrato',
      'modalidade',
      'numeroContaCorrente',
      'especieDocumento',
      'dataEmissao',
      'dataVencimento',
      'valorNominal',
      'pagador',
    ];

    const faltando: string[] = [];
    for (const campo of camposObrigatorios) {
      if (!(dados as any)[campo]) faltando.push(String(campo));
    }

    if (dados.pagador) {
      const camposPagador: Array<keyof BoletoPayloadV3['pagador']> = [
        'numeroCpfCnpj',
        'nome',
        'endereco',
        'cidade',
        'cep',
        'uf',
      ];
      for (const c of camposPagador) {
        if (!(dados.pagador as any)[c]) faltando.push(`pagador.${String(c)}`);
      }
    } else {
      faltando.push('pagador');
    }

    if (faltando.length > 0) {
      throw new SicoobValidationError(
        `Campos obrigatórios faltando: ${faltando.join(', ')}`
      );
    }
  }

  private validarFormatos(dados: BoletoPayloadV3): void {
    // CPF/CNPJ
    const cpfCnpj = (dados.pagador.numeroCpfCnpj || '').replace(/\D/g, '');
    if (cpfCnpj.length !== 11 && cpfCnpj.length !== 14) {
      throw new SicoobValidationError('CPF/CNPJ inválido');
    }

    // CEP
    const cep = (dados.pagador.cep || '').replace(/\D/g, '');
    if (cep.length !== 8) {
      throw new SicoobValidationError('CEP deve ter 8 dígitos');
    }

    // UF
    if (!dados.pagador.uf || dados.pagador.uf.length !== 2) {
      throw new SicoobValidationError('UF deve ter 2 caracteres');
    }

    // Datas
    const regexData = /^\d{4}-\d{2}-\d{2}$/;
    if (!regexData.test(dados.dataEmissao)) {
      throw new SicoobValidationError('dataEmissao deve estar no formato YYYY-MM-DD');
    }
    if (!regexData.test(dados.dataVencimento)) {
      throw new SicoobValidationError('dataVencimento deve estar no formato YYYY-MM-DD');
    }

    // Valor nominal
    if (dados.valorNominal <= 0) {
      throw new SicoobValidationError('valorNominal deve ser maior que zero');
    }
  }

  private async verificarEscopos(token: string, necessarios: string[]): Promise<void> {
    try {
      const parts = token.split('.');
      if (parts.length < 2) return; // Não validamos se token não for JWT
      const payloadJson = Buffer.from(parts[1], 'base64').toString();
      const payload: any = JSON.parse(payloadJson);

      const presentes: string[] = Array.isArray(payload.scp)
        ? payload.scp
        : typeof payload.scope === 'string'
        ? String(payload.scope).split(/[\s]+/)
        : [];

      const faltando = necessarios.filter((s) => !presentes.includes(s));
      if (faltando.length > 0) {
        throw new SicoobValidationError(
          `Escopos faltando no token: ${faltando.join(', ')}`
        );
      }
      sicoobLogger.info('Escopos validados', { escopos: presentes });
    } catch (e) {
      // Se não conseguirmos ler o payload, seguimos sem bloquear
      sicoobLogger.warn('Não foi possível validar escopos do token (seguindo)', {
        detalhe: (e as Error).message,
      });
    }
  }

  /**
   * Tratar erros da API
   */
  private handleError(error: any, defaultMessage: string): void {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const data = error.response?.data;

      if (status === 400) {
        sicoobLogger.warn(defaultMessage, {
          error: data,
          status,
        });
        throw new SicoobValidationError(defaultMessage, data);
      }

      if (status && status >= 500) {
        sicoobLogger.error(defaultMessage, error, {
          status,
          data,
        });
        throw new SicoobServerError(defaultMessage, status, data);
      }
    }

    sicoobLogger.error(defaultMessage, error as Error);
  }
}
