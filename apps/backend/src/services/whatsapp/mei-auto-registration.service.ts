import logger from "../../utils/logger";
import { CertificateExtractorService } from "../nfse/certificate-extractor.service";
import { buscarCnaesDoCnpj } from "../nfse/cnae-service";
import { CnaeTributacaoMapperService } from "../nfse/cnae-tributacao-mapper.service";
import { createSupabaseClients } from "../../supabase/client";

export interface MeiRegistrationResult {
  success: boolean;
  message: string;
  cnpj?: string;
  nome?: string;
  cnaePrincipal?: string;
  codigoTributario?: string;
  mapeamentos?: Array<{
    cnae: string;
    cnaeDescricao: string;
    codigoTributario: string;
    descricaoServico: string;
    validado: boolean;
  }>;
}

/**
 * Serviço de Cadastro Automático do MEI
 * Extrai dados do certificado, busca CNAEs e mapeia códigos tributários automaticamente
 */
export class MeiAutoRegistrationService {
  private certExtractor: CertificateExtractorService;
  private tributacaoMapper: CnaeTributacaoMapperService;

  constructor() {
    this.certExtractor = new CertificateExtractorService();
    this.tributacaoMapper = new CnaeTributacaoMapperService();
  }

  /**
   * FLUXO COMPLETO: Cadastro automático do MEI
   */
  async processarCadastroCertificado(
    userId: string,
    phone: string,
    pfxBuffer: Buffer,
    password: string,
    codigoMunicipio?: string
  ): Promise<MeiRegistrationResult> {
    logger.info(`[MEI AUTO REG] Iniciando cadastro automático para usuário ${phone}`);

    try {
      // ========== ETAPA 1: EXTRAIR DADOS DO CERTIFICADO ==========
      logger.info('[MEI AUTO REG] Etapa 1: Extraindo dados do certificado...');

      const certData = await this.certExtractor.extractFromPfx(pfxBuffer, password);
      
      // Validar certificado
      this.certExtractor.validateCertificate(certData);

      logger.info(`[MEI AUTO REG] ✅ Certificado extraído: CNPJ ${certData.cnpj}, Nome: ${certData.nome}`);

      // ========== ETAPA 2: CONSULTAR CNAEs NA RECEITA FEDERAL ==========
      logger.info('[MEI AUTO REG] Etapa 2: Consultando CNAEs na Receita Federal...');

      const { principal: cnaePrincipal, secundarios: cnaesSecundarios } = 
        await buscarCnaesDoCnpj(certData.cnpj, userId);

      if (!cnaePrincipal) {
        throw new Error('Não foi possível obter CNAEs do CNPJ. Verifique se o CNPJ está ativo na Receita Federal.');
      }

      logger.info(
        `[MEI AUTO REG] ✅ CNAEs encontrados: Principal ${cnaePrincipal.codigo}, ` +
        `Secundários ${cnaesSecundarios.length}`
      );

      // ========== ETAPA 3: MAPEAR CNAEs → CÓDIGOS TRIBUTÁRIOS ==========
      logger.info('[MEI AUTO REG] Etapa 3: Mapeando CNAEs para códigos tributários...');

      // Coletar todos os CNAEs
      const todosCnaes = [
        cnaePrincipal.codigo,
        ...cnaesSecundarios.map(c => c.codigo)
      ].filter(Boolean);

      // Buscar mapeamentos
      const mapeamentos = [];
      for (const cnae of todosCnaes) {
        const mapping = await this.tributacaoMapper.getCodigoTributacaoByCnae(
          cnae,
          codigoMunicipio
        );
        
        if (mapping) {
          // Encontrar descrição do CNAE
          const cnaeDescricao = cnae === cnaePrincipal.codigo
            ? cnaePrincipal.descricao
            : cnaesSecundarios.find(c => c.codigo === cnae)?.descricao || '';

          mapeamentos.push({
            cnae: cnae,
            cnaeDescricao: cnaeDescricao,
            codigoTributario: mapping.cTribNac,
            descricaoServico: mapping.descricaoServico,
            validado: mapping.validado
          });
        }
      }

      if (mapeamentos.length === 0) {
        logger.warn('[MEI AUTO REG] Nenhuma atividade mapeada, usando código padrão');
        
        // Usar código padrão validado (limpeza)
        const mappingPadrao = await this.tributacaoMapper.getBestCodigoTributacao(
          todosCnaes,
          codigoMunicipio
        );

        mapeamentos.push({
          cnae: cnaePrincipal.codigo,
          cnaeDescricao: cnaePrincipal.descricao,
          codigoTributario: mappingPadrao.cTribNac,
          descricaoServico: mappingPadrao.descricaoServico,
          validado: mappingPadrao.validado
        });
      }

      logger.info(`[MEI AUTO REG] ✅ ${mapeamentos.length} atividades mapeadas`);

      // ========== ETAPA 4: SALVAR NO BANCO ==========
      logger.info('[MEI AUTO REG] Etapa 4: Salvando dados no banco...');

      await this.salvarDadosCadastro(userId, {
        cnpj: certData.cnpj,
        nome: certData.nome,
        email: certData.email,
        telefone: phone,
        cnaePrincipal: cnaePrincipal.codigo,
        cnaesSecundarios: cnaesSecundarios.map(c => c.codigo),
        mapeamentos: mapeamentos,
        certificadoValidade: certData.validadeFim
      });

      // ========== ETAPA 5: MENSAGEM DE SUCESSO ==========
      const mensagem = this.gerarMensagemSucesso(
        certData.cnpj,
        certData.nome,
        cnaePrincipal,
        mapeamentos
      );

      logger.info('[MEI AUTO REG] ✅ Cadastro concluído com sucesso');

      return {
        success: true,
        message: mensagem,
        cnpj: certData.cnpj,
        nome: certData.nome,
        cnaePrincipal: cnaePrincipal.codigo,
        codigoTributario: mapeamentos[0]?.codigoTributario,
        mapeamentos: mapeamentos
      };

    } catch (error: any) {
      logger.error(`[MEI AUTO REG] Erro: ${error.message}`, error.stack);
      
      return {
        success: false,
        message: (
          '❌ Não foi possível concluir seu cadastro.\n\n' +
          `*Motivo:* ${error.message}\n\n` +
          'Por favor, verifique seu certificado e tente novamente.'
        )
      };
    }
  }

  /**
   * Salvar dados no banco
   */
  private async salvarDadosCadastro(userId: string, dados: any): Promise<void> {
    try {
      const { admin } = createSupabaseClients();

      // Atualizar perfil do usuário
      const { error } = await admin
        .from('profiles')
        .update({
          cnpj: dados.cnpj,
          nome: dados.nome || null,
          email: dados.email || null,
          telefone: dados.telefone || null,
          cnae_principal: dados.cnaePrincipal,
          cnaes_secundarios: dados.cnaesSecundarios,
          cnaes_updated_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        logger.error(`[MEI AUTO REG] Erro ao salvar perfil: ${error.message}`);
        throw new Error(`Erro ao salvar dados: ${error.message}`);
      }

      logger.info(`[MEI AUTO REG] ✅ Dados salvos no perfil do usuário ${userId}`);

    } catch (error: any) {
      logger.error(`[MEI AUTO REG] Erro ao salvar dados: ${error.message}`);
      throw error;
    }
  }

  /**
   * Gerar mensagem de sucesso
   */
  private gerarMensagemSucesso(
    cnpj: string,
    nome: string,
    cnaePrincipal: { codigo: string; descricao: string },
    mapeamentos: Array<{
      cnae: string;
      cnaeDescricao: string;
      codigoTributario: string;
      descricaoServico: string;
      validado: boolean;
    }>
  ): string {
    let mensagem = '✅ *Cadastro concluído com sucesso!*\n\n';
    mensagem += `📋 *Empresa:* ${nome}\n`;
    mensagem += `🏢 *CNPJ:* ${this.formatarCNPJ(cnpj)}\n\n`;
    
    mensagem += `*Atividades identificadas:*\n`;
    mapeamentos.forEach((map, idx) => {
      mensagem += `\n${idx + 1}. ${map.cnaeDescricao}\n`;
      mensagem += `   📌 CNAE: ${map.cnae}\n`;
      mensagem += `   💰 Código Tributário: ${map.codigoTributario}\n`;
      mensagem += `   ${map.validado ? '✅ Validado' : '⚠️ Aguardando validação'}\n`;
    });

    mensagem += `\n🎉 Agora você já pode emitir suas notas fiscais pelo WhatsApp!\n`;
    mensagem += `\nDigite *EMITIR NOTA* para começar.`;

    return mensagem;
  }

  /**
   * Formatar CNPJ
   */
  private formatarCNPJ(cnpj: string): string {
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }
}

