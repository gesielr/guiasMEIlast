// Serviço para gerenciar o fluxo conversacional de emissão de NFS-e via WhatsApp
import { NfseService } from '../../nfse/services/nfse.service';
import { buildDpsXml } from '../../nfse/templates/dps-template';
import type { CreateDpsDto } from '../../nfse/dto/create-dps.dto';
import { gzipSync } from 'node:zlib';
import { createSupabaseClients } from '../../../services/supabase';
import logger from '../../utils/logger';
import {
  buscarCnaesDoCnpj,
  mapearCnaeParaCodigosTributacao,
  validarCodigosTributacaoMunicipio,
  gerarDescricoesServico
} from '../nfse/cnae-service';

const { admin } = createSupabaseClients();

export type EmissionFlowState = 
  | 'idle'
  | 'waiting_cpf_cnpj'
  | 'waiting_tomador_nome'
  | 'confirming_tomador'
  | 'waiting_descricao'
  | 'waiting_valor'
  | 'confirming_emissao'
  | 'choosing_correction'
  | 'emitting'
  | 'completed'
  | 'error';

export interface EmissionFlowData {
  state: EmissionFlowState;
  tomadorDocumento?: string;
  tomadorNome?: string;
  tomadorEndereco?: any; // Endereço completo do tomador (quando disponível da API)
  tomadorFone?: string; // Telefone do tomador (quando disponível da API)
  tomadorEmail?: string; // Email do tomador (quando disponível da API)
  descricao?: string;
  descricaoDigitada?: string; // Texto informado pelo usuário (quando diferente da descrição oficial do serviço)
  codigoTributacao?: string; // Código de tributação selecionado
  itemListaLc116?: string; // Item da lista LC 116
  valor?: number;
  errorMessage?: string;
  servicosDisponiveis?: Array<{ numero: number; descricao: string; codigoTributacao: string; itemListaLc116: string }>; // Serviços disponíveis baseados no CNAE
  servicosSecundarios?: Array<{ numero: number; descricao: string; codigoTributacao: string; itemListaLc116: string }>; // Serviços dos CNAEs secundários
  e999RetryCount?: number; // Contador de retries para erro E999 (replay inteligente)
  waitingFreeTextForServices?: boolean; // ✅ NOVO: Flag indicando que estamos esperando texto livre para resolver serviços (fallback UX)
  fallbackServicos?: Array<{ numero: number; descricao: string; codigoTributacao: string; itemListaLc116: string }>;
}

// Cache de estados por telefone (em produção, usar Redis ou banco)
const flowStates = new Map<string, EmissionFlowData>();

// Timeout de 10 minutos de inatividade
const FLOW_TIMEOUT = 10 * 60 * 1000;
const flowTimers = new Map<string, NodeJS.Timeout>();

const TAXA_NFSE = 3.00; // Pode ser obtido do banco

/**
 * Limpa o estado do fluxo após timeout
 */
function clearFlowState(phone: string) {
  flowStates.delete(phone);
  const timer = flowTimers.get(phone);
  if (timer) {
    clearTimeout(timer);
    flowTimers.delete(phone);
  }
}

/**
 * Reseta o timer de inatividade
 */
function resetFlowTimer(phone: string) {
  const existingTimer = flowTimers.get(phone);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }
  
  const timer = setTimeout(() => {
    logger.info(`[NFSE FLOW] Timeout de inatividade para ${phone}`);
    clearFlowState(phone);
  }, FLOW_TIMEOUT);
  
  flowTimers.set(phone, timer);
}

/**
 * Valida CPF usando algoritmo de dígitos verificadores
 */
function validarCpf(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '');
  
  // Verificar se tem 11 dígitos
  if (digits.length !== 11) {
    return false;
  }
  
  // Verificar se todos os dígitos são iguais (CPF inválido)
  if (/^(\d)\1{10}$/.test(digits)) {
    return false;
  }
  
  // Validar primeiro dígito verificador
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(digits.charAt(i)) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(digits.charAt(9))) {
    return false;
  }
  
  // Validar segundo dígito verificador
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(digits.charAt(i)) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(digits.charAt(10))) {
    return false;
  }
  
  return true;
}

/**
 * Valida CNPJ usando algoritmo de dígitos verificadores
 */
function validarCnpj(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, '');
  
  // Verificar se tem 14 dígitos
  if (digits.length !== 14) {
    return false;
  }
  
  // Verificar se todos os dígitos são iguais (CNPJ inválido)
  if (/^(\d)\1{13}$/.test(digits)) {
    return false;
  }
  
  // Validar primeiro dígito verificador
  let tamanho = digits.length - 2;
  let numeros = digits.substring(0, tamanho);
  const digitos = digits.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;
  
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
  if (resultado !== parseInt(digitos.charAt(0))) {
    return false;
  }
  
  // Validar segundo dígito verificador
  tamanho = tamanho + 1;
  numeros = digits.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;
  
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
  if (resultado !== parseInt(digitos.charAt(1))) {
    return false;
  }
  
  return true;
}

/**
 * Valida se o documento contém apenas números e se é um CPF ou CNPJ válido
 */
function validarFormatoDocumento(documento: string): { valido: boolean; erro?: string; tipo?: 'cpf' | 'cnpj' } {
  const digits = documento.replace(/\D/g, '');
  
  // Verificar se tem letras
  if (/[a-zA-Z]/.test(documento)) {
    return {
      valido: false,
      erro: '❌ O documento deve conter apenas números.\n\nExemplo CPF: 12345678901\nExemplo CNPJ: 41568425000189\n\nDigite novamente sem letras, pontos ou barras.'
    };
  }
  
  // Verificar quantidade de dígitos
  if (digits.length !== 11 && digits.length !== 14) {
    return {
      valido: false,
      erro: `❌ Documento inválido. Deve ter 11 dígitos (CPF) ou 14 dígitos (CNPJ).\n\nVocê digitou ${digits.length} dígitos.\n\nExemplo CPF: 12345678901\nExemplo CNPJ: 41568425000189\n\nDigite novamente apenas números.`
    };
  }
  
  // Validar CPF
  if (digits.length === 11) {
    if (!validarCpf(digits)) {
      return {
        valido: false,
        erro: '❌ CPF inválido. O número digitado não é um CPF válido.\n\nVerifique os dígitos e digite novamente.\n\nExemplo de CPF válido: 12345678901'
      };
    }
    return { valido: true, tipo: 'cpf' };
  }
  
  // Validar CNPJ
  if (digits.length === 14) {
    if (!validarCnpj(digits)) {
      return {
        valido: false,
        erro: '❌ CNPJ inválido. O número digitado não é um CNPJ válido.\n\nVerifique os dígitos e digite novamente.\n\nExemplo de CNPJ válido: 41568425000189'
      };
    }
    return { valido: true, tipo: 'cnpj' };
  }
  
  return { valido: false, erro: 'Documento inválido' };
}

/**
 * Valida CPF ou CNPJ (mantido para compatibilidade)
 */
function validarCpfCnpj(documento: string): boolean {
  const resultado = validarFormatoDocumento(documento);
  return resultado.valido;
}

/**
 * Formata documento para busca (remove formatação)
 */
function formatarDocumento(documento: string): string {
  return documento.replace(/\D/g, '');
}

/**
 * Normaliza string removendo acentos e convertendo para minúsculas
 */
function normalizarNomeMunicipio(nome: string): string {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .trim();
}

/**
 * Busca código IBGE do município pela UF e nome do município
 */
async function buscarCodigoMunicipioIBGE(uf: string, nomeMunicipio: string): Promise<string | null> {
  if (!uf || !nomeMunicipio) {
    logger.warn('[NFSE FLOW] UF ou nome do município não informado para busca IBGE', { uf, nomeMunicipio });
    return null;
  }
  
  try {
    const ufNormalizada = uf.toUpperCase().trim();
    const apiUrl = `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${ufNormalizada}/municipios`;
    
    logger.info('[NFSE FLOW] Buscando código IBGE do município', { uf: ufNormalizada, nomeMunicipio });
    
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      logger.warn('[NFSE FLOW] Erro ao buscar municípios na API IBGE', { 
        status: response.status, 
        uf: ufNormalizada 
      });
      return null;
    }
    
    const municipios = await response.json();
    
    if (!Array.isArray(municipios) || municipios.length === 0) {
      logger.warn('[NFSE FLOW] Nenhum município encontrado na API IBGE', { uf: ufNormalizada });
      return null;
    }
    
    // Normalizar nome do município para busca
    const nomeNormalizado = normalizarNomeMunicipio(nomeMunicipio);
    
    // Buscar município que case com o nome (busca parcial e exata)
    let municipioEncontrado = municipios.find((m: any) => {
      const nomeMunicipioAPI = normalizarNomeMunicipio(m.nome);
      // Busca exata ou parcial (o nome do município pode estar dentro do nome retornado)
      return nomeMunicipioAPI === nomeNormalizado || 
             nomeMunicipioAPI.includes(nomeNormalizado) ||
             nomeNormalizado.includes(nomeMunicipioAPI);
    });
    
    // Se não encontrou, tentar buscar por similaridade (primeira palavra)
    if (!municipioEncontrado && nomeNormalizado.includes(' ')) {
      const primeiraPalavra = nomeNormalizado.split(' ')[0];
      municipioEncontrado = municipios.find((m: any) => {
        const nomeMunicipioAPI = normalizarNomeMunicipio(m.nome);
        return nomeMunicipioAPI.startsWith(primeiraPalavra);
      });
    }
    
    if (municipioEncontrado && municipioEncontrado.id) {
      logger.info('[NFSE FLOW] Código IBGE encontrado', { 
        uf: ufNormalizada, 
        nomeMunicipio,
        codigoIBGE: municipioEncontrado.id 
      });
      return municipioEncontrado.id.toString();
    }
    
    logger.warn('[NFSE FLOW] Município não encontrado na API IBGE', { 
      uf: ufNormalizada, 
      nomeMunicipio,
      totalMunicipios: municipios.length 
    });
    
    return null;
  } catch (error) {
    logger.error('[NFSE FLOW] Erro ao buscar código IBGE do município', { 
      error, 
      uf, 
      nomeMunicipio 
    });
    return null;
  }
}

/**
 * Busca dados do tomador via API da Receita Federal
 */
async function buscarDadosTomador(documento: string): Promise<{ nome: string; documento: string; endereco?: any; fone?: string; email?: string } | null> {
  const docFormatado = formatarDocumento(documento);
  
  try {
    // Se for CNPJ, buscar na API da Receita Federal
    if (docFormatado.length === 14) {
      logger.info('[NFSE FLOW] Buscando CNPJ na Receita Federal', { cnpj: docFormatado });
      
      try {
        // Usar API ReceitaWS (gratuita, sem CORS se chamada do backend)
        const apiUrl = `https://www.receitaws.com.br/v1/cnpj/${docFormatado}`;
        const response = await fetch(apiUrl, {
          headers: {
            'Accept': 'application/json'
          }
        });
        
        if (!response.ok) {
          logger.warn('[NFSE FLOW] Erro ao buscar CNPJ na ReceitaWS', { 
            status: response.status, 
            cnpj: docFormatado 
          });
          return null;
        }
        
        const data = await response.json();
        
        // Verificar se retornou erro da API
        if (data.status === 'ERROR' || data.message) {
          logger.warn('[NFSE FLOW] CNPJ não encontrado na ReceitaWS', { 
            cnpj: docFormatado,
            message: data.message 
          });
          return null;
        }
        
        // Extrair nome fantasia (prioritário) ou razão social
        const nomeFantasia = data.nome || data.fantasia || data.nome_fantasia;
        const razaoSocial = data.razao_social || data.nome;
        const nome = nomeFantasia || razaoSocial || null;
        
        if (!nome) {
          logger.warn('[NFSE FLOW] CNPJ encontrado mas sem nome', { cnpj: docFormatado, data });
          return null;
        }
        
        // Extrair endereço se disponível
        let endereco = undefined;
        if (data.logradouro || data.endereco) {
          let codigoMunicipio = data.codigo_municipio;
          
          // Se o código do município estiver vazio, buscar na API IBGE
          if (!codigoMunicipio && data.municipio && data.uf) {
            logger.info('[NFSE FLOW] Código do município vazio, buscando na API IBGE', {
              municipio: data.municipio,
              uf: data.uf
            });
            
            const codigoIBGE = await buscarCodigoMunicipioIBGE(data.uf, data.municipio);
            if (codigoIBGE) {
              codigoMunicipio = codigoIBGE;
            } else {
              logger.warn('[NFSE FLOW] Não foi possível buscar código IBGE, usando padrão', {
                municipio: data.municipio,
                uf: data.uf
              });
            }
          }
          
          // Código de município padrão (São Paulo) se ainda estiver vazio
          const codigoMunicipioPadraoAPI = '3550308'; // São Paulo
          endereco = {
            logradouro: data.logradouro || data.endereco || '',
            numero: data.numero || '0',
            bairro: data.bairro || '',
            municipio: data.municipio || '',
            uf: data.uf || 'SP',
            cep: (data.cep || '').replace(/\D/g, '') || '01000000',
            codigoMunicipio: codigoMunicipio || codigoMunicipioPadraoAPI
          };
        }
        
        // Extrair telefone e email se disponíveis
        // A API ReceitaWS pode retornar telefone e email em diferentes campos
        const fone = data.telefone || data.phone || data.fone || undefined;
        const email = data.email || data.email_principal || undefined;
        
        // Normalizar telefone: remover caracteres não numéricos e limitar a 20 dígitos (XSD: [0-9]{6,20})
        const normalizePhoneForXsd = (phone: string | undefined | null): string | undefined => {
          if (!phone) return undefined;
          const digitsOnly = phone.replace(/\D/g, '');
          if (!digitsOnly || digitsOnly.length < 6) return undefined; // Mínimo 6 dígitos
          return digitsOnly.slice(0, 20); // Máximo 20 dígitos
        };
        const foneNormalizado = normalizePhoneForXsd(fone);
        
        logger.info('[NFSE FLOW] CNPJ encontrado na ReceitaWS', { 
          cnpj: docFormatado, 
          nome,
          hasEndereco: !!endereco,
          hasFone: !!foneNormalizado,
          hasEmail: !!email
        });
        
        return {
          nome,
          documento: docFormatado,
          endereco,
          fone: foneNormalizado,
          email
        };
      } catch (apiError) {
        logger.error('[NFSE FLOW] Erro na chamada à API ReceitaWS', { 
          error: apiError, 
          cnpj: docFormatado 
        });
        // Em caso de erro na API, retornar null para pedir nome manualmente
        return null;
      }
    }
    
    // Se for CPF, não há API pública confiável, pedir nome manualmente
    if (docFormatado.length === 11) {
      return null;
    }
    
    return null;
  } catch (error) {
    logger.error('[NFSE FLOW] Erro ao buscar dados do tomador', { error, documento: docFormatado });
    return null;
  }
}

/**
 * Normaliza valor digitado para padrão brasileiro e converte para número
 * Aceita: 10, 10.5, 105.5, 10,00, 1.000,00, 1,000.00, etc.
 * Retorna: número para cálculos internos
 * Padrão brasileiro: vírgula para decimal, ponto para milhar (1.000,00)
 */
function normalizarValorParaNumero(valor: string): number | null {
  // Remove espaços e caracteres não numéricos exceto vírgula e ponto
  let valorLimpo = valor.replace(/[^\d,.-]/g, '').trim();
  
  if (!valorLimpo) {
    return null;
  }
  
  const temVirgula = valorLimpo.includes(',');
  const temPonto = valorLimpo.includes('.');
  
  // Caso 1: Tem vírgula E ponto
  if (temVirgula && temPonto) {
    const ultimaVirgula = valorLimpo.lastIndexOf(',');
    const ultimoPonto = valorLimpo.lastIndexOf('.');
    
    // O separador mais à direita é o decimal
    if (ultimaVirgula > ultimoPonto) {
      // Padrão brasileiro: 1.000,50 → vírgula é decimal
      valorLimpo = valorLimpo.replace(/\./g, '').replace(',', '.');
    } else {
      // Padrão americano: 1,000.50 → ponto é decimal
      valorLimpo = valorLimpo.replace(/,/g, '');
    }
  }
  // Caso 2: Só tem vírgula
  else if (temVirgula && !temPonto) {
    const partes = valorLimpo.split(',');
    // Se tem 2 partes e a segunda tem 1-2 dígitos → vírgula é decimal
    if (partes.length === 2 && partes[1].length <= 2) {
      // Ex: 10,50 → 10.50
      valorLimpo = valorLimpo.replace(',', '.');
    } else {
      // Ex: 10, ou 10,500 → tratar como decimal mesmo assim
      valorLimpo = valorLimpo.replace(',', '.');
    }
  }
  // Caso 3: Só tem ponto
  else if (temPonto && !temVirgula) {
    const partes = valorLimpo.split('.');
    // Se tem múltiplos pontos ou primeiro grupo tem mais de 3 dígitos → é milhar
    if (partes.length > 2 || (partes[0].length > 3 && partes[1] && partes[1].length <= 2)) {
      // Ex: 1.000 ou 1.000.500 → remover pontos (é milhar)
      valorLimpo = valorLimpo.replace(/\./g, '');
    } else if (partes.length === 2) {
      // Ex: 10.50, 1000.60, 1.000 → precisa determinar se é decimal ou milhar
      // Se a segunda parte tem 1-2 dígitos → provavelmente é decimal
      if (partes[1].length <= 2) {
        // Se primeiro grupo tem 3 dígitos ou menos → é decimal (10.50, 100.50)
        if (partes[0].length <= 3) {
          // Manter como está (já é decimal, ex: 10.50 → 10.50)
          // Não fazer nada
        } else {
          // Primeiro grupo tem mais de 3 dígitos e segunda parte tem 1-2 dígitos
          // Ex: 1000.60 → tratar como decimal (1000.60 → 1000.60)
          // O formato brasileiro será aplicado depois (1000.60 → 1.000,60)
          // Não fazer nada - manter como decimal
        }
      } else {
        // Segunda parte tem mais de 2 dígitos → provavelmente é milhar mal formatado
        // Ex: 1.000500 → remover pontos
        valorLimpo = valorLimpo.replace(/\./g, '');
      }
    } else {
      // Múltiplos pontos ou formato inválido → remover pontos (assumir milhar)
      valorLimpo = valorLimpo.replace(/\./g, '');
    }
  }
  // Caso 4: Só números (sem vírgula nem ponto)
  // Já está pronto para parseFloat
  
  // Converter para número (já com ponto como separador decimal se necessário)
  const numero = parseFloat(valorLimpo);
  
  if (isNaN(numero) || numero <= 0) {
    return null;
  }
  
  return numero;
}

/**
 * Formata número para padrão brasileiro (1.000,00)
 */
function formatarValorBrasileiro(valor: number): string {
  return valor.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * Valida valor numérico (mantido para compatibilidade, mas usa normalização)
 */
function validarValor(valor: string): number | null {
  return normalizarValorParaNumero(valor);
}

/**
 * Processa mensagem no fluxo de emissão
 */
export async function processarFluxoEmissao(
  phone: string,
  message: string,
  userId: string,
  userProfile: any
): Promise<{ response: string; shouldContinue: boolean; pdfUrl?: string; emissaoConcluida?: boolean }> {
  resetFlowTimer(phone);
  
  const state = flowStates.get(phone) || { state: 'idle' };
  const normalized = message.toLowerCase().trim();
  
  // Log detalhado do estado atual
  const estadoCompleto = flowStates.get(phone);
  logger.info('[NFSE FLOW] Processando mensagem', {
    phone,
    message: message.substring(0, 50),
    normalized,
    currentState: state.state,
    hasState: !!flowStates.get(phone),
    estadoCompleto: estadoCompleto ? {
      state: estadoCompleto.state,
      tomadorNome: estadoCompleto.tomadorNome,
      hasValor: estadoCompleto.valor !== undefined,
      hasDescricao: !!estadoCompleto.descricao
    } : null,
    todosEstados: Array.from(flowStates.keys())
  });
  
  // Se usuário pedir para cancelar ou sair
  if (normalized.includes('cancelar') || normalized.includes('sair') || normalized.includes('voltar')) {
    if (state.state !== 'idle') {
      clearFlowState(phone);
      return {
        response: 'Emissão cancelada. Como posso ajudar?',
        shouldContinue: false
      };
    }
  }
  
  // Iniciar fluxo se usuário pedir "emitir nota" ou escolher opção 1
  if (normalized.includes('emitir nota') || normalized.includes('quero emitir') || normalized.includes('emitir nfse') || normalized === '1') {
    if (state.state === 'idle') {
      flowStates.set(phone, { state: 'waiting_cpf_cnpj' });
      return {
        response: 'Digite o CPF ou CNPJ de quem você prestou o serviço:',
        shouldContinue: true
      };
    }
  }
  
  // Processar de acordo com o estado atual
  switch (state.state) {
    case 'idle': {
      // Se está idle e não é comando de emissão, retornar mensagem padrão
      // O AI agent ou outro handler deve processar mensagens genéricas
      return {
        response: '',
        shouldContinue: false
      };
    }
    
    case 'waiting_cpf_cnpj': {
      // Validar formato primeiro (sem letras, pontos, barras)
      const validacao = validarFormatoDocumento(message);
      if (!validacao.valido) {
        return {
          response: validacao.erro || '❌ Documento inválido. Digite novamente apenas números.',
          shouldContinue: true
        };
      }
      
      const documento = formatarDocumento(message);
      const isCnpj = documento.length === 14;
      
      // Se for CNPJ, buscar automaticamente na API
      if (isCnpj) {
        logger.info('[NFSE FLOW] Buscando dados do CNPJ na Receita Federal', { cnpj: documento });
        
        const dadosTomador = await buscarDadosTomador(documento);
        
        if (dadosTomador && dadosTomador.nome) {
          // Salvar endereço, fone e email se disponíveis
          flowStates.set(phone, {
            state: 'confirming_tomador',
            tomadorDocumento: documento,
            tomadorNome: dadosTomador.nome,
            ...(dadosTomador.endereco && { tomadorEndereco: dadosTomador.endereco }),
            ...(dadosTomador.fone && { tomadorFone: dadosTomador.fone }),
            ...(dadosTomador.email && { tomadorEmail: dadosTomador.email })
          });
          
          logger.info('[NFSE FLOW] CNPJ encontrado, mostrando nome fantasia', { 
            cnpj: documento, 
            nome: dadosTomador.nome 
          });
          
          return {
            response: `✅ Localizei o tomador: *${dadosTomador.nome}*\n\nEstá correto?\n\n1️⃣ Sim\n2️⃣ Digitar novamente`,
            shouldContinue: true
          };
        } else {
          // CNPJ não encontrado ou erro na API, pedir nome manualmente
          logger.warn('[NFSE FLOW] CNPJ não encontrado na API, pedindo nome manualmente', { cnpj: documento });
          flowStates.set(phone, {
            state: 'waiting_tomador_nome',
            tomadorDocumento: documento
          });
          
          return {
            response: `CNPJ encontrado mas não consegui buscar os dados automaticamente.\n\nDigite o nome ou razão social do tomador:`,
            shouldContinue: true
          };
        }
      } else {
        // CPF - pedir nome manualmente (não há API pública confiável para CPF)
        flowStates.set(phone, {
          state: 'waiting_tomador_nome',
          tomadorDocumento: documento
        });
        
        return {
          response: `Digite o nome do tomador:`,
          shouldContinue: true
        };
      }
    }
    
    case 'waiting_tomador_nome': {
      const nome = message.trim();
      if (nome.length < 3) {
        return {
          response: '❌ Nome muito curto. Por favor, digite o nome completo ou razão social:',
          shouldContinue: true
        };
      }
      
      flowStates.set(phone, {
        ...state,
        state: 'confirming_tomador',
        tomadorNome: nome
      });
      
              return {
                response: `✅ Tomador: *${nome}*\n\nEstá correto?\n\n1️⃣ Sim\n2️⃣ Digitar novamente`,
                shouldContinue: true
              };
    }
    
    case 'confirming_tomador': {
      logger.info('[NFSE FLOW] Estado confirming_tomador', {
        phone,
        message,
        normalized,
        tomadorNome: state.tomadorNome
      });
      
      if (normalized === '1' || normalized.includes('sim') || normalized.includes('correto') || normalized.includes('confirmar')) {
        logger.info('[NFSE FLOW] ✅ Confirmação recebida, INICIANDO busca de serviços baseados no CNAE', { 
          phone, 
          userId,
          timestamp: new Date().toISOString()
        });
        
        // Buscar CNAEs do prestador e gerar opções de serviços
        try {
          logger.info('[NFSE FLOW] [PASSO 1] Tentando obter CNPJ do certificado', { userId });
          // IMPORTANTE: Usar CNPJ do certificado como fonte de verdade (mesma lógica de emitirNota)
          let cnpjPrestador: string | null = null;
          
          // Tentar obter CNPJ do certificado primeiro
          try {
            const { createCertProvider } = await import('../../nfse/providers/cert-provider.factory');
            const { pfxToPem } = await import('../../nfse/crypto/pfx-utils');
            
            const certProvider = createCertProvider();
            const pfxBuffer = await certProvider.resolvePfx();
            const passphrase = await certProvider.getPassphrase();
            
            const { certificatePem } = pfxToPem(pfxBuffer, passphrase);
            
            // Extrair CNPJ do certificado
            const { validateCertificate } = await import('../../nfse/crypto/pfx-utils');
            const validation = validateCertificate(certificatePem);
            cnpjPrestador = validation.doc || null;
            
            if (cnpjPrestador && cnpjPrestador.length === 14) {
              logger.info('[NFSE FLOW] CNPJ obtido do certificado digital', { 
                cnpjPrestador,
                userId 
              });
            } else {
              logger.warn('[NFSE FLOW] CNPJ do certificado inválido ou não encontrado, tentando perfil', {
                cnpjPrestador,
                certificadoCNPJLength: cnpjPrestador?.length || 0
              });
              cnpjPrestador = null;
            }
          } catch (certError) {
            logger.warn('[NFSE FLOW] Erro ao obter CNPJ do certificado, tentando perfil', {
              error: (certError as Error).message,
              userId
            });
            cnpjPrestador = null;
          }
          
          // Se não conseguiu do certificado, tentar do perfil
          if (!cnpjPrestador || cnpjPrestador.length !== 14) {
            const { data: profileData } = await admin
              .from('profiles')
              .select('document')
              .eq('id', userId)
              .single();
            
            if (profileData?.document) {
              const cnpjPerfil = profileData.document.replace(/\D/g, '');
              if (cnpjPerfil.length === 14) {
                cnpjPrestador = cnpjPerfil;
                logger.info('[NFSE FLOW] CNPJ obtido do perfil', { 
                  cnpjPrestador,
                  userId 
                });
              } else {
                logger.warn('[NFSE FLOW] CNPJ do perfil inválido', {
                  documentLength: cnpjPerfil.length,
                  userId
                });
              }
            }
          }
          
          // IMPORTANTE: Usar sistema de guarda-corpo CNAE + Parâmetros Municipais
          // 1. Buscar CNAEs do perfil (salvos no cadastro)
          // 2. Construir allowlist: (candidatos do CNAE) ∩ (códigos administrados pelo município)
          // 3. Exibir apenas serviços da allowlist
          logger.info('[NFSE FLOW] Buscando CNAEs do perfil e construindo allowlist', { userId });
          
          const { data: profileData } = await admin
            .from('profiles')
            .select('cnae_principal, cnaes_secundarios, cnaes_updated_at, endereco_codigo_ibge, endereco_municipio, endereco_uf')
            .eq('id', userId)
            .single();
          
          let principal: { codigo: string; descricao: string } | null = null;
          const secundarios: { codigo: string; descricao: string }[] = [];
          
          if (profileData?.cnae_principal) {
            // Normalizar CNAE (garantir que está no formato correto: 7 dígitos sem hífen/barra)
            const cnaeNormalizado = profileData.cnae_principal.replace(/\D/g, '');
            
            principal = {
              codigo: cnaeNormalizado,
              descricao: '' // Descrição será buscada se necessário
            };
            
            // Extrair CNAEs secundários do perfil
            if (Array.isArray(profileData.cnaes_secundarios)) {
              for (const cnae of profileData.cnaes_secundarios) {
                if (cnae?.code) {
                  const cnaeSecNormalizado = String(cnae.code).replace(/\D/g, '');
                  secundarios.push({
                    codigo: cnaeSecNormalizado,
                    descricao: cnae.description || ''
                  });
                }
              }
            }
            
            logger.info('[NFSE FLOW] CNAEs encontrados no perfil', {
              userId,
              temPrincipal: !!principal,
              principalCodigoOriginal: profileData.cnae_principal,
              principalCodigoNormalizado: principal?.codigo,
              qtdSecundarios: secundarios.length,
              secundariosCodigos: secundarios.map(s => s.codigo),
              cnaesUpdatedAt: profileData.cnaes_updated_at
            });
          } else {
            logger.warn('[NFSE FLOW] Nenhum CNAE encontrado no perfil, tentando buscar pela API', {
              userId,
              temCnaePrincipal: !!profileData?.cnae_principal
            });
            
            // Fallback: Se não tem CNAEs no perfil, tentar buscar pela API usando CNPJ do perfil
            if (!cnpjPrestador || cnpjPrestador.length !== 14) {
              // Tentar obter CNPJ do perfil
              const { data: profileDocData } = await admin
                .from('profiles')
                .select('document')
                .eq('id', userId)
                .single();
              
              if (profileDocData?.document) {
                const cnpjPerfil = profileDocData.document.replace(/\D/g, '');
                if (cnpjPerfil.length === 14) {
                  cnpjPrestador = cnpjPerfil;
                  logger.info('[NFSE FLOW] CNPJ obtido do perfil para busca de CNAEs', { 
                    cnpjPrestador,
                    userId 
                  });
                }
              }
            }
            
            // Se ainda não tem CNPJ válido, usar fluxo antigo
            if (!cnpjPrestador || cnpjPrestador.length !== 14) {
              logger.warn('[NFSE FLOW] CNPJ não encontrado, usando fluxo de descrição livre', {
                userId,
                hasCertificado: cnpjPrestador !== null
              });
              flowStates.set(phone, {
                ...state,
                state: 'waiting_descricao'
              });
              
              return {
                response: 'Descreva brevemente o serviço executado.\n\nQuando terminar, digite "feito".',
                shouldContinue: true
              };
            }
            
            // Buscar CNAEs via API como fallback
            logger.info('[NFSE FLOW] Buscando CNAEs do CNPJ via API (fallback)', { cnpjPrestador, userId });
            const resultado = await buscarCnaesDoCnpj(cnpjPrestador, userId);
            principal = resultado.principal;
            secundarios.push(...resultado.secundarios);
          }
          
          logger.info('[NFSE FLOW] Resultado da busca de CNAEs', {
            temPrincipal: !!principal,
            principalCodigo: principal?.codigo,
            principalDescricao: principal?.descricao,
            qtdSecundarios: secundarios.length,
            cnpjPrestador
          });
          
          if (!principal) {
            // Se não encontrou CNAE, usar fluxo antigo
            logger.warn('[NFSE FLOW] CNAE principal não encontrado, usando fluxo de descrição livre', { 
              cnpjPrestador,
              temSecundarios: secundarios.length > 0
            });
            flowStates.set(phone, {
              ...state,
              state: 'waiting_descricao'
            });
            
            return {
              response: 'Descreva brevemente o serviço executado.\n\nQuando terminar, digite "feito".',
              shouldContinue: true
            };
          }
          
          // NOVO: Usar sistema de guarda-corpo CNAE + Parâmetros Municipais
          // Construir allowlist: (candidatos do CNAE) ∩ (códigos administrados pelo município)
          // Buscar código do município do perfil do usuário
          logger.info('[NFSE FLOW] [PASSO 3] Determinando código do município', { userId });
          
          let codigoMunicipioPadrao = '3550308'; // Fallback: São Paulo
          if (profileData?.endereco_codigo_ibge && profileData.endereco_codigo_ibge.length >= 7) {
            codigoMunicipioPadrao = profileData.endereco_codigo_ibge.replace(/\D/g, '').padStart(7, '0').slice(0, 7);
            logger.info('[NFSE FLOW] ✅ Usando código IBGE do perfil para allowlist', {
              userId,
              codigoIbge: codigoMunicipioPadrao,
              municipio: profileData.endereco_municipio,
              uf: profileData.endereco_uf
            });
          } else {
            logger.warn('[NFSE FLOW] ⚠️ Código IBGE não encontrado no perfil para allowlist, usando São Paulo', {
              userId,
              temEnderecoCodigoIbge: !!profileData?.endereco_codigo_ibge,
              enderecoCodigoIbge: profileData?.endereco_codigo_ibge
            });
          }
          
          const hoje = new Date();
          const competencia = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
          
          logger.info('[NFSE FLOW] [PASSO 4] Competência determinada', {
            userId,
            competencia,
            codigoMunicipio: codigoMunicipioPadrao
          });
          
          // Obter CNPJ do certificado ou perfil para construir allowlist
          let cnpjParaAllowlist: string | null = null;
          try {
            const { createCertProvider } = await import('../../nfse/providers/cert-provider.factory');
            const { pfxToPem } = await import('../../nfse/crypto/pfx-utils');
            const { validateCertificate } = await import('../../nfse/crypto/pfx-utils');
            
            const certProvider = createCertProvider();
            const pfxBuffer = await certProvider.resolvePfx();
            const passphrase = await certProvider.getPassphrase();
            const { certificatePem } = pfxToPem(pfxBuffer, passphrase);
            const validation = validateCertificate(certificatePem);
            cnpjParaAllowlist = validation.doc || null;
          } catch (certError) {
            logger.warn('[NFSE FLOW] Erro ao obter CNPJ do certificado para allowlist', {
              error: certError
            });
            // Tentar obter do perfil
            const { data: profileDocData } = await admin
              .from('profiles')
              .select('document')
              .eq('id', userId)
              .single();
            
            if (profileDocData?.document) {
              cnpjParaAllowlist = profileDocData.document.replace(/\D/g, '');
            }
          }
          
          // ✅ NOVO: Usar RESOLVER INTELIGENTE com 3 níveis
          logger.info('[NFSE FLOW] Iniciando resolução inteligente de serviços', { userId });
          
          // Importar o novo resolver
          const { servicesByCnaes, resolutionsToServices } = await import('../../nfse/domain/services-resolver');
          
          // Coletar todos os CNAEs (principal + secundários)
          const todosCnaes = [
            principal?.codigo,
            ...secundarios.map(s => s.codigo)
          ].filter(Boolean) as string[];
          
          logger.info('[NFSE FLOW] CNAEs para resolução', {
            userId,
            cnaes: todosCnaes,
            qtdCnaes: todosCnaes.length
          });
          
          // Resolver serviços usando o resolver inteligente (3 níveis)
          const resolutions = servicesByCnaes(todosCnaes, 2); // Até 2 serviços por CNAE
          
          logger.info('[NFSE FLOW] Resoluções obtidas', {
            userId,
            qtdResolutions: resolutions.length,
            bySource: {
              seed: resolutions.filter(r => r.source === 'seed').length,
              lexicalCnae: resolutions.filter(r => r.source === 'lexical-cnae').length
            },
            resolutions: resolutions.map(r => ({ code: r.code, source: r.source }))
          });
          
          // Converter resoluções para formato de serviços
          let servicosMapeados = resolutionsToServices(resolutions);
          
          // ✅ Usar serviços mapeados (salvos no cadastro ou gerados dinamicamente)
          let servicosDisponiveis: Array<{ numero: number; descricao: string; codigoTributacao: string; itemListaLc116: string }> = [];
          
          if (servicosMapeados.length > 0) {
            // Converter servicosMapeados para servicosDisponiveis
            servicosDisponiveis = servicosMapeados.map(servico => ({
              numero: servico.numero,
              descricao: servico.descricao,
              codigoTributacao: servico.codigoTributacao,
              itemListaLc116: servico.itemListaLc116
            }));
            
            logger.info('[NFSE FLOW] ✅ Serviços disponíveis preparados', {
              userId,
              qtdServicos: servicosDisponiveis.length,
              fonte: 'resolver inteligente (3 níveis)',
              fonteDetalhada: {
                seed: resolutions.filter(r => r.source === 'seed').length,
                lexicalCnae: resolutions.filter(r => r.source === 'lexical-cnae').length,
                lexicalText: resolutions.filter(r => r.source === 'lexical-text').length
              },
              municipio: codigoMunicipioPadrao
            });
          } else {
            // ✅ NOVA UX: Sem match automático → pedir texto livre para resolver
            logger.warn('[NFSE FLOW] Nenhum serviço resolvido automaticamente, entrando em modo fallback', {
              userId,
              temCnaePrincipal: !!principal,
              qtdCnaesSecundarios: secundarios.length,
              cnaes: todosCnaes
            });
            
            flowStates.set(phone, {
              ...state,
              state: 'waiting_descricao',
              waitingFreeTextForServices: true // Flag para indicar modo fallback
            });
            
            return {
              response: '⚠️ Não encontrei serviços automáticos pelos seus CNAEs.\n\n' +
                        '✍️ Escreva em 1 linha o serviço prestado (ex.: "limpeza de escritório") e aperte Enter.\n\n' +
                        'Vou sugerir opções pra você escolher.',
              shouldContinue: true
            };
          }
          
          // ✅ Validar se tem serviços disponíveis (APÓS o mapeamento CNAE → LC 116)
          // Se não houver serviços, é porque os CNAEs do usuário não estão no SEED
          if (servicosDisponiveis.length === 0) {
            logger.error('[NFSE FLOW] Nenhum serviço disponível após mapeamento CNAE → LC 116', {
              userId,
              codigoMunicipio: codigoMunicipioPadrao,
              temPrincipal: !!principal,
              principalCodigo: principal?.codigo,
              cnaes: todosCnaes,
              observacao: 'CNAEs não estão mapeados no SEED do cnae-map.ts'
            });
            
            // ✅ Informar ao usuário que o CNAE não está cadastrado
            flowStates.set(phone, {
              ...state,
              state: 'waiting_descricao'
            });
            
            return {
              response: '⚠ Pelo seu CNAE, não identifiquei serviços aptos no momento.\n\nFale com o suporte para habilitar sua lista de serviços.\n\nOu descreva brevemente o serviço executado e digite "feito".',
              shouldContinue: true
            };
          }
          
          logger.info('[NFSE FLOW] Lista de serviços preparada', {
            userId,
            qtdServicos: servicosDisponiveis.length,
            servicos: servicosDisponiveis.slice(0, 3).map(s => `${s.numero}. ${s.descricao}`)
          });
          
          // Preparar mensagem com opções
          let mensagem = 'Sua empresa está apta a executar estes serviços:\n\n';
          
          for (const servico of servicosDisponiveis) {
            mensagem += `${servico.numero}. ${servico.descricao}\n`;
          }
          
          mensagem += `\n${servicosDisponiveis.length + 1}. Nenhum deles corresponde ao serviço prestado\n\nEscolha uma opção:`;
          
          logger.info('[NFSE FLOW] Mensagem de serviços preparada', {
            userId,
            mensagemLength: mensagem.length,
            qtdOpcoes: servicosDisponiveis.length + 1
          });
          
          // ✅ REMOVIDO: Lógica de CNAEs secundários (já incluídos no mapeamento CNAE → LC 116)
          // O mapeamento já considera todos os CNAEs (principal + secundários) na linha 995-998
          
          // ✅ Salvar estado com serviços disponíveis (baseados APENAS no mapeamento CNAE → LC 116)
          flowStates.set(phone, {
            ...state,
            state: 'waiting_descricao', // Usar waiting_descricao para compatibilidade com o switch existente
            servicosDisponiveis
          });
          
          logger.info('[NFSE FLOW] ✅✅✅ Lista de serviços FINAL preparada e ENVIANDO ao usuário', {
            userId,
            phone,
            qtdServicos: servicosDisponiveis.length,
            mensagemLength: mensagem.length,
            mensagemPreview: mensagem.substring(0, 300),
            servicos: servicosDisponiveis.map(s => `${s.numero}. ${s.descricao}`).slice(0, 3)
          });
          
          return {
            response: mensagem,
            shouldContinue: true
          };
        } catch (error: any) {
          logger.error('[NFSE FLOW] ❌ Erro ao buscar serviços baseados em CNAE - usando fallback', {
            error: error?.message || error,
            stack: error?.stack,
            userId,
            phone
          });
          
          // EM CASO DE ERRO: SEMPRE mostrar lista do catálogo como fallback
          try {
            const { data: codigosComuns } = await admin
              .from('catalogo_ctribnac')
              .select('ctribnac, descricao')
              .limit(10)
              .order('ctribnac', { ascending: true });
            
            if (codigosComuns && codigosComuns.length > 0) {
              logger.info('[NFSE FLOW] Usando catálogo como fallback após erro', {
                qtdCodigos: codigosComuns.length
              });
              
              const servicosFallback: Array<{ numero: number; descricao: string; codigoTributacao: string; itemListaLc116: string }> = [];
              
              for (let i = 0; i < codigosComuns.length; i++) {
                servicosFallback.push({
                  numero: i + 1,
                  descricao: codigosComuns[i].descricao,
                  codigoTributacao: codigosComuns[i].ctribnac,
                  itemListaLc116: '01'
                });
              }
              
              let mensagemFallback = 'Sua empresa está apta a executar estes serviços:\n\n';
              
              for (const servico of servicosFallback) {
                mensagemFallback += `${servico.numero}. ${servico.descricao}\n`;
              }
              
              mensagemFallback += `\n${servicosFallback.length + 1}. Nenhum deles corresponde ao serviço prestado\n\nEscolha uma opção:`;
              
              flowStates.set(phone, {
                ...state,
                state: 'waiting_descricao',
                servicosDisponiveis: servicosFallback
              });
              
              logger.info('[NFSE FLOW] ✅ Lista de fallback preparada e enviada', {
                userId,
                qtdServicos: servicosFallback.length
              });
              
              return {
                response: mensagemFallback,
                shouldContinue: true
              };
            }
          } catch (fallbackError) {
            logger.error('[NFSE FLOW] Erro até no fallback do catálogo', {
              error: fallbackError
            });
          }
          
          // ÚLTIMO RECURSO: pelo menos um serviço genérico
          // ✅ IMPORTANTE: Usar código 140100 (14.01 sem desdobramento - mais genérico)
          const servicosUltimoRecurso: Array<{ numero: number; descricao: string; codigoTributacao: string; itemListaLc116: string }> = [{
            numero: 1,
            descricao: 'Manutenção e conservação de máquinas e equipamentos',
            codigoTributacao: '140100', // ✅ Código 14.01 (sem desdobramento)
            itemListaLc116: '14'
          }];
          
          flowStates.set(phone, {
            ...state,
            state: 'waiting_descricao',
            servicosDisponiveis: servicosUltimoRecurso
          });
          
          logger.warn('[NFSE FLOW] Usando último recurso - serviço genérico', {
            userId
          });
          
          return {
            response: 'Sua empresa está apta a executar estes serviços:\n\n1. Serviço prestado (código será validado na emissão)\n\n2. Nenhum deles corresponde ao serviço prestado\n\nEscolha uma opção:',
            shouldContinue: true
          };
        }
      } else if (normalized === '2' || normalized.includes('digitar') || normalized.includes('voltar') || normalized.includes('não')) {
        logger.info('[NFSE FLOW] Usuário quer digitar novamente', { phone });
        
        flowStates.set(phone, {
          state: 'waiting_cpf_cnpj',
          tomadorDocumento: undefined,
          tomadorNome: undefined
        });
        
        return {
          response: 'Digite o CPF ou CNPJ novamente:',
          shouldContinue: true
        };
      }
      
      // Se não reconheceu a resposta, perguntar novamente
      logger.warn('[NFSE FLOW] Resposta não reconhecida em confirming_tomador', {
        phone,
        message,
        normalized
      });
      
              return {
                response: `✅ Tomador: *${state.tomadorNome}*\n\nEstá correto?\n\n1️⃣ Sim\n2️⃣ Digitar novamente`,
                shouldContinue: true
              };
    }
    
    case 'waiting_descricao': {
      // ✅ NOVO: Verificar se estamos em modo fallback (esperando texto livre para resolver)
      if (state.waitingFreeTextForServices) {
        logger.info('[NFSE FLOW] Processando texto livre para resolver serviços (fallback)', {
          phone,
          userId,
          text: message
        });
        
        // Importar resolver
        const { servicesByFreeText, resolutionsToServices } = await import('../../nfse/domain/services-resolver');
        
        // Resolver serviços pelo texto livre
        const resolutions = servicesByFreeText(message, 2); // Máximo 2 opções
        
        if (resolutions.length === 0) {
          logger.warn('[NFSE FLOW] Nenhum serviço encontrado por texto livre', {
            phone,
            userId,
            text: message
          });
          
          return {
            response: '❌ Não consegui identificar serviços pela sua descrição.\n\n' +
                      'Tente descrever de outra forma ou entre em contato com o suporte.',
            shouldContinue: true
          };
        }
        
        // Converter resoluções para serviços
        let servicosResolvidos = resolutionsToServices(resolutions);
        const fallbackServicos = state.fallbackServicos;

        if (fallbackServicos && fallbackServicos.length > 0) {
          const allowedCodes = new Set(fallbackServicos.map((s) => s.codigoTributacao));
          const filtrados = servicosResolvidos.filter((s) =>
            allowedCodes.has(s.codigoTributacao)
          );

          if (filtrados.length > 0) {
            servicosResolvidos = filtrados.map((servico, idx) => ({
              ...servico,
              numero: idx + 1
            }));
          } else {
            // Nenhuma opção compatível com a lista permitida → reutilizar fallback original
            servicosResolvidos = fallbackServicos.map((servico, idx) => {
              const codigo = servico.codigoTributacao;
              const subitem =
                codigo && codigo.length === 6
                  ? `${codigo.substring(0, 2)}.${codigo.substring(2, 4)}.${codigo.substring(4, 6)}`
                  : servico.itemListaLc116 || '';
              return {
                numero: idx + 1,
                descricao: servico.descricao,
                codigoTributacao: codigo,
                itemListaLc116: servico.itemListaLc116,
                subitemLc116: subitem,
                source: 'fallback'
              };
            });
          }
        }
        
        logger.info('[NFSE FLOW] Serviços resolvidos por texto livre', {
          phone,
          userId,
          text: message,
          qtdServicos: servicosResolvidos.length,
          servicos: servicosResolvidos.map(s => s.descricao)
        });
        
        if (servicosResolvidos.length === 1) {
          const servicoUnico = servicosResolvidos[0];
          const descricaoDigitada = message.trim();
          
          flowStates.set(phone, {
            ...state,
            descricaoDigitada,
            descricao: servicoUnico.descricao,
            codigoTributacao: servicoUnico.codigoTributacao,
            itemListaLc116: servicoUnico.itemListaLc116,
            state: 'waiting_valor',
            servicosDisponiveis: undefined,
            servicosSecundarios: undefined,
            waitingFreeTextForServices: false,
            fallbackServicos: undefined
          });
          
          return {
            response: `✅ Descrição registrada: *${descricaoDigitada}*\n\nInforme o valor total do serviço (R$):`,
            shouldContinue: true
          };
        }

        // Preparar mensagem com opções
        let mensagem = '✅ Encontrei estas opções:\n\n';
        for (const servico of servicosResolvidos) {
          mensagem += `${servico.numero}. ${servico.descricao}\n`;
        }
        mensagem += `\n${servicosResolvidos.length + 1}. Nenhum deles corresponde ao serviço prestado\n\nEscolha uma opção:`;
        
        // Salvar serviços e remover flag de fallback
        flowStates.set(phone, {
          ...state,
          servicosDisponiveis: servicosResolvidos.map(s => ({
            numero: s.numero,
            descricao: s.descricao,
            codigoTributacao: s.codigoTributacao,
            itemListaLc116: s.itemListaLc116
          })),
          waitingFreeTextForServices: false, // Sair do modo fallback
          fallbackServicos: fallbackServicos,
          descricaoDigitada: message.trim()
        });
        
        return {
          response: mensagem,
          shouldContinue: true
        };
      }
      
      // Verificar se há serviços disponíveis (fluxo novo baseado em CNAE)
      if (state.servicosDisponiveis && state.servicosDisponiveis.length > 0) {
        // Processar seleção de opção
        const opcaoEscolhida = parseInt(normalized, 10);
        
        if (isNaN(opcaoEscolhida) || opcaoEscolhida < 1) {
          return {
            response: '❌ Por favor, escolha uma opção numérica válida.',
            shouldContinue: true
          };
        }
        
        // ✅ Verificar se escolheu a última opção (Nenhum deles corresponde)
        const ultimaOpcao = state.servicosDisponiveis.length + 1;
        
        if (opcaoEscolhida === ultimaOpcao) {
          logger.info('[NFSE FLOW] Usuário escolheu opção "Nenhum deles corresponde", indo para descrição livre', {
            phone,
            userId
          });
          
          flowStates.set(phone, {
            ...state,
            servicosDisponiveis: undefined,
            servicosSecundarios: undefined,
            waitingFreeTextForServices: true,
            fallbackServicos: state.servicosDisponiveis
          });
          
          return {
            response: 'Descreva o serviço executado:',
            shouldContinue: true
          };
        }
        
        // Verificar se a opção escolhida está dentro do range válido
        if (opcaoEscolhida > state.servicosDisponiveis.length) {
          return {
            response: `❌ Opção inválida. Escolha entre 1 e ${state.servicosDisponiveis.length + 1}.`,
            shouldContinue: true
          };
        }
        
        // Serviço selecionado
        const servicoSelecionado = state.servicosDisponiveis[opcaoEscolhida - 1];
        
        logger.info('[NFSE FLOW] Serviço selecionado pelo usuário', {
          phone,
          opcao: opcaoEscolhida,
          descricao: servicoSelecionado.descricao,
          codigoTributacao: servicoSelecionado.codigoTributacao
        });
        
        // ✅ TELEMETRIA: Registrar escolha para aprendizado
        try {
          const { logServiceChoice } = await import('../../nfse/domain/services-telemetry');
          const { data: profileCnae } = await admin
            .from('profiles')
            .select('cnae_principal')
            .eq('id', userId)
            .single();
          
          if (profileCnae?.cnae_principal) {
            const servicoComSource = state.servicosDisponiveis.find(s => s.numero === opcaoEscolhida) as any;
            
            await logServiceChoice({
              cnae: profileCnae.cnae_principal,
              lc116Code: servicoComSource?.subitemLc116 || servicoSelecionado.codigoTributacao.substring(0, 4).replace(/(.{2})(.{2})/, '$1.$2'),
              source: servicoComSource?.source || 'seed',
              userId,
              timestamp: new Date(),
              freeText: state.waitingFreeTextForServices ? state.descricao : undefined
            });
          }
        } catch (telemetryError: any) {
          logger.warn('[NFSE FLOW] Erro ao registrar telemetria (não crítico)', {
            error: telemetryError.message
          });
        }
        
        // Atualizar estado com o serviço selecionado
        flowStates.set(phone, {
          ...state,
          descricao: servicoSelecionado.descricao,
          codigoTributacao: servicoSelecionado.codigoTributacao,
          itemListaLc116: servicoSelecionado.itemListaLc116,
          state: 'waiting_valor',
          servicosDisponiveis: undefined, // Limpar após seleção
          servicosSecundarios: undefined,
          fallbackServicos: undefined,
          descricaoDigitada: state.descricaoDigitada ?? servicoSelecionado.descricao
        });
        
        return {
          response: `✅ Serviço selecionado: *${state.descricaoDigitada ?? servicoSelecionado.descricao}*\n\nInforme o valor total do serviço (R$):`,
          shouldContinue: true
        };
      }
      
      // Fluxo antigo (descrição livre)
      if (normalized.includes('feito') || normalized.includes('pronto')) {
        // Descrição já foi coletada nas mensagens anteriores
        if (!state.descricao || state.descricao.length < 10) {
          return {
            response: '❌ Descrição muito curta. Por favor, descreva melhor o serviço e digite "feito" quando terminar:',
            shouldContinue: true
          };
        }
        
        // ========== PASSO 3: MAPEAMENTO AUTOMÁTICO ==========
        // Se não tem código de tributação, usar mapeamento automático baseado no CNAE
        if (!state.codigoTributacao || !state.itemListaLc116) {
          logger.info('[NFSE FLOW] Usuário descreveu serviço, usando mapeamento automático CNAE → Código Tributário', {
            phone,
            descricao: state.descricao,
            temCodigoTributacao: !!state.codigoTributacao,
            temItemListaLc116: !!state.itemListaLc116
          });
          
          try {
            const { CnaeTributacaoMapperService } = await import('../nfse/cnae-tributacao-mapper.service');
            const mapper = new CnaeTributacaoMapperService();
            
            // Buscar CNAEs do perfil
            const { data: profileCnae } = await admin
              .from('profiles')
              .select('cnae_principal, cnaes_secundarios, endereco_codigo_ibge')
              .eq('id', userId)
              .single();
            
            if (profileCnae?.cnae_principal) {
              const cnaes = [
                profileCnae.cnae_principal,
                ...(profileCnae.cnaes_secundarios || [])
              ].filter(Boolean);
              
              // Buscar melhor código tributário automaticamente
              const mapping = await mapper.getBestCodigoTributacao(
                cnaes,
                profileCnae.endereco_codigo_ibge
              );
              
              if (mapping) {
                const codigoLC116Normalizado = mapping.codigoLC116.replace(/\./g, '');
                const itemListaLc116 = codigoLC116Normalizado.substring(0, 2);
                
                logger.info('[NFSE FLOW] ✅ Mapeamento automático bem-sucedido da descrição', {
                  descricao: state.descricao,
                  cnae: profileCnae.cnae_principal,
                  codigoTributacao: mapping.cTribNac,
                  itemListaLc116,
                  validado: mapping.validado,
                  descricaoServico: mapping.descricaoServico
                });
                
                flowStates.set(phone, {
                  ...state,
                  codigoTributacao: mapping.cTribNac,
                  itemListaLc116: itemListaLc116,
                  state: 'waiting_valor'
                });
                
                return {
                  response: `✅ Serviço identificado automaticamente: *${mapping.descricaoServico}*\n\nInforme o valor total do serviço (R$):`,
                  shouldContinue: true
                };
              } else {
                throw new Error('Nenhum mapeamento encontrado para os CNAEs do usuário');
              }
            } else {
              throw new Error('CNAE não encontrado no perfil do usuário');
            }
          } catch (autoMappingError) {
            logger.error('[NFSE FLOW] Erro no mapeamento automático da descrição', {
              error: (autoMappingError as Error).message,
              descricao: state.descricao
            });
            
            // Fallback: usar código padrão validado (manutenção e conservação)
            // ✅ IMPORTANTE: Usar código 140100 (14.01 sem desdobramento - mais genérico)
            flowStates.set(phone, {
              ...state,
              codigoTributacao: '140100', // ✅ Código 14.01 (sem desdobramento)
              itemListaLc116: '14',
              state: 'waiting_valor'
            });
            
            logger.warn('[NFSE FLOW] Usando código padrão validado (manutenção e conservação) como fallback', {
              descricao: state.descricao
            });
            
            return {
              response: `✅ Serviço registrado.\n\nInforme o valor total do serviço (R$):`,
              shouldContinue: true
            };
          }
        }
        
        flowStates.set(phone, {
          ...state,
          state: 'waiting_valor'
        });
        
        return {
          response: 'Informe o valor total do serviço (R$):',
          shouldContinue: true
        };
      } else {
        // Acumular descrição até o usuário digitar "feito"
        const descricaoAtual = state.descricao || '';
        // Remover "feito" ou "pronto" se estiver na mensagem
        const mensagemLimpa = message.replace(/\b(feito|pronto)\b/gi, '').trim();
        const novaDescricao = descricaoAtual ? `${descricaoAtual} ${mensagemLimpa}`.trim() : mensagemLimpa;
        
        flowStates.set(phone, {
          ...state,
          descricao: novaDescricao,
          state: 'waiting_descricao'
        });
        
        // Dar feedback mínimo enquanto coleta
        // Se é a primeira mensagem da descrição, confirmar recebimento
        if (!descricaoAtual) {
          return {
            response: '✅ Recebido. Continue descrevendo o serviço. Quando terminar, digite "feito".',
            shouldContinue: true
          };
        }
        
        // Se a descrição ficou muito longa, lembrar de finalizar
        if (novaDescricao.length > 200) {
          return {
            response: '✅ Descrição registrada. Digite "feito" para continuar.',
            shouldContinue: true
          };
        }
        
        // Para mensagens subsequentes, não enviar resposta (evitar spam)
        // Mas registrar silenciosamente
        return {
          response: '', // Não enviar resposta, apenas atualizar estado
          shouldContinue: true
        };
      }
    }
    
    case 'waiting_valor': {
      const valor = normalizarValorParaNumero(message);
      
      if (valor === null) {
        return {
          response: '❌ Valor inválido. Digite apenas números.\n\nExemplos: 150 ou 150,50 ou 1000',
          shouldContinue: true
        };
      }
      
      // Formatar valores no padrão brasileiro
      const valorFormatado = formatarValorBrasileiro(valor);
      const taxaFormatada = formatarValorBrasileiro(TAXA_NFSE);
      
      // Verificar se o valor foi ajustado (comparar entrada original vs formatada)
      const valorDigitadoOriginal = message.trim();
      const valorDigitadoSemFormatacao = valorDigitadoOriginal.replace(/[^\d,.-]/g, '');
      const foiAjustado = valorDigitadoSemFormatacao !== valorFormatado && 
                         valorDigitadoSemFormatacao !== valor.toString();
      
      const novoEstado = {
        ...state,
        valor,
        state: 'confirming_emissao' as EmissionFlowState
        // IMPORTANTE: Preservar codigoTributacao e itemListaLc116 do estado anterior
      };
      
      flowStates.set(phone, novoEstado);
      
      logger.info('[NFSE FLOW] Estado atualizado para confirming_emissao', {
        phone,
        valor,
        valorFormatado,
        tomadorNome: state.tomadorNome,
        descricao: state.descricao,
        codigoTributacao: state.codigoTributacao,
        itemListaLc116: state.itemListaLc116,
        estadoSalvo: flowStates.get(phone)?.state,
        estadoCompleto: {
          temCodigoTributacao: !!novoEstado.codigoTributacao,
          temItemListaLc116: !!novoEstado.itemListaLc116,
          codigoTributacao: novoEstado.codigoTributacao,
          itemListaLc116: novoEstado.itemListaLc116
        }
      });
      
      // Mensagem com aviso se o valor foi ajustado
      let mensagemAjuste = '';
      if (foiAjustado) {
        mensagemAjuste = `\n\n✅ *Valor ajustado para o formato brasileiro: R$ ${valorFormatado}*\n`;
      }
      
      return {
        response: `${mensagemAjuste}📋 *Confira se está tudo certo:*\n\n• Tomador: ${state.tomadorNome}\n• Documento: ${state.tomadorDocumento}\n• Serviço: ${state.descricaoDigitada ?? state.descricao}\n• Valor: R$ ${valorFormatado}\n• Taxa: R$ ${taxaFormatada}\n\n*Lembrando: há uma taxa de R$ ${taxaFormatada} por nota emitida.*\n\nPosso emitir a nota?\n\n1️⃣ Sim\n2️⃣ Não, corrigir`,
        shouldContinue: true
      };
    }
    
    case 'confirming_emissao': {
      logger.info('[NFSE FLOW] Estado confirming_emissao - processando resposta', {
        phone,
        message,
        normalized,
        tomadorNome: state.tomadorNome,
        hasValor: state.valor !== undefined,
        hasDescricao: !!state.descricao,
        codigoTributacao: state.codigoTributacao,
        itemListaLc116: state.itemListaLc116
      });
      
      // PRIMEIRO: Verificar se é confirmação (prioridade máxima)
      if (normalized === '1' || normalized.includes('sim') || normalized.includes('confirmar') || normalized.includes('emitir') || normalized === 'feito') {
        logger.info('[NFSE FLOW] Confirmação recebida - iniciando emissão', {
          phone,
          userId,
          tomadorNome: state.tomadorNome,
          valor: state.valor,
          codigoTributacao: state.codigoTributacao,
          itemListaLc116: state.itemListaLc116,
          descricao: state.descricao,
          estadoCompleto: state
        });
        
        // Verificar se tem código de tributação antes de emitir
        if (!state.codigoTributacao || !state.itemListaLc116) {
          logger.error('[NFSE FLOW] Tentativa de emissão sem código de tributação', {
            phone,
            temCodigoTributacao: !!state.codigoTributacao,
            temItemListaLc116: !!state.itemListaLc116,
            descricao: state.descricao
          });
          
          // Tentar reconstruir a allowlist se possível
          flowStates.set(phone, {
            ...state,
            state: 'waiting_descricao'
          });
          
          return {
            response: '❌ Não é possível emitir a nota sem selecionar um serviço válido.\n\nPor favor, descreva o serviço novamente e selecione uma opção da lista de serviços disponíveis para seu CNAE.\n\nSe não aparecer nenhuma opção, entre em contato com o suporte.',
            shouldContinue: true
          };
        }
        
        // Confirmar e emitir
        return await emitirNota(phone, state, userId, userProfile);
      }
      
      // SEGUNDO: Verificar se quer corrigir algo
      if (normalized.includes('corrigir') || normalized.includes('não') || normalized.includes('alterar') || normalized === '2') {
        flowStates.set(phone, {
          ...state,
          state: 'choosing_correction'
        });
        return {
          response: 'O que deseja corrigir?\n\n1️⃣ Alterar tomador\n2️⃣ Alterar descrição\n3️⃣ Alterar valor',
          shouldContinue: true
        };
      }
      
      // Se não reconheceu, pedir confirmação novamente
      return {
        response: `📋 *Confira se está tudo certo:*\n\n• Tomador: ${state.tomadorNome}\n• Documento: ${state.tomadorDocumento}\n• Serviço: ${state.descricaoDigitada ?? state.descricao}\n• Valor: R$ ${formatarValorBrasileiro(state.valor!)}\n• Taxa: R$ ${formatarValorBrasileiro(TAXA_NFSE)}\n\n*Lembrando: há uma taxa de R$ ${formatarValorBrasileiro(TAXA_NFSE)} por nota emitida.*\n\nPosso emitir a nota?\n\n1️⃣ Sim\n2️⃣ Não, corrigir`,
        shouldContinue: true
      };
    }
    
    case 'choosing_correction': {
      // Usuário escolheu corrigir algo - agora escolher o que corrigir
      if (normalized === '1' || normalized.includes('tomador')) {
        flowStates.set(phone, {
          ...state,
          state: 'waiting_cpf_cnpj',
          tomadorDocumento: undefined,
          tomadorNome: undefined,
          tomadorEndereco: undefined
        });
        return {
          response: 'Digite o CPF ou CNPJ novamente:',
          shouldContinue: true
        };
      }
      
      if (normalized === '2' || normalized.includes('descrição')) {
        flowStates.set(phone, {
          ...state,
          state: 'waiting_descricao',
          descricao: undefined
        });
        return {
          response: 'Descreva o serviço novamente. Ao terminar, digite "feito":',
          shouldContinue: true
        };
      }
      
      if (normalized === '3' || normalized.includes('valor')) {
        flowStates.set(phone, {
          ...state,
          state: 'waiting_valor',
          valor: undefined
        });
        return {
          response: 'Digite o valor novamente:',
          shouldContinue: true
        };
      }
      
      // Se não reconheceu, mostrar menu novamente
      return {
        response: 'O que deseja corrigir?\n\n1️⃣ Alterar tomador\n2️⃣ Alterar descrição\n3️⃣ Alterar valor',
        shouldContinue: true
      };
    }
    
    case 'emitting':
      // Aguardando resposta do backend
      return {
        response: '⏳ Emitindo sua nota fiscal...\n\nAguarde um instante...',
        shouldContinue: true
      };
    
    case 'completed':
      // Limpar estado após completar
      clearFlowState(phone);
      return {
        response: '',
        shouldContinue: false
      };
    
    case 'error':
      // Tratar erro - permitir retry
      const errorMsg = state.errorMessage || 'Erro desconhecido';
      
      if (normalized === '1' || normalized.includes('sim') || normalized.includes('tentar') || normalized.includes('reenviar')) {
        // Reiniciar fluxo
        clearFlowState(phone);
        flowStates.set(phone, { state: 'waiting_cpf_cnpj' });
        return {
          response: 'Digite o CPF ou CNPJ de quem você prestou o serviço:',
          shouldContinue: true
        };
      } else if (normalized === '2' || normalized.includes('encerrar') || normalized.includes('cancelar')) {
        clearFlowState(phone);
        return {
          response: 'Emissão cancelada. Como posso ajudar?',
          shouldContinue: false
        };
      }
      
      return {
        response: `❌ Não foi possível emitir sua nota agora.\n\nMotivo: ${errorMsg}\n\nDeseja tentar novamente?\n\n1️⃣ Sim\n2️⃣ Encerrar`,
        shouldContinue: true
      };
  }
  
  return {
    response: '',
    shouldContinue: false
  };
}

/**
 * Emite a nota fiscal chamando o backend
 */
async function emitirNota(
  phone: string,
  state: EmissionFlowData,
  userId: string,
  userProfile: any
): Promise<{ response: string; shouldContinue: boolean; pdfUrl?: string }> {
  if (!state.tomadorDocumento || !state.tomadorNome || !state.descricao || !state.valor) {
    flowStates.set(phone, {
      ...state,
      state: 'error',
      errorMessage: 'Dados incompletos'
    });
    return {
      response: '❌ Erro: dados incompletos. Por favor, inicie novamente digitando "emitir nota".',
      shouldContinue: false
    };
  }
  
  flowStates.set(phone, { ...state, state: 'emitting' });
  
  try {
    // Buscar dados do prestador (MEI) do perfil
    logger.info('[NFSE FLOW] Buscando perfil do usuário', { userId });
    
    // Buscar perfil incluindo telefone e email do CNPJ (salvos durante o cadastro)
    const { data: profileData, error: profileError } = await admin
      .from('profiles')
      .select('document, name, business_name, endereco_codigo_ibge, endereco_municipio, endereco_uf, cnpj_phone, cnpj_email')
      .eq('id', userId)
      .single();
    
    if (profileError) {
      logger.error('[NFSE FLOW] Erro ao buscar perfil', { error: profileError, userId });
      throw new Error(`Erro ao buscar perfil: ${profileError.message}`);
    }
    
    if (!profileData) {
      logger.error('[NFSE FLOW] Perfil não encontrado', { userId });
      throw new Error('Perfil do usuário não encontrado');
    }
    
    logger.info('[NFSE FLOW] Perfil encontrado', { 
      userId, 
      hasDocument: !!profileData.document,
      endereco_codigo_ibge: profileData.endereco_codigo_ibge,
      endereco_municipio: profileData.endereco_municipio,
      endereco_uf: profileData.endereco_uf,
      temCodigoIbge: !!profileData.endereco_codigo_ibge && profileData.endereco_codigo_ibge.length >= 7
    });
    
    // ========== PASSO 3: MAPEAMENTO AUTOMÁTICO ==========
    // Usar código de tributação selecionado pelo usuário (se disponível)
    // Caso contrário, usar mapeamento automático baseado no CNAE
    let codigoTributacaoMunicipio: string;
    let itemListaLc116: string;
    
    if (state.codigoTributacao && state.itemListaLc116) {
      // Usar código selecionado pelo usuário
      codigoTributacaoMunicipio = state.codigoTributacao;
      itemListaLc116 = state.itemListaLc116;
      
      logger.info('[NFSE FLOW] Usando código de tributação selecionado pelo usuário', {
        codigoTributacao: codigoTributacaoMunicipio,
        itemListaLc116
      });
    } else {
      // PASSO 3: Tentar mapeamento automático baseado no CNAE
      logger.info('[NFSE FLOW] Código não selecionado, tentando mapeamento automático...', {
        temCodigoTributacao: !!state.codigoTributacao,
        temItemListaLc116: !!state.itemListaLc116,
        descricao: state.descricao
      });
      
      try {
        const { CnaeTributacaoMapperService } = await import('../nfse/cnae-tributacao-mapper.service');
        const mapper = new CnaeTributacaoMapperService();
        
        // Buscar CNAEs do perfil
        const { data: profileCnae } = await admin
          .from('profiles')
          .select('cnae_principal, cnaes_secundarios, endereco_codigo_ibge')
          .eq('id', userId)
          .single();
        
        if (profileCnae?.cnae_principal) {
          const cnaes = [
            profileCnae.cnae_principal,
            ...(profileCnae.cnaes_secundarios || [])
          ].filter(Boolean);
          
          // Buscar melhor código tributário automaticamente
          // Usar código IBGE do perfil ou fallback
          const codigoMunicipioParaMapping = profileCnae.endereco_codigo_ibge || '4205704'; // Fallback: Garopaba/SC
          const mapping = await mapper.getBestCodigoTributacao(
            cnaes,
            codigoMunicipioParaMapping
          );
          
          if (mapping) {
            codigoTributacaoMunicipio = mapping.cTribNac;
            // Extrair item da LC 116 do código
            // Formato pode ser "07.10" ou "0710" - normalizar para "07"
            const codigoLC116Normalizado = mapping.codigoLC116.replace(/\./g, '');
            itemListaLc116 = codigoLC116Normalizado.substring(0, 2);
            
            logger.info('[NFSE FLOW] ✅ Mapeamento automático bem-sucedido', {
              cnae: profileCnae.cnae_principal,
              codigoTributacao: codigoTributacaoMunicipio,
              itemListaLc116,
              validado: mapping.validado,
              descricaoServico: mapping.descricaoServico
            });
          } else {
            throw new Error('Nenhum mapeamento encontrado para os CNAEs do usuário');
          }
        } else {
          throw new Error('CNAE não encontrado no perfil do usuário');
        }
      } catch (autoMappingError) {
        // Se mapeamento automático falhar, não permitir emissão
        logger.error('[NFSE FLOW] Erro no mapeamento automático', {
          error: (autoMappingError as Error).message,
          temCodigoTributacao: !!state.codigoTributacao,
          temItemListaLc116: !!state.itemListaLc116
        });
        
        flowStates.set(phone, {
          ...state,
          state: 'waiting_descricao'
        });
        
        return {
          response: '❌ Não foi possível determinar automaticamente o código de serviço.\n\nPor favor, descreva o serviço novamente e selecione uma opção da lista de serviços disponíveis para seu CNAE.\n\nSe não aparecer nenhuma opção, entre em contato com o suporte.',
          shouldContinue: true
        };
      }
    }
    
    // Preparar dados do tomador
    const tomadorDoc = formatarDocumento(state.tomadorDocumento);
    const isCnpj = tomadorDoc.length === 14;
    
    // Buscar endereço do tomador (por enquanto, usar dados básicos)
    // TODO: Buscar endereço completo via API da Receita Federal para CNPJ
    
    // CRÍTICO: Validar certificado ANTES de montar o XML
    // O CNPJ do certificado DEVE corresponder ao CNPJ do prestador no XML
    let certificadoCNPJ: string | null = null;
    let certificadoNome: string | null = null; // Nome extraído do certificado
    try {
      const { createCertProvider } = await import('../../nfse/providers/cert-provider.factory');
      const { pfxToPem } = await import('../../nfse/crypto/pfx-utils');
      
      const certProvider = createCertProvider();
      const pfxBuffer = await certProvider.resolvePfx();
      const passphrase = await certProvider.getPassphrase();
      
      const { certificatePem } = pfxToPem(pfxBuffer, passphrase);
      
      // Extrair CNPJ do certificado
      const { validateCertificate } = await import('../../nfse/crypto/pfx-utils');
      const validation = validateCertificate(certificatePem);
      certificadoCNPJ = validation.doc || null;
      
      // Log detalhado dos atributos do certificado para debug
      const forge = (await import('node-forge')).default;
      const cert = forge.pki.certificateFromPem(certificatePem);
      const subjectAttributes = cert.subject.attributes.map((a: any) => ({
        name: a.name,
        shortName: a.shortName,
        value: a.value
      }));
      
      // Extrair nome do prestador do certificado (CN - Common Name)
      // Formato comum: "59 910 672 SILEZIA CARDOZO REBELO:59910672000187"
      for (const attr of cert.subject.attributes) {
        if (attr.name === 'commonName' || attr.shortName === 'CN') {
          const value = typeof attr.value === 'string' ? attr.value : 
                        Array.isArray(attr.value) ? attr.value.join(' ') : 
                        String(attr.value || '');
          
          // Se tem formato "Nome:CNPJ", extrair apenas o nome (antes dos dois pontos)
          if (value.includes(':')) {
            certificadoNome = value.split(':')[0].trim();
          } else {
            // Se não tem dois pontos, tentar remover CNPJ/CPF do final
            const docMatch = value.match(/(\d{11,14})$/);
            if (docMatch && docMatch.index !== undefined) {
              certificadoNome = value.substring(0, docMatch.index).trim();
            } else {
              certificadoNome = value.trim();
            }
          }
          break;
        }
      }
      
      logger.info('[NFSE FLOW] Certificado validado', {
        userId,
        certificadoCNPJ,
        certificadoNome,
        certificadoTipo: validation.tipo,
        certificadoValido: !validation.expired,
        certificadoSubject: validation.subject,
        subjectAttributes: subjectAttributes,
        subjectString: subjectAttributes.map((a: any) => `${a.shortName || a.name}=${a.value}`).join(', ')
      });
      
      if (validation.expired) {
        throw new Error('Certificado digital expirado. Renove o certificado antes de emitir notas.');
      }
      
      if (!certificadoCNPJ) {
        throw new Error('Não foi possível extrair o CNPJ do certificado digital.');
      }
    } catch (certError: any) {
      logger.error('[NFSE FLOW] Erro ao validar certificado', {
        error: certError?.message || certError,
        userId
      });
      throw new Error(`Erro ao validar certificado digital: ${certError?.message || certError}. Verifique se NFSE_CERT_PFX_BASE64 e NFSE_CERT_PFX_PASS estão configurados corretamente no .env`);
    }
    
    // IMPORTANTE: O CNPJ do certificado é a fonte de verdade para a API Nacional
    // O XML DEVE usar o CNPJ do certificado, não o do perfil
    // Validar se o certificado tem CNPJ válido (14 dígitos)
    if (!certificadoCNPJ || certificadoCNPJ.length !== 14) {
      logger.error('[NFSE FLOW] CNPJ do certificado inválido', { 
        userId, 
        certificadoCNPJ,
        certificadoCNPJLength: certificadoCNPJ?.length || 0
      });
      throw new Error('CNPJ do certificado digital inválido. Verifique o certificado configurado.');
    }
    
    // Preparar dados do prestador do perfil (apenas para validação/comparação)
    const prestadorDocPerfil = profileData.document?.replace(/\D/g, '') || '';
    
    // Se o perfil não tem documento válido, apenas avisar (não bloquear)
    // O CNPJ do certificado é a fonte de verdade
    if (!prestadorDocPerfil || prestadorDocPerfil.length < 11) {
      logger.warn('[NFSE FLOW] ⚠️ AVISO: Documento do prestador inválido ou ausente no perfil', { 
        userId, 
        documentLength: prestadorDocPerfil.length,
        hasDocument: !!profileData.document,
        acao: 'Usando CNPJ do certificado no XML (fonte confiável)'
      });
    } else if (prestadorDocPerfil !== certificadoCNPJ) {
      // Se o perfil tem documento válido mas difere do certificado, avisar
      logger.warn('[NFSE FLOW] ⚠️ AVISO: CNPJ do perfil difere do CNPJ do certificado', {
        userId,
        perfilCNPJ: prestadorDocPerfil,
        certificadoCNPJ,
        acao: 'Usando CNPJ do certificado no XML (fonte confiável para API Nacional)'
      });
    }
    
    // Usar o CNPJ do certificado no XML (fonte confiável)
    const prestadorDoc = certificadoCNPJ;
    
    // Nome do prestador: CORRIGIDO - usar nome do certificado (fonte confiável)
    // O prestador é quem se cadastra no aplicativo (dados do certificado)
    // O tomador é quem o usuário cadastra no WhatsApp
    // Reutilizar certificadoNome extraído acima (se disponível)
    const prestadorNome = certificadoNome || profileData.business_name || profileData.name || 'PRESTADOR';
    
    logger.info('[NFSE FLOW] Nome do prestador determinado', {
      userId,
      certificadoNome,
      perfilBusinessName: profileData.business_name,
      perfilName: profileData.name,
      nomeFinal: prestadorNome,
      origem: certificadoNome ? 'CERTIFICADO' : 'PERFIL'
    });
    
    // Buscar código do município do perfil do usuário
    // Se não tiver, tentar buscar da API da Receita usando o CNPJ
    let codigoMunicipioPadrao = '3550308'; // Fallback: São Paulo
    
    if (profileData.endereco_codigo_ibge && profileData.endereco_codigo_ibge.length >= 7) {
      // Garantir que tem 7 dígitos (padrão IBGE)
      codigoMunicipioPadrao = profileData.endereco_codigo_ibge.replace(/\D/g, '').padStart(7, '0').slice(0, 7);
      logger.info('[NFSE FLOW] ✅ Usando código IBGE do perfil do usuário', {
        userId,
        codigoIbge: codigoMunicipioPadrao,
        municipio: profileData.endereco_municipio,
        uf: profileData.endereco_uf
      });
    } else {
      logger.warn('[NFSE FLOW] ⚠️ Código IBGE não encontrado no perfil, tentando buscar da API da Receita', {
        userId,
        temEnderecoCodigoIbge: !!profileData.endereco_codigo_ibge,
        enderecoCodigoIbge: profileData.endereco_codigo_ibge,
        cnpj: prestadorDoc
      });
      
      // Tentar buscar dados do CNPJ na API da Receita para obter o código IBGE
      logger.info('[NFSE FLOW] [BUSCA API] Iniciando busca na ReceitaWS', {
        userId,
        cnpj: prestadorDoc
      });
      
      try {
        const apiUrl = `https://www.receitaws.com.br/v1/cnpj/${prestadorDoc}`;
        const response = await fetch(apiUrl, {
          headers: { 'Accept': 'application/json' }
        });
        
        logger.info('[NFSE FLOW] [BUSCA API] Resposta da ReceitaWS', {
          userId,
          status: response.status,
          ok: response.ok
        });
        
        if (response.ok) {
          const data = await response.json();
          
          logger.info('[NFSE FLOW] [BUSCA API] Dados recebidos da ReceitaWS', {
            userId,
            temMunicipio: !!data.municipio,
            municipio: data.municipio,
            temUf: !!data.uf,
            uf: data.uf,
            temCodigoIbge: !!data.codigo_ibge,
            codigoIbge: data.codigo_ibge,
            todasChaves: Object.keys(data).slice(0, 20)
          });
          
          // Extrair código IBGE do município - tentar múltiplos formatos
          let codigoEncontrado = false;
          
          // Formato 1: Campo direto codigo_ibge
          if (data.codigo_ibge) {
            codigoMunicipioPadrao = String(data.codigo_ibge).replace(/\D/g, '').padStart(7, '0').slice(0, 7);
            codigoEncontrado = true;
            logger.info('[NFSE FLOW] [BUSCA API] ✅ Código IBGE encontrado no campo codigo_ibge', {
              userId,
              codigoIbge: codigoMunicipioPadrao
            });
          }
          
          // Formato 2: Município no formato "NOME (CODIGO)"
          if (!codigoEncontrado && data.municipio) {
            const municipioMatch = String(data.municipio).match(/\((\d+)\)/);
            if (municipioMatch && municipioMatch[1].length >= 5) {
              codigoMunicipioPadrao = municipioMatch[1].padStart(7, '0').slice(0, 7);
              codigoEncontrado = true;
              logger.info('[NFSE FLOW] [BUSCA API] ✅ Código IBGE extraído do formato "NOME (CODIGO)"', {
                userId,
                codigoIbge: codigoMunicipioPadrao,
                municipioOriginal: data.municipio
              });
            }
          }
          
          // Formato 3: Buscar na API IBGE usando município e UF
          if (!codigoEncontrado && data.municipio && data.uf) {
            logger.info('[NFSE FLOW] [BUSCA API] Tentando buscar código IBGE na API do IBGE', {
              userId,
              municipio: data.municipio,
              uf: data.uf
            });
            
            const codigoIBGE = await buscarCodigoMunicipioIBGE(data.uf, data.municipio);
            if (codigoIBGE) {
              codigoMunicipioPadrao = codigoIBGE.padStart(7, '0').slice(0, 7);
              codigoEncontrado = true;
              logger.info('[NFSE FLOW] [BUSCA API] ✅ Código IBGE obtido da API do IBGE', {
                userId,
                codigoIbge: codigoMunicipioPadrao
              });
            }
          }
          
          // Se encontrou código, atualizar o perfil
          if (codigoEncontrado && codigoMunicipioPadrao !== '3550308') {
            try {
              const municipioLimpo = data.municipio?.replace(/\s*\([^)]*\)\s*/g, '').trim() || null;
              
              await admin
                .from('profiles')
                .update({
                  endereco_codigo_ibge: codigoMunicipioPadrao,
                  endereco_municipio: municipioLimpo,
                  endereco_uf: data.uf || null,
                  endereco_logradouro: data.logradouro || null,
                  endereco_numero: data.numero || null,
                  endereco_bairro: data.bairro || null,
                  endereco_cep: data.cep?.replace(/\D/g, '') || null
                })
                .eq('id', userId);
              
              logger.info('[NFSE FLOW] ✅✅✅ Perfil ATUALIZADO com código IBGE da API', {
                userId,
                codigoIbge: codigoMunicipioPadrao,
                municipio: municipioLimpo,
                uf: data.uf
              });
            } catch (updateError: any) {
              logger.error('[NFSE FLOW] ❌ Erro ao atualizar perfil com dados da API', {
                error: updateError?.message || updateError,
                userId
              });
            }
          } else {
            logger.error('[NFSE FLOW] ❌❌❌ NÃO FOI POSSÍVEL OBTER CÓDIGO IBGE - usando São Paulo', {
              userId,
              municipio: data.municipio,
              uf: data.uf,
              codigoIbgeReceita: data.codigo_ibge,
              tentouIBGE: true
            });
          }
        } else {
          logger.error('[NFSE FLOW] [BUSCA API] ❌ Resposta da ReceitaWS não OK', {
            userId,
            status: response.status,
            statusText: response.statusText
          });
        }
      } catch (apiError: any) {
        logger.error('[NFSE FLOW] ❌❌❌ ERRO CRÍTICO ao buscar código IBGE da API da Receita', {
          error: apiError?.message || apiError,
          stack: apiError?.stack,
          userId,
          cnpj: prestadorDoc
        });
      }
      
      // Log final do código que será usado
      logger.info('[NFSE FLOW] [RESULTADO FINAL] Código de município que será usado no XML', {
        userId,
        codigoMunicipioPadrao,
        origem: codigoMunicipioPadrao === '3550308' ? 'FALLBACK SÃO PAULO' : 'PERFIL OU API',
        aviso: codigoMunicipioPadrao === '3550308' ? '⚠️⚠️⚠️ USANDO SÃO PAULO - VERIFICAR!' : '✅ Código correto'
      });
    }
    const cnaePadrao = '6201500'; // Desenvolvimento de sistemas
    
    // IMPORTANTE: Inscrição Municipal (IM)
    // Conforme XSD (tiposComplexos_v1.00.xsd, linha 442), o campo IM é OPCIONAL (minOccurs="0")
    // MEI pode não ter IM em muitos municípios - não usar valor de teste
    // TODO: Quando a coluna inscricao_municipal for adicionada à tabela profiles, buscar aqui
    // Por enquanto, deixar undefined (campo será omitido no XML)
    const inscricaoMunicipal = undefined; // undefined = não incluir no XML (conforme XSD, é opcional)
    
    logger.info('[NFSE FLOW] Dados do prestador preparados', {
      userId,
      prestadorCNPJ: prestadorDoc,
      prestadorNome,
      documentLength: prestadorDoc.length,
      certificadoValidado: true,
      inscricaoMunicipal: inscricaoMunicipal || 'Não informada (opcional conforme XSD)',
      temIM: !!inscricaoMunicipal,
      observacao: inscricaoMunicipal 
        ? 'Usando IM real do cadastro' 
        : 'IM não cadastrada - campo será omitido no XML (permitido para MEI)'
    });
    
    // Gerar competência (mês atual no formato YYYY-MM)
    const hoje = new Date();
    const competencia = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
    
    // PRÉ-VALIDAÇÃO: Verificar se o código de tributação está habilitado no município
    // Isso evita erro E0310 ("código não administrado pelo município na competência")
    if (codigoTributacaoMunicipio && itemListaLc116) {
      try {
        const { preflightCodigoTributacao, getAllowedServicesForCNPJ } = await import('../nfse/cnae-guard.service');
        const preflightResult = await preflightCodigoTributacao(
          codigoTributacaoMunicipio,
          codigoMunicipioPadrao,
          competencia,
          itemListaLc116
        );
        
        if (!preflightResult.valido) {
          logger.error('[NFSE FLOW] Código de tributação NÃO habilitado no município (E0310)', {
            codigoTributacaoMunicipio,
            municipioIbge: codigoMunicipioPadrao,
            competencia,
            itemListaLc116,
            motivo: preflightResult.motivo
          });
          
          // Tentar buscar allowlist do CNPJ para sugerir alternativas
          let cnpjParaAllowlist: string | null = null;
          try {
            const { createCertProvider } = await import('../../nfse/providers/cert-provider.factory');
            const { pfxToPem } = await import('../../nfse/crypto/pfx-utils');
            const { validateCertificate } = await import('../../nfse/crypto/pfx-utils');
            
            const certProvider = createCertProvider();
            const pfxBuffer = await certProvider.resolvePfx();
            const passphrase = await certProvider.getPassphrase();
            const { certificatePem } = pfxToPem(pfxBuffer, passphrase);
            const validation = validateCertificate(certificatePem);
            cnpjParaAllowlist = validation.doc || null;
          } catch (certError) {
            // Ignorar erro
          }
          
          if (cnpjParaAllowlist && cnpjParaAllowlist.length === 14) {
            const allowlist = await getAllowedServicesForCNPJ(
              cnpjParaAllowlist,
              codigoMunicipioPadrao,
              competencia
            );
            
            if (allowlist.length > 0) {
              const servicosLista = allowlist.slice(0, 5).map(s => `${s.ctribnac} - ${s.descricao}`).join('\n');
              flowStates.set(phone, {
                ...state,
                state: 'waiting_descricao'
              });
              
              return {
                response: `❌ O código de serviço selecionado não está habilitado no seu município para a competência ${competencia}.\n\nServiços habilitados disponíveis:\n${servicosLista}\n\nPor favor, selecione um serviço válido da lista anterior ou entre em contato com o suporte.`,
                shouldContinue: true
              };
            }
          }
          
          flowStates.set(phone, {
            ...state,
            state: 'waiting_descricao'
          });
          
          return {
            response: `❌ O código de serviço selecionado não está habilitado no seu município para a competência ${competencia}.\n\nPor favor, entre em contato com o suporte para verificar os códigos disponíveis.`,
            shouldContinue: true
          };
        }
        
        logger.info('[NFSE FLOW] ✅ Código de tributação validado no preflight', {
          codigoTributacaoMunicipio,
          municipioIbge: codigoMunicipioPadrao,
          competencia,
          itemListaLc116
        });
      } catch (preValidationError: any) {
        logger.warn('[NFSE FLOW] Erro na pré-validação municipal (continuando mesmo assim)', {
          error: preValidationError?.message || preValidationError,
          codigoTributacaoMunicipio,
          municipioIbge: codigoMunicipioPadrao
        });
        // Continuar mesmo com erro na pré-validação (será validado na emissão)
      }
    }
    
    // IMPORTANTE: Usar código do município do perfil do usuário (não São Paulo hardcoded)
    logger.info('[NFSE FLOW] Preparando DTO para emissão', {
      userId,
      codigoMunicipioPrestador: codigoMunicipioPadrao,
      codigoMunicipioServico: codigoMunicipioPadrao,
      municipioNome: profileData.endereco_municipio,
      uf: profileData.endereco_uf
    });
    
    // Preparar telefone e email do prestador (opcionais)
    // CORRIGIDO: Priorizar dados salvos no perfil (do cadastro), senão buscar da API
    let prestadorFone: string | undefined = undefined;
    let prestadorEmail: string | undefined = undefined;
    
    // Função auxiliar para normalizar telefone (6-20 dígitos conforme XSD)
    const normalizePhoneForXsd = (phone: string | undefined | null): string | undefined => {
      if (!phone) return undefined;
      const digitsOnly = phone.replace(/\D/g, '');
      if (!digitsOnly || digitsOnly.length < 6) return undefined; // Mínimo 6 dígitos
      return digitsOnly.slice(0, 20); // Máximo 20 dígitos
    };
    
    // Prioridade 1: Usar dados salvos no perfil (do cadastro via BrasilAPI)
    if (profileData.cnpj_phone) {
      prestadorFone = normalizePhoneForXsd(profileData.cnpj_phone);
      logger.info('[NFSE FLOW] ✅ Telefone do prestador obtido do perfil', {
        userId,
        cnpjPhone: prestadorFone,
        original: profileData.cnpj_phone
      });
    }
    
    if (profileData.cnpj_email) {
      prestadorEmail = profileData.cnpj_email;
      logger.info('[NFSE FLOW] ✅ Email do prestador obtido do perfil', {
        userId,
        cnpjEmail: prestadorEmail
      });
    }
    
    // Prioridade 2: Se não tiver no perfil, buscar da API da Receita usando o CNPJ do certificado
    if ((!prestadorFone || !prestadorEmail) && certificadoCNPJ) {
      try {
        logger.info('[NFSE FLOW] Buscando fone/email do prestador na API ReceitaWS', {
          userId,
          certificadoCNPJ
        });
        
        const apiUrl = `https://www.receitaws.com.br/v1/cnpj/${certificadoCNPJ}`;
        const response = await fetch(apiUrl, {
          headers: { 'Accept': 'application/json' }
        });
        
        logger.info('[NFSE FLOW] Resposta da API ReceitaWS para prestador', {
          userId,
          status: response.status,
          ok: response.ok
        });
        
        if (response.ok) {
          const data = await response.json();
          
          logger.info('[NFSE FLOW] Dados recebidos da API ReceitaWS para prestador', {
            userId,
            status: data.status,
            hasTelefone: !!(data.telefone || data.phone || data.fone),
            hasEmail: !!(data.email || data.email_principal),
            telefone: data.telefone || data.phone || data.fone,
            email: data.email || data.email_principal
          });
          
          if (data.status !== 'ERROR' && !data.message) {
            // Normalizar telefone: remover caracteres não numéricos e limitar a 20 dígitos
            if (!prestadorFone && (data.telefone || data.phone || data.fone)) {
              prestadorFone = normalizePhoneForXsd(data.telefone || data.phone || data.fone);
            }
            if (!prestadorEmail && (data.email || data.email_principal)) {
              prestadorEmail = data.email || data.email_principal || undefined;
            }
            
            logger.info('[NFSE FLOW] ✅ Fone/Email do prestador obtidos da API ReceitaWS', {
              userId,
              prestadorFone,
              prestadorEmail,
              hasFone: !!prestadorFone,
              hasEmail: !!prestadorEmail
            });
          } else {
            logger.warn('[NFSE FLOW] ⚠️ API ReceitaWS retornou erro para prestador', {
              userId,
              status: data.status,
              message: data.message
            });
          }
        } else {
          logger.warn('[NFSE FLOW] ⚠️ Erro HTTP ao buscar fone/email do prestador', {
            userId,
            status: response.status,
            statusText: response.statusText
          });
        }
      } catch (apiError) {
        logger.error('[NFSE FLOW] ❌ Erro ao buscar fone/email do prestador da API', {
          error: (apiError as Error).message,
          stack: (apiError as Error).stack,
          userId
        });
      }
    } else {
      logger.warn('[NFSE FLOW] ⚠️ certificadoCNPJ não disponível para buscar fone/email', {
        userId
      });
    }
    
    // Preparar DTO para emissão
    const dataEmissaoIso = new Date().toISOString();

    const dpsDto: CreateDpsDto = {
      userId,
      prestador: {
        cpfCnpj: prestadorDoc,
        inscricaoMunicipal: inscricaoMunicipal, // undefined se não tiver IM (campo opcional no XML)
        codigoMunicipio: codigoMunicipioPadrao, // Código do município do perfil (ou fallback São Paulo)
        nome: prestadorNome,
        fone: prestadorFone, // Telefone do prestador (opcional)
        email: prestadorEmail // Email do prestador (opcional)
      },
      tomador: {
        nome: state.tomadorNome!,
        documento: tomadorDoc,
        endereco: {
          // Garantir que sempre tenha código de município válido
          codigoMunicipio: state.tomadorEndereco?.codigoMunicipio || codigoMunicipioPadrao,
          logradouro: state.tomadorEndereco?.logradouro || 'A definir',
          numero: state.tomadorEndereco?.numero || '0',
          bairro: state.tomadorEndereco?.bairro || 'A definir',
          uf: state.tomadorEndereco?.uf || profileData.endereco_uf || 'SP',
          cep: state.tomadorEndereco?.cep || '01000000'
        },
        // CORRIGIDO: Incluir fone e email do tomador se disponíveis (normalizado)
        fone: normalizePhoneForXsd(state.tomadorFone),
        email: state.tomadorEmail || undefined
      },
      servico: {
        codigoTributacaoMunicipio: codigoTributacaoMunicipio, // Código selecionado ou padrão
        itemListaLc116: itemListaLc116, // Item selecionado ou padrão
        codigoCnae: cnaePadrao,
        descricao: (state.descricaoDigitada?.trim() || state.descricao!),
        codigoMunicipio: codigoMunicipioPadrao, // Código do município do perfil (ou fallback São Paulo)
        aliquota: 0.05, // 5% padrão para MEI conforme legislação
        valorServicos: state.valor!,
        valorDeducoes: 0
      },
      regime: {
        optanteSimples: true,
        // CHECKLIST: regEspTrib será forçado para '2' no template quando MEI (opSimpNac='2')
        // opSimpNac: 1-Não Optante, 2-MEI, 3-ME/EPP
        // regEspTrib: 0-Nenhum, 1-Ato Cooperado, 2-MEI, 3-Microempresa Municipal, 4-Notário, 5-Profissional Autônomo, 6-Sociedade de Profissionais
        // O template força regEspTrib='2' quando opSimpNac='2' (MEI)
        regimeEspecialTributacao: '0', // Valor padrão, será sobrescrito no template para '2' se MEI
        incentivoFiscal: false
      },
      identification: {
        // CORREÇÃO: Usar série 900 conforme XML de sucesso
        // A série 900 é a série padrão para o município Garopaba/SC (4205704)
        serie: '900',
        // Número da DPS: conforme XSD, deve começar com 1-9 (não pode começar com zero)
        // Padrão: [1-9]{1}[0-9]{0,14} - primeiro dígito 1-9, seguido de 0-14 dígitos
        // Usar timestamp mas garantir que não comece com zero
        numero: (() => {
          const timestamp = Date.now().toString();
          // Pegar últimos 6 dígitos do timestamp
          let numero = timestamp.slice(-6);
          // Se começar com zero, substituir o primeiro dígito por 1-9 baseado no segundo dígito
          // Isso mantém a unicidade enquanto garante que não começa com zero
          if (numero.startsWith('0')) {
            const segundoDigito = parseInt(numero[1] || '1', 10);
            // Usar segundo dígito + 1 (ou 1 se for 0) para garantir 1-9
            const primeiroDigito = segundoDigito === 0 ? 1 : Math.min(segundoDigito + 1, 9);
            numero = `${primeiroDigito}${numero.slice(1)}`;
          }
          return numero;
        })(),
        competencia: competencia,
        dataEmissao: dataEmissaoIso
      }
    };
    
    // Gerar XML DPS
    const xmlDps = buildDpsXml(dpsDto);
    const xmlGzip = gzipSync(Buffer.from(xmlDps, 'utf8'));
    const xmlGzipB64 = xmlGzip.toString('base64');
    
    // Chamar serviço de emissão
    const nfseService = new NfseService();
    const result = await nfseService.emit({
      userId,
      versao: '1.00',
      dps_xml_gzip_b64: xmlGzipB64
    });
    
    // Tratar erro E0178 (regime especial não permitido)
    const temErroE0178 = result.resposta?.erros?.some((e: any) => e.Codigo === 'E0178') || 
                         (result.status === 'REJEITADA' && result.situacao?.includes('E0178'));
    
    // Tratar erro E0310 (código não administrado pelo município)
    const temErroE0310 = result.resposta?.erros?.some((e: any) => e.Codigo === 'E0310') || 
                         (result.status === 'REJEITADA' && result.situacao?.includes('E0310'));
    
    // ✅ NOVO: Tratar erro E0312 (código não administrado pelo município na competência)
    // E0312 é mais específico que E0310 - indica problema com competência específica
    const temErroE0312 = result.resposta?.erros?.some((e: any) => e.Codigo === 'E0312') || 
                         (result.status === 'REJEITADA' && result.situacao?.includes('E0312'));
    
    if (temErroE0178) {
      logger.error('[NFSE FLOW] Erro E0178: Regime especial não permitido para o código de tributação', {
        codigoTributacao: codigoTributacaoMunicipio,
        regEspTrib: '0',
        opSimpNac: '2',
        municipio: codigoMunicipioPadrao,
        resposta: result.resposta
      });
      
      // Tentar remover regEspTrib ou usar outro código
      // Por enquanto, informar o usuário
      flowStates.set(phone, {
        ...state,
        state: 'waiting_descricao'
      });
      
      return {
        response: `❌ O código de serviço selecionado (${codigoTributacaoMunicipio}) não permite emissão para MEI no município de ${profileData.endereco_municipio || 'seu município'}.\n\nPor favor, digite "emitir nota" novamente e selecione outro serviço da lista, ou entre em contato com o suporte.`,
        shouldContinue: true
      };
    }
    
    // ✅ TRATAR E0312 PRIMEIRO (mais específico que E0310)
    if (temErroE0312) {
      logger.error('[NFSE FLOW] Erro E0312: Código não administrado pelo município na competência', {
        codigoTributacao: codigoTributacaoMunicipio,
        municipio: codigoMunicipioPadrao,
        competencia,
        resposta: result.resposta
      });
      
      // Tentar buscar códigos válidos da API municipal diretamente
      try {
        const { MunicipalParamsService } = await import('../../nfse/services/municipal-params.service');
        const paramsService = new MunicipalParamsService();
        
        // ✅ CORREÇÃO: Converter itemListaLc116 para código de serviço de 6 dígitos
        const codigoServico6dig = (itemListaLc116 || '01').replace(/\./g, '').padEnd(6, '0');
        
        // Buscar serviços habilitados diretamente da API municipal
        // ✅ CORREÇÃO: Agora retorna Set vazio se API não disponível (não lança erro)
        let servicosHabilitados: Set<string> = new Set();
        servicosHabilitados = await paramsService.listarServicosHabilitados(
          codigoMunicipioPadrao,
          competencia,
          codigoServico6dig
        );
        
        // ✅ CORREÇÃO: Se API não disponível, informar ao usuário mas não bloquear
        if (servicosHabilitados.size === 0) {
          logger.warn('[NFSE FLOW] API municipal não disponível para consulta de parâmetros', {
            codigoMunicipioPadrao,
            competencia,
            codigoServico: codigoServico6dig,
            observacao: 'Prosseguindo com emissão - validação final será feita pela API Nacional'
          });
        }
          
        if (servicosHabilitados.size > 0) {
            // Buscar descrições dos códigos válidos
            const { buscarDescricaoCodigoTributacao } = await import('../nfse/cnae-service');
            const codigosValidos = Array.from(servicosHabilitados).slice(0, 5);
            const servicosComDescricao = await Promise.all(
              codigosValidos.map(async (codigo) => {
                const descricao = await buscarDescricaoCodigoTributacao(codigo);
                return `${codigo} - ${descricao || 'Serviço código ' + codigo}`;
              })
            );
            
            const servicosLista = servicosComDescricao.join('\n');
            
            flowStates.set(phone, {
              ...state,
              state: 'waiting_descricao'
            });
            
            return {
              response: `❌ O código de serviço ${codigoTributacaoMunicipio} não está habilitado no município de ${profileData.endereco_municipio || 'Garopaba'} para a competência ${competencia}.\n\n✅ *Serviços habilitados disponíveis:*\n${servicosLista}\n\nPor favor, digite "emitir nota" novamente e selecione um serviço válido da lista acima.`,
              shouldContinue: true
            };
          }
      } catch (apiError: any) {
        logger.warn('[NFSE FLOW] Erro ao buscar serviços da API municipal para E0312', {
          error: apiError?.message || apiError
        });
      }
      
      // Fallback: tentar allowlist do CNPJ
      try {
        const { getAllowedServicesForCNPJ } = await import('../nfse/cnae-guard.service');
        let cnpjParaAllowlist: string | null = null;
        
        try {
          const { createCertProvider } = await import('../../nfse/providers/cert-provider.factory');
          const { pfxToPem } = await import('../../nfse/crypto/pfx-utils');
          const { validateCertificate } = await import('../../nfse/crypto/pfx-utils');
          
          const certProvider = createCertProvider();
          const pfxBuffer = await certProvider.resolvePfx();
          const passphrase = await certProvider.getPassphrase();
          const { certificatePem } = pfxToPem(pfxBuffer, passphrase);
          const validation = validateCertificate(certificatePem);
          cnpjParaAllowlist = validation.doc || null;
        } catch (certError) {
          // Ignorar
        }
        
        if (cnpjParaAllowlist && cnpjParaAllowlist.length === 14) {
          const allowlist = await getAllowedServicesForCNPJ(
            cnpjParaAllowlist,
            codigoMunicipioPadrao,
            competencia
          );
          
          if (allowlist.length > 0) {
            const servicosLista = allowlist.slice(0, 5).map(s => `${s.ctribnac} - ${s.descricao}`).join('\n');
            flowStates.set(phone, {
              ...state,
              state: 'waiting_descricao'
            });
            
            return {
              response: `❌ O código de serviço ${codigoTributacaoMunicipio} não está habilitado no município de ${profileData.endereco_municipio || 'Garopaba'} para a competência ${competencia}.\n\n✅ *Serviços habilitados disponíveis:*\n${servicosLista}\n\nPor favor, digite "emitir nota" novamente e selecione um serviço válido da lista acima.`,
              shouldContinue: true
            };
          }
        }
      } catch (allowlistError) {
        logger.warn('[NFSE FLOW] Erro ao buscar códigos válidos para E0312', {
          error: allowlistError
        });
      }
      
      // Fallback: mensagem genérica
      flowStates.set(phone, {
        ...state,
        state: 'waiting_descricao'
      });
      
      return {
        response: `❌ O código de serviço ${codigoTributacaoMunicipio} não está habilitado no município de ${profileData.endereco_municipio || 'Garopaba'} para a competência ${competencia}.\n\n⚠️ Este código funcionou anteriormente, mas pode ter sido desabilitado pela API Nacional.\n\nPor favor, digite "emitir nota" novamente e selecione outro serviço da lista, ou entre em contato com o suporte.`,
        shouldContinue: true
      };
    }
    
    if (temErroE0310) {
      logger.error('[NFSE FLOW] Erro E0310: Código não administrado pelo município (no resultado)', {
        codigoTributacao: codigoTributacaoMunicipio,
        municipio: codigoMunicipioPadrao,
        competencia,
        resposta: result.resposta
      });
      
      // Tentar buscar allowlist e sugerir códigos alternativos
      try {
        const { getAllowedServicesForCNPJ } = await import('../nfse/cnae-guard.service');
        let cnpjParaAllowlist: string | null = null;
        
        try {
          const { createCertProvider } = await import('../../nfse/providers/cert-provider.factory');
          const { pfxToPem } = await import('../../nfse/crypto/pfx-utils');
          const { validateCertificate } = await import('../../nfse/crypto/pfx-utils');
          
          const certProvider = createCertProvider();
          const pfxBuffer = await certProvider.resolvePfx();
          const passphrase = await certProvider.getPassphrase();
          const { certificatePem } = pfxToPem(pfxBuffer, passphrase);
          const validation = validateCertificate(certificatePem);
          cnpjParaAllowlist = validation.doc || null;
        } catch (certError) {
          // Ignorar
        }
        
        if (cnpjParaAllowlist && cnpjParaAllowlist.length === 14) {
          const allowlist = await getAllowedServicesForCNPJ(
            cnpjParaAllowlist,
            codigoMunicipioPadrao,
            competencia
          );
          
          if (allowlist.length > 0) {
            const servicosLista = allowlist.slice(0, 5).map(s => `${s.ctribnac} - ${s.descricao}`).join('\n');
            flowStates.set(phone, {
              ...state,
              state: 'waiting_descricao'
            });
            
            return {
              response: `❌ O código de serviço selecionado (${codigoTributacaoMunicipio}) não está habilitado no município de ${profileData.endereco_municipio || 'seu município'} para a competência ${competencia}.\n\nServiços habilitados disponíveis:\n${servicosLista}\n\nPor favor, digite "emitir nota" novamente e selecione um serviço válido da lista acima.`,
              shouldContinue: true
            };
          }
        }
      } catch (allowlistError) {
        logger.warn('[NFSE FLOW] Erro ao buscar allowlist para E0310 (no resultado)', {
          error: allowlistError
        });
      }
      
      // Fallback: mensagem genérica
      flowStates.set(phone, {
        ...state,
        state: 'waiting_descricao'
      });
      
      return {
        response: `❌ O código de serviço selecionado (${codigoTributacaoMunicipio}) não está habilitado no município de ${profileData.endereco_municipio || 'seu município'} para a competência ${competencia}.\n\nPor favor, digite "emitir nota" novamente e selecione outro serviço da lista, ou entre em contato com o suporte.`,
        shouldContinue: true
      };
    }
    
    if (result.status === 'AUTORIZADA' || result.chaveAcesso) {
      // ========== PASSO 2: VALIDAÇÃO PROGRESSIVA ==========
      // Marcar código tributário como validado após emissão bem-sucedida
      try {
        const { CnaeTributacaoMapperService } = await import('../nfse/cnae-tributacao-mapper.service');
        const mapper = new CnaeTributacaoMapperService();
        
        // Buscar CNAE do perfil do usuário
        const { data: profileCnae } = await admin
          .from('profiles')
          .select('cnae_principal, endereco_codigo_ibge')
          .eq('id', userId)
          .single();
        
        if (profileCnae?.cnae_principal && codigoMunicipioPadrao) {
          await mapper.marcarComoValidado(
            profileCnae.cnae_principal,
            codigoMunicipioPadrao,
            codigoTributacaoMunicipio
          );
          
          logger.info('[NFSE FLOW] ✅ Código tributário marcado como validado', {
            cnae: profileCnae.cnae_principal,
            codigoTributacao: codigoTributacaoMunicipio,
            municipio: codigoMunicipioPadrao
          });
        }
      } catch (validationError) {
        // Não bloquear emissão se validação falhar
        logger.warn('[NFSE FLOW] Erro ao marcar código como validado (não crítico)', {
          error: (validationError as Error).message
        });
      }
      
      // ========== GERAÇÃO, UPLOAD E ENVIO DO PDF ==========
      let pdfUrl: string | undefined;
      let pdfEnviadoComSucesso = false; // ✅ Rastrear se PDF foi enviado com sucesso
      try {
        if (result.chaveAcesso) {
          logger.info('[NFSE FLOW] Gerando PDF da nota fiscal...', {
            chaveAcesso: result.chaveAcesso,
            protocolo: result.protocolo
          });
          
          // NOVA ABORDAGEM: Consultar XML e gerar PDF localmente
          // A API Nacional não fornece PDF diretamente, então:
          // 1. Consultar XML da nota na API ADN
          // 2. Gerar PDF localmente a partir do XML
          // 3. Upload no Supabase Storage
          // 4. Enviar via WhatsApp
          
          let pdfBuffer: Buffer | null = null;
          
          try {
            // ✅ ESTRATÉGIA 1: Tentar usar XML da resposta da emissão (se disponível)
            // A resposta da API pode conter nfseXmlGZipB64 que já tem o XML completo
            let xmlNota: string | null = null;
            
            if (result.resposta?.nfseXmlGZipB64) {
              try {
                // Decodificar XML da resposta
                const { gunzipSync } = await import('node:zlib');
                const xmlBuffer = gunzipSync(Buffer.from(result.resposta.nfseXmlGZipB64, 'base64'));
                xmlNota = xmlBuffer.toString('utf8');
                logger.info('[NFSE FLOW] XML obtido da resposta da emissão', {
                  tamanho: xmlNota.length
                });
              } catch (xmlError) {
                logger.warn('[NFSE FLOW] Erro ao decodificar XML da resposta', {
                  error: (xmlError as Error).message
                });
              }
            }
            
            // ✅ ESTRATÉGIA 2: Se não tiver XML na resposta, consultar na API ADN
            if (!xmlNota) {
              logger.info('[NFSE FLOW] XML não disponível na resposta, consultando na API ADN...');
              const { NfseConsultaService } = await import('../../nfse/services/nfse-consulta.service');
              const consultaService = new NfseConsultaService();
              
              // Aguardar alguns segundos antes de consultar (nota pode levar tempo para ficar disponível)
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              const dadosNota = await consultaService.consultarNFSe(result.chaveAcesso);
              xmlNota = dadosNota.xmlCompleto;
            }
            
            // ✅ ESTRATÉGIA 3: Gerar PDF a partir do XML
            if (xmlNota) {
              logger.info('[NFSE FLOW] Gerando PDF a partir do XML...');
              const { NfseConsultaService } = await import('../../nfse/services/nfse-consulta.service');
              const { PdfGeneratorService } = await import('../../nfse/services/pdf-generator.service');
              
              const consultaService = new NfseConsultaService();
              const pdfGeneratorService = new PdfGeneratorService();
              
              // ✅ CORREÇÃO: Passar XML prévio para evitar consulta desnecessária
              const dadosNota = await consultaService.consultarNFSe(result.chaveAcesso, xmlNota);
              
              pdfBuffer = await pdfGeneratorService.gerarPdfNfse(dadosNota);
              
              logger.info('[NFSE FLOW] PDF gerado com sucesso', {
                tamanho: pdfBuffer.length,
                protocolo: result.protocolo
              });
            } else {
              throw new Error('XML da nota não disponível');
            }
          } catch (pdfGenError) {
            logger.warn('[NFSE FLOW] Erro ao gerar PDF localmente, tentando download direto...', {
              error: (pdfGenError as Error).message
            });
            
            // Fallback: Tentar baixar PDF direto (pode não funcionar, mas tentamos)
            try {
              // Aguardar alguns segundos antes de tentar baixar (PDF pode levar tempo para ficar disponível)
              await new Promise(resolve => setTimeout(resolve, 3000));
              pdfBuffer = await nfseService.downloadDanfe(result.chaveAcesso, 3, 3000);
            } catch (downloadError) {
              logger.error('[NFSE FLOW] Erro ao baixar PDF direto também', {
                error: (downloadError as Error).message
              });
              // Continuar sem PDF - não bloquear sucesso da emissão
            }
          }
          
          if (pdfBuffer && pdfBuffer.length > 0) {
            // ✅ VALIDAÇÃO CRÍTICA: Garantir que pdfBuffer é um Buffer binário válido
            if (!Buffer.isBuffer(pdfBuffer)) {
              logger.error('[NFSE FLOW] ❌ PDF não é um Buffer válido', {
                tipo: typeof pdfBuffer,
                protocolo: result.protocolo
              });
              throw new Error('PDF não é um Buffer válido');
            }

            // ✅ VALIDAÇÃO: Verificar magic bytes do PDF
            const magicBytes = pdfBuffer.slice(0, 4).toString('ascii');
            const isPdf = magicBytes === '%PDF';
            
            logger.info('[NFSE FLOW] ✅ Validação do PDF gerado:', {
              isBuffer: Buffer.isBuffer(pdfBuffer),
              tipo: typeof pdfBuffer,
              size: pdfBuffer.length,
              sizeMB: (pdfBuffer.length / 1024 / 1024).toFixed(2),
              primeiros10Bytes: pdfBuffer.slice(0, 10).toString('hex'),
              magicBytes,
              ehPDF: isPdf,
              protocolo: result.protocolo
            });

            if (!isPdf) {
              logger.warn('[NFSE FLOW] ⚠️ Arquivo pode não ser um PDF válido', {
                magicBytes,
                protocolo: result.protocolo
              });
            }
            
            // 2. Buscar ID da emissão pelo protocolo
            const { data: emissionData, error: emissionError } = await admin
              .from('nfse_emissions')
              .select('id')
              .eq('protocolo', result.protocolo)
              .eq('user_id', userId)
              .single();
            
            if (emissionError || !emissionData) {
              logger.error('[NFSE FLOW] Erro ao buscar emissão para anexar PDF', {
                error: emissionError,
                protocolo: result.protocolo
              });
            } else {
              // ✅ 3. Fazer upload do PDF para storage (BUFFER BINÁRIO - não converter para Base64!)
              logger.info('[NFSE FLOW] Fazendo upload do PDF binário para storage...', {
                emissionId: emissionData.id,
                bufferSize: pdfBuffer.length,
                isBuffer: Buffer.isBuffer(pdfBuffer)
              });
              
              const { attachPdf } = await import('../../nfse/repositories/nfse-emissions.repo');
              const urlResult = await attachPdf(emissionData.id, pdfBuffer);
              pdfUrl = urlResult || undefined;
              
              if (pdfUrl) {
                logger.info('[NFSE FLOW] PDF enviado para storage com sucesso', {
                  emissionId: emissionData.id,
                  pdfUrl: pdfUrl.substring(0, 100) + '...'
                });
                
                // 4. Enviar PDF via WhatsApp
                try {
                  const { CertWhatsappService } = await import('./cert-whatsapp.service');
                  const whatsappService = new CertWhatsappService();
                  
                  // ✅ SOLUÇÃO DEFINITIVA: Usar URL do nosso próprio backend (retorna PDF binário)
                  // Isso evita que o WhatsApp detecte Base64 e adicione .base64 ao nome
                  // O endpoint /nfse/pdf/:identificador retorna PDF como arquivo binário
                  const envModule = await import('../../env');
                  const backendBaseUrl = envModule.env.BACKEND_URL || process.env.BACKEND_URL || process.env.API_URL || `http://localhost:${envModule.env.PORT || 3333}`;
                  
                  // Usar protocolo ou chaveAcesso como identificador
                  const identificador = result.protocolo || result.chaveAcesso;
                  const nossoBackendPdfUrl = `${backendBaseUrl}/nfse/pdf/${identificador}`;
                  
                  logger.info('[NFSE FLOW] Usando URL do nosso backend para enviar link', {
                    nossoBackendUrl: nossoBackendPdfUrl,
                    protocolo: result.protocolo,
                    chaveAcesso: result.chaveAcesso
                  });
                  
                  // ✅ SOLUÇÃO DEFINITIVA: Enviar APENAS o link
                  // A Z-API não suporta envio de arquivos sem Base64
                  // Base64 sempre adiciona .base64 ao nome (limitação do WhatsApp)
                  // MELHOR SOLUÇÃO: Link direto para download (nome limpo)
                  
                  logger.info('[NFSE FLOW] Enviando link do PDF (evita .base64)', {
                    phone,
                    protocolo: result.protocolo,
                    nossoBackendUrl: nossoBackendPdfUrl
                  });
                  
                  try {
                    await whatsappService.enviarMensagemDireta(
                      phone,
                      `✅ *Nota Fiscal de Serviço emitida com sucesso!*\n\n` +
                      `📄 *Protocolo:* ${result.protocolo}\n` +
                      `${result.chaveAcesso ? `🔑 *Chave de acesso:* ${result.chaveAcesso}\n` : ''}\n\n` +
                      `📥 *Baixe o PDF da sua NFS-e:*\n` +
                      `${nossoBackendPdfUrl}\n\n` +
                      `_Clique no link acima para baixar o PDF com nome correto (sem .base64)_`
                    );
                    
                    logger.info('[NFSE FLOW] ✅ Link do PDF enviado com sucesso', {
                      phone,
                      protocolo: result.protocolo
                    });
                    
                  } catch (linkError) {
                    logger.error('[NFSE FLOW] ❌ Erro ao enviar link', {
                      error: String(linkError),
                      phone,
                      protocolo: result.protocolo
                    });
                    throw linkError;
                  }
                  
                  pdfEnviadoComSucesso = true; // ✅ Marcar que PDF foi enviado com sucesso
                  logger.info('[NFSE FLOW] PDF enviado via WhatsApp com sucesso', {
                    phone,
                    protocolo: result.protocolo
                  });
                } catch (whatsappError) {
                  logger.error('[NFSE FLOW] Erro ao enviar PDF via WhatsApp (não crítico)', {
                    error: (whatsappError as Error).message,
                    phone
                  });
                  // Não bloquear sucesso da emissão se envio do PDF falhar
                  pdfEnviadoComSucesso = false;
                }
              } else {
                logger.warn('[NFSE FLOW] PDF não gerou URL pública', {
                  emissionId: emissionData.id
                });
              }
            }
          } else {
            logger.warn('[NFSE FLOW] PDF baixado está vazio', {
              chaveAcesso: result.chaveAcesso
            });
          }
        } else {
          logger.warn('[NFSE FLOW] Chave de acesso não disponível para baixar PDF', {
            protocolo: result.protocolo,
            status: result.status
          });
        }
      } catch (pdfError) {
        // Não bloquear sucesso da emissão se download/upload do PDF falhar
        logger.error('[NFSE FLOW] Erro ao processar PDF (não crítico)', {
          error: (pdfError as Error).message,
          stack: (pdfError as Error).stack,
          protocolo: result.protocolo
        });
      }
      
      clearFlowState(phone);
      
      // ✅ CORREÇÃO: Se o PDF já foi enviado com sucesso (com protocolo e chave), não enviar mensagem duplicada
      // A mensagem completa já foi enviada junto com o PDF (linha 2841-2844)
      // Só retornar mensagem se o PDF não foi enviado ou se houve erro
      if (pdfEnviadoComSucesso) {
        // PDF foi enviado com sucesso junto com protocolo e chave, não enviar mensagem duplicada
        // ✅ NÃO retornar pdfUrl para evitar envio duplicado na rota whatsapp.ts
        // ✅ NÃO processar com IA - emissão concluída, fluxo finalizado
        return {
          response: '', // ✅ Não enviar mensagem duplicada - PDF já foi enviado com protocolo e chave
          shouldContinue: false,
          pdfUrl: undefined, // ✅ Não retornar pdfUrl para evitar envio duplicado
          emissaoConcluida: true // ✅ Flag para indicar que emissão foi concluída e não deve processar com IA
        } as { response: string; shouldContinue: boolean; pdfUrl?: string; emissaoConcluida?: boolean };
      } else {
        // PDF não foi enviado, enviar mensagem de sucesso sem PDF
        return {
          response: `✅ *Nota fiscal emitida com sucesso!*\n\n📄 Protocolo: ${result.protocolo}\n${result.chaveAcesso ? `🔑 Chave de acesso: ${result.chaveAcesso}\n` : ''}\n⚠️ PDF não disponível no momento.`,
          shouldContinue: false,
          pdfUrl, // Retornar pdfUrl apenas se PDF não foi enviado (para tentar enviar depois)
          emissaoConcluida: true // ✅ Flag para indicar que emissão foi concluída
        } as { response: string; shouldContinue: boolean; pdfUrl?: string; emissaoConcluida?: boolean };
      }
    } else {
      // ✅ ANEXAR errorResponse AO ERRO PARA CAPTURA NO CATCH
      const errorToThrow = new Error(result.situacao || 'Erro na emissão');
      (errorToThrow as any).errorResponse = result.resposta;
      throw errorToThrow;
    }
  } catch (error: any) {
    const errorMessage = error?.message || error?.toString() || 'Erro desconhecido na emissão';
    
    // Verificar se é erro E0178, E0310, E0312 ou E999
    const isE0178 = errorMessage.includes('E0178') || 
                   error?.response?.data?.erros?.some((e: any) => e.Codigo === 'E0178');
    const isE0310 = errorMessage.includes('E0310') || 
                   error?.response?.data?.erros?.some((e: any) => e.Codigo === 'E0310');
    // ✅ NOVO: Detectar E0312 (código não administrado pelo município na competência)
    const isE0312 = errorMessage.includes('E0312') || 
                   error?.response?.data?.erros?.some((e: any) => e.Codigo === 'E0312') ||
                   error?.errorResponse?.erros?.some((e: any) => e.Codigo === 'E0312');
    const isE999 = errorMessage.includes('E999') || 
                   error?.response?.data?.erros?.some((e: any) => e.Codigo === 'E999') ||
                   errorMessage.includes('Erro não catalogado');
    
    // Buscar perfil novamente para ter acesso aos dados do município
    let profileDataError: any = null;
    let codigoMunicipioPadraoError = '3550308'; // Fallback
    let nomeMunicipioError = 'seu município';
    
    try {
      const { data: profileDataTemp } = await admin
        .from('profiles')
        .select('endereco_codigo_ibge, endereco_municipio, endereco_uf')
        .eq('id', userId)
        .single();
      
      if (profileDataTemp) {
        profileDataError = profileDataTemp;
        if (profileDataTemp.endereco_codigo_ibge && profileDataTemp.endereco_codigo_ibge.length >= 7) {
          codigoMunicipioPadraoError = profileDataTemp.endereco_codigo_ibge.replace(/\D/g, '').padStart(7, '0').slice(0, 7);
        }
        nomeMunicipioError = profileDataTemp.endereco_municipio || 'seu município';
      }
    } catch (profileError) {
      logger.warn('[NFSE FLOW] Erro ao buscar perfil no catch', { error: profileError });
    }
    
    logger.error('[NFSE FLOW] Erro ao emitir nota', { 
      error: errorMessage,
      errorStack: error?.stack,
      userId, 
      phone,
      state: state.state,
      isE0178,
      isE0310,
      isE0312,
      isE999,
      errorResponse: error?.response?.data || error?.errorResponse,
      municipio: nomeMunicipioError
    });
    
    if (isE0178) {
      flowStates.set(phone, {
        ...state,
        state: 'waiting_descricao'
      });
      
      return {
        response: `❌ O código de serviço selecionado (${state.codigoTributacao || 'N/A'}) não permite emissão para MEI no município de ${nomeMunicipioError}.\n\nPor favor, digite "emitir nota" novamente e selecione outro serviço da lista, ou entre em contato com o suporte.`,
        shouldContinue: true
      };
    }
    
    // ✅ TRATAR E0312 PRIMEIRO (mais específico que E0310)
    if (isE0312) {
      // Gerar competência (mês atual no formato YYYY-MM)
      const hoje = new Date();
      const competenciaE0312 = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
      
      // IMPORTANTE: Usar código do município do perfil do usuário (não São Paulo hardcoded)
      const codigoMunicipioE0312 = codigoMunicipioPadraoError;
      const nomeMunicipioE0312 = nomeMunicipioError;
      
      logger.error('[NFSE FLOW] Erro E0312: Código não administrado pelo município na competência', {
        codigoTributacao: state.codigoTributacao,
        municipio: codigoMunicipioE0312,
        municipioNome: nomeMunicipioE0312,
        competencia: competenciaE0312,
        errorResponse: error?.errorResponse || error?.response?.data
      });
      
      // Tentar buscar códigos válidos da API municipal diretamente
      try {
        const { MunicipalParamsService } = await import('../../nfse/services/municipal-params.service');
        const paramsService = new MunicipalParamsService();
        
        // ✅ CORREÇÃO: Converter itemListaLc116 para código de serviço de 6 dígitos
        const codigoServico6digE0312 = (state.itemListaLc116 || '01').replace(/\./g, '').padEnd(6, '0');
        
        // Buscar serviços habilitados diretamente da API municipal
        // ✅ CORREÇÃO: Agora retorna Set vazio se API não disponível (não lança erro)
        let servicosHabilitados: Set<string> = new Set();
        servicosHabilitados = await paramsService.listarServicosHabilitados(
          codigoMunicipioE0312,
          competenciaE0312,
          codigoServico6digE0312
        );
        
        if (servicosHabilitados.size > 0) {
            // Buscar descrições dos códigos válidos
            const { buscarDescricaoCodigoTributacao } = await import('../nfse/cnae-service');
            const codigosValidos = Array.from(servicosHabilitados).slice(0, 5);
            const servicosComDescricao = await Promise.all(
              codigosValidos.map(async (codigo) => {
                const descricao = await buscarDescricaoCodigoTributacao(codigo);
                return `${codigo} - ${descricao || 'Serviço código ' + codigo}`;
              })
            );
            
            const servicosLista = servicosComDescricao.join('\n');
            
            flowStates.set(phone, {
              ...state,
              state: 'waiting_descricao'
            });
            
            return {
              response: `❌ O código de serviço ${state.codigoTributacao || 'N/A'} não está habilitado no município de ${nomeMunicipioE0312} para a competência ${competenciaE0312}.\n\n✅ *Serviços habilitados disponíveis:*\n${servicosLista}\n\nPor favor, digite "emitir nota" novamente e selecione um serviço válido da lista acima.`,
              shouldContinue: true
            };
          }
      } catch (apiError: any) {
        logger.warn('[NFSE FLOW] Erro ao buscar serviços da API municipal para E0312', {
          error: apiError?.message || apiError
        });
      }
      
      // Fallback: tentar allowlist do CNPJ
      try {
        const { getAllowedServicesForCNPJ } = await import('../nfse/cnae-guard.service');
        let cnpjParaAllowlist: string | null = null;
        
        try {
          const { createCertProvider } = await import('../../nfse/providers/cert-provider.factory');
          const { pfxToPem } = await import('../../nfse/crypto/pfx-utils');
          const { validateCertificate } = await import('../../nfse/crypto/pfx-utils');
          
          const certProvider = createCertProvider();
          const pfxBuffer = await certProvider.resolvePfx();
          const passphrase = await certProvider.getPassphrase();
          const { certificatePem } = pfxToPem(pfxBuffer, passphrase);
          const validation = validateCertificate(certificatePem);
          cnpjParaAllowlist = validation.doc || null;
        } catch (certError) {
          // Ignorar
        }
        
        if (cnpjParaAllowlist && cnpjParaAllowlist.length === 14) {
          const allowlist = await getAllowedServicesForCNPJ(
            cnpjParaAllowlist,
            codigoMunicipioE0312,
            competenciaE0312
          );
          
          if (allowlist.length > 0) {
            const servicosLista = allowlist.slice(0, 5).map(s => `${s.ctribnac} - ${s.descricao}`).join('\n');
            flowStates.set(phone, {
              ...state,
              state: 'waiting_descricao'
            });
            
            return {
              response: `❌ O código de serviço ${state.codigoTributacao || 'N/A'} não está habilitado no município de ${nomeMunicipioE0312} para a competência ${competenciaE0312}.\n\n✅ *Serviços habilitados disponíveis:*\n${servicosLista}\n\nPor favor, digite "emitir nota" novamente e selecione um serviço válido da lista acima.`,
              shouldContinue: true
            };
          }
        }
      } catch (allowlistError) {
        logger.warn('[NFSE FLOW] Erro ao buscar códigos válidos para E0312', {
          error: allowlistError
        });
      }
      
      // Fallback: mensagem genérica
      flowStates.set(phone, {
        ...state,
        state: 'waiting_descricao'
      });
      
      return {
        response: `❌ O código de serviço ${state.codigoTributacao || 'N/A'} não está habilitado no município de ${nomeMunicipioE0312} para a competência ${competenciaE0312}.\n\n⚠️ Este código funcionou anteriormente (08/11/2025), mas pode ter sido desabilitado pela API Nacional.\n\nPor favor, digite "emitir nota" novamente e selecione outro serviço da lista, ou entre em contato com o suporte.`,
        shouldContinue: true
      };
    }
    
    if (isE0310) {
      // Gerar competência (mês atual no formato YYYY-MM)
      const hoje = new Date();
      const competenciaE0310 = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
      
      // IMPORTANTE: Usar código do município do perfil do usuário (não São Paulo hardcoded)
      const codigoMunicipioE0310 = codigoMunicipioPadraoError;
      const nomeMunicipioE0310 = nomeMunicipioError;
      
      logger.error('[NFSE FLOW] Erro E0310: Código não administrado pelo município', {
        codigoTributacao: state.codigoTributacao,
        municipio: codigoMunicipioE0310,
        municipioNome: nomeMunicipioE0310,
        competencia: competenciaE0310
      });
      
      // Tentar buscar allowlist e sugerir códigos alternativos
      try {
        const { getAllowedServicesForCNPJ } = await import('../nfse/cnae-guard.service');
        let cnpjParaAllowlist: string | null = null;
        
        try {
          const { createCertProvider } = await import('../../nfse/providers/cert-provider.factory');
          const { pfxToPem } = await import('../../nfse/crypto/pfx-utils');
          const { validateCertificate } = await import('../../nfse/crypto/pfx-utils');
          
          const certProvider = createCertProvider();
          const pfxBuffer = await certProvider.resolvePfx();
          const passphrase = await certProvider.getPassphrase();
          const { certificatePem } = pfxToPem(pfxBuffer, passphrase);
          const validation = validateCertificate(certificatePem);
          cnpjParaAllowlist = validation.doc || null;
        } catch (certError) {
          // Ignorar
        }
        
        if (cnpjParaAllowlist && cnpjParaAllowlist.length === 14) {
          const allowlist = await getAllowedServicesForCNPJ(
            cnpjParaAllowlist,
            codigoMunicipioE0310,
            competenciaE0310
          );
          
          if (allowlist.length > 0) {
            const servicosLista = allowlist.slice(0, 5).map(s => `${s.ctribnac} - ${s.descricao}`).join('\n');
            flowStates.set(phone, {
              ...state,
              state: 'waiting_descricao'
            });
            
            return {
              response: `❌ O código de serviço selecionado (${state.codigoTributacao || 'N/A'}) não está habilitado no município de ${nomeMunicipioE0310} para a competência ${competenciaE0310}.\n\nServiços habilitados disponíveis:\n${servicosLista}\n\nPor favor, digite "emitir nota" novamente e selecione um serviço válido da lista acima.`,
              shouldContinue: true
            };
          }
        }
      } catch (allowlistError) {
        logger.warn('[NFSE FLOW] Erro ao buscar allowlist para E0310', {
          error: allowlistError
        });
      }
      
      // Fallback: mensagem genérica
      flowStates.set(phone, {
        ...state,
        state: 'waiting_descricao'
      });
      
      return {
        response: `❌ O código de serviço selecionado (${state.codigoTributacao || 'N/A'}) não está habilitado no município de ${nomeMunicipioE0310} para a competência ${competenciaE0310}.\n\nPor favor, digite "emitir nota" novamente e selecione outro serviço da lista, ou entre em contato com o suporte.`,
        shouldContinue: true
      };
    }
    
    // Tratamento específico para E999 (Erro não catalogado) com replay inteligente
    if (isE999) {
      // CHECKLIST: Replay inteligente para E999 - tentar novamente com novo nDPS/Id e dhEmi atualizado
      const retryCount = (state.e999RetryCount || 0) + 1;
      const maxE999Retries = 2; // Máximo 2 tentativas com replay
      
      if (retryCount <= maxE999Retries) {
        logger.warn('[NFSE FLOW] E999 detectado - tentando replay inteligente', {
          userId,
          phone,
          retryCount,
          maxE999Retries,
          municipio: nomeMunicipioError,
          codigoMunicipio: codigoMunicipioPadraoError
        });
        
        // Atualizar estado para retry
        flowStates.set(phone, {
          ...state,
          state: 'confirming_emissao',
          e999RetryCount: retryCount
        });
        
        // Tentar novamente com novo nDPS/Id e dhEmi atualizado
        // O número da DPS será gerado novamente automaticamente (timestamp muda)
        // O dhEmi será atualizado automaticamente (dataEmissao não especificada = agora)
        return await emitirNota(phone, {
          ...state,
          e999RetryCount: retryCount
        }, userId, userProfile);
      }
      
      // Se já tentou o máximo de vezes, informar o usuário
      logger.error('[NFSE FLOW] Erro E999: Erro não catalogado após replay inteligente', {
        userId,
        phone,
        retryCount,
        municipio: nomeMunicipioError,
        codigoMunicipio: codigoMunicipioPadraoError,
        errorResponse: error?.response?.data
      });
      
      flowStates.set(phone, {
        ...state,
        state: 'error',
        errorMessage: 'E999 - Erro não catalogado',
        e999RetryCount: 0 // Reset para próxima tentativa manual
      });
      
      return {
        response: `❌ Não foi possível emitir sua nota agora.\n\n⚠️ *Erro não catalogado (E999)*\n\nTentamos automaticamente ${retryCount} vez(es) com novos parâmetros, mas o erro persiste.\n\nPossíveis causas:\n• Prestador não cadastrado no Sistema Nacional NFS-e\n• Certificado digital não homologado para este ambiente\n• Problema na assinatura digital\n\n📋 *O que fazer:*\n1. Verifique se você fez o primeiro acesso no Portal Nacional NFS-e (https://www.nfse.gov.br/EmissorNacional)\n2. Verifique se seu certificado digital está válido e homologado\n3. Entre em contato com o suporte técnico\n\nDeseja tentar novamente?\n\n1️⃣ Sim\n2️⃣ Encerrar`,
        shouldContinue: true
      };
    }
    
    flowStates.set(phone, {
      ...state,
      state: 'error',
      errorMessage: errorMessage
    });
    
    return {
      response: `❌ Não foi possível emitir sua nota agora.\n\nMotivo: ${errorMessage}\n\nDeseja tentar novamente?\n\n1️⃣ Sim\n2️⃣ Encerrar`,
      shouldContinue: true
    };
  }
}

/**
 * Verifica se está em um fluxo ativo
 */
export function isInEmissionFlow(phone: string): boolean {
  const state = flowStates.get(phone);
  return state !== undefined && state.state !== 'idle' && state.state !== 'completed';
}

/**
 * Obtém o estado atual do fluxo
 */
export function getFlowState(phone: string): EmissionFlowData | null {
  return flowStates.get(phone) || null;
}

