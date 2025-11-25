// Serviço para gerenciar o fluxo conversacional de emissão de GPS (INSS) via WhatsApp para autônomos
import { createSupabaseClients } from '../../../services/supabase';
import logger from '../../utils/logger';
import { getCertWhatsappService } from './cert-whatsapp.service';
import { env } from '../../env';
import axios from 'axios';

const { admin } = createSupabaseClients();

// URL da API Python (INSS)
const INSS_API_URL = env.INSS_API_URL;

export type GpsFlowState =
  | 'idle'
  | 'waiting_valor_base'
  | 'waiting_competencia'
  | 'waiting_plano'
  | 'confirming_emissao'
  | 'emitting'
  | 'completed'
  | 'error';

export interface GpsFlowData {
  state: GpsFlowState;
  valorBase?: number;
  competencia?: string; // Formato: MM/YYYY
  plano?: 'normal' | 'simplificado';
  tipoContribuinte?: 'autonomo' | 'autonomo_simplificado';
  errorMessage?: string;
}

// Cache de estados por telefone (em produção, usar Redis ou banco)
const flowStates = new Map<string, GpsFlowData>();

// Timeout de 10 minutos de inatividade
const FLOW_TIMEOUT = 10 * 60 * 1000;
const flowTimers = new Map<string, NodeJS.Timeout>();

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
    logger.info(`[GPS FLOW] Timeout de inatividade para ${phone}`);
    clearFlowState(phone);
  }, FLOW_TIMEOUT);

  flowTimers.set(phone, timer);
}

/**
 * Valida valor numérico
 * Aceita formatos: 2000, 2.000,00, 2000,00, 2.000
 * Rejeita: letras, valores abaixo do mínimo, valores acima do teto
 */
function validarValor(valor: string): { valid: boolean; valor?: number; error?: string } {
  // Remover espaços
  const trimmed = valor.trim();

  // Verificar se contém apenas números, pontos e vírgulas
  if (!/^[\d.,]+$/.test(trimmed)) {
    return { valid: false, error: 'Valor inválido. Digite apenas números (ex: 2000 ou 2.000,00)' };
  }

  // Detectar formato brasileiro (ponto para milhar, vírgula para decimal)
  // Ex: 2.000,00 ou 2000,00
  let cleaned: string;
  if (trimmed.includes(',') && trimmed.includes('.')) {
    // Formato brasileiro: 2.000,00
    cleaned = trimmed.replace(/\./g, '').replace(',', '.');
  } else if (trimmed.includes(',')) {
    // Apenas vírgula: 2000,00
    cleaned = trimmed.replace(',', '.');
  } else if (trimmed.includes('.')) {
    // Verificar se é formato brasileiro (milhar) ou decimal
    const parts = trimmed.split('.');
    if (parts.length === 2 && parts[1].length <= 2) {
      // Provavelmente decimal: 2000.50
      cleaned = trimmed;
    } else {
      // Provavelmente milhar brasileiro: 2.000 (sem vírgula)
      cleaned = trimmed.replace(/\./g, '');
    }
  } else {
    // Apenas números: 2000
    cleaned = trimmed;
  }

  const num = parseFloat(cleaned);

  if (isNaN(num) || num <= 0) {
    return { valid: false, error: 'Valor inválido. Digite um número positivo (ex: 2000 ou 2.000,00)' };
  }

  // Validar mínimo (salário mínimo)
  const salarioMinimo = 1518.00; // 2025
  if (num < salarioMinimo) {
    return {
      valid: false,
      error: `Valor mínimo é R$ ${salarioMinimo.toFixed(2)} (salário mínimo). O valor informado será ajustado para o mínimo.`
    };
  }

  // Validar máximo (teto INSS)
  const tetoInss = 8157.41; // 2025
  if (num > tetoInss) {
    return {
      valid: false,
      error: `Valor máximo é R$ ${tetoInss.toFixed(2)} (teto do INSS). O valor informado será ajustado para o teto.`
    };
  }

  return { valid: true, valor: num };
}

/**
 * Valida competência (mês/ano)
 */
function validarCompetencia(competencia: string): { valid: boolean; competencia?: string; error?: string } {
  // Aceitar formatos: MM/YYYY, MM-YYYY, MM YYYY
  const cleaned = competencia.trim();

  // Padrão: MM/YYYY ou MM-YYYY
  const pattern1 = /^(\d{1,2})[\/\-](\d{4})$/;
  const match1 = cleaned.match(pattern1);

  if (match1) {
    const mes = parseInt(match1[1]);
    const ano = parseInt(match1[2]);

    if (mes < 1 || mes > 12) {
      return { valid: false, error: 'Mês inválido. Use um valor entre 01 e 12.' };
    }

    if (ano < 2020 || ano > 2100) {
      return { valid: false, error: 'Ano inválido. Use um ano entre 2020 e 2100.' };
    }

    return { valid: true, competencia: `${mes.toString().padStart(2, '0')}/${ano}` };
  }

  // Padrão: MM YYYY (sem separador)
  const pattern2 = /^(\d{1,2})\s+(\d{4})$/;
  const match2 = cleaned.match(pattern2);

  if (match2) {
    const mes = parseInt(match2[1]);
    const ano = parseInt(match2[2]);

    if (mes < 1 || mes > 12) {
      return { valid: false, error: 'Mês inválido. Use um valor entre 01 e 12.' };
    }

    if (ano < 2020 || ano > 2100) {
      return { valid: false, error: 'Ano inválido. Use um ano entre 2020 e 2100.' };
    }

    return { valid: true, competencia: `${mes.toString().padStart(2, '0')}/${ano}` };
  }

  // Se não encontrou padrão, tentar usar mês/ano atual
  const now = new Date();
  const mesAtual = now.getMonth() + 1;
  const anoAtual = now.getFullYear();

  // Se digitou apenas números, assumir que é o mês
  const apenasNumeros = /^\d{1,2}$/.test(cleaned);
  if (apenasNumeros) {
    const mes = parseInt(cleaned);
    if (mes >= 1 && mes <= 12) {
      return { valid: true, competencia: `${mes.toString().padStart(2, '0')}/${anoAtual}` };
    }
  }

  return { valid: false, error: 'Formato inválido. Use MM/YYYY (ex: 11/2025).' };
}

/**
 * Verifica se está em fluxo de GPS
 */
export function isInGpsFlow(phone: string): boolean {
  const state = flowStates.get(phone);
  return state !== undefined && state.state !== 'idle' && state.state !== 'completed' && state.state !== 'error';
}

/**
 * Processa mensagem no fluxo de emissão de GPS
 */
export async function processarFluxoGps(
  phone: string,
  message: string,
  userId: string,
  userProfile: any
): Promise<{ response: string; shouldContinue: boolean; pdfUrl?: string; emissaoConcluida?: boolean; linhaDigitavel?: string }> {
  resetFlowTimer(phone);

  const state = flowStates.get(phone) || { state: 'idle' };
  const normalized = message.toLowerCase().trim();

  logger.info('[GPS FLOW] Processando mensagem', {
    phone,
    message: message.substring(0, 50),
    normalized,
    currentState: state.state,
    hasState: !!flowStates.get(phone)
  });

  // Se usuário pedir para cancelar ou sair
  if (normalized.includes('cancelar') || normalized.includes('sair') || normalized.includes('voltar')) {
    if (state.state !== 'idle') {
      clearFlowState(phone);
      return {
        response: 'Emissão de GPS cancelada. Como posso ajudar?',
        shouldContinue: false
      };
    }
  }

  // Iniciar fluxo se usuário pedir "emitir guia" ou "emitir gps" OU escolher opção "1" do menu
  // IMPORTANTE: Se já está em estado de erro, reiniciar o fluxo
  // NOTA: Não verificar 'normalized === "2"' aqui, pois quando o usuário está em waiting_plano,
  // o "2" deve ser processado no case apropriado, não aqui
  if (normalized.includes('emitir guia') ||
    normalized.includes('emitir gps') ||
    normalized.includes('quero emitir guia') ||
    normalized.includes('quero emitir gps') ||
    (normalized === '1' && state.state === 'idle')) {
    // Se está idle ou em erro, iniciar novo fluxo
    if (state.state === 'idle' || state.state === 'error' || state.state === 'completed') {
      clearFlowState(phone); // Limpar estado anterior
      flowStates.set(phone, { state: 'waiting_valor_base' });
      return {
        response: '💰 *Emissão de Guia GPS (INSS)*\n\n' +
          'Vamos começar!\n\n' +
          '1️⃣ Qual foi sua renda bruta do mês?\n\n' +
          '_Digite o valor (ex: 2000 ou 2000,00)_',
        shouldContinue: true
      };
    }
    // Se já está em fluxo, informar que precisa continuar
    return {
      response: 'Você já está em um fluxo de emissão. Continue respondendo às perguntas ou digite "cancelar" para começar novamente.',
      shouldContinue: true
    };
  }

  // Processar de acordo com o estado atual
  switch (state.state) {
    case 'idle': {
      // Se está idle e usuário escolheu opção 1, iniciar fluxo
      if (normalized === '1') {
        clearFlowState(phone);
        flowStates.set(phone, { state: 'waiting_valor_base' });
        return {
          response: '💰 *Emissão de Guia GPS (INSS)*\n\n' +
            'Vamos começar!\n\n' +
            '1️⃣ Qual foi sua renda bruta do mês?\n\n' +
            '_Digite o valor (ex: 2000 ou 2000,00)_',
          shouldContinue: true
        };
      }
      // Se não for opção 1, retornar mensagem padrão
      return {
        response: 'Por favor, escolha uma opção do menu ou digite "emitir guia" para começar.',
        shouldContinue: false
      };
    }

    case 'waiting_valor_base': {
      const validacao = validarValor(message);

      if (!validacao.valid) {
        return {
          response: `❌ ${validacao.error}\n\n` +
            'Formatos aceitos: 2000, 2.000,00, 2000,00\n' +
            'Valor mínimo: R$ 1.518,00\n' +
            'Valor máximo: R$ 8.157,41',
          shouldContinue: true
        };
      }

      const valor = validacao.valor!;

      // Ajustar para mínimo se necessário
      const salarioMinimo = 1518.00; // 2025
      const valorFinal = Math.max(salarioMinimo, Math.min(valor, 8157.41));

      // Se foi ajustado, informar ao usuário
      let mensagemAjuste = '';
      if (valor < salarioMinimo) {
        mensagemAjuste = `\n⚠️ Valor ajustado para o mínimo: R$ ${salarioMinimo.toFixed(2)}\n`;
      } else if (valor > 8157.41) {
        mensagemAjuste = `\n⚠️ Valor ajustado para o teto: R$ 8157.41\n`;
      }

      // Salvar valor e pedir competência
      flowStates.set(phone, {
        ...state,
        state: 'waiting_competencia',
        valorBase: valorFinal
      });

      const now = new Date();
      const mesAtual = (now.getMonth() + 1).toString().padStart(2, '0');
      const anoAtual = now.getFullYear();

      return {
        response: `✅ Valor registrado: R$ ${valorFinal.toFixed(2)}${mensagemAjuste}\n\n` +
          '2️⃣ Qual a competência (mês/ano) da guia?\n\n' +
          `_Digite no formato MM/YYYY (ex: ${mesAtual}/${anoAtual})_\n` +
          '_Ou digite "atual" para usar o mês atual._',
        shouldContinue: true
      };
    }

    case 'waiting_competencia': {
      // Se digitou "atual", usar mês atual
      if (normalized === 'atual' || normalized.includes('mês atual') || normalized.includes('mes atual')) {
        const now = new Date();
        const mesAtual = (now.getMonth() + 1).toString().padStart(2, '0');
        const anoAtual = now.getFullYear();
        const competencia = `${mesAtual}/${anoAtual}`;

        flowStates.set(phone, {
          ...state,
          state: 'waiting_plano',
          competencia
        });

        return {
          response: `✅ Competência: ${competencia}\n\n` +
            '3️⃣ Qual o tipo de contribuição?\n\n' +
            '1️⃣ Normal (20%)\n' +
            '2️⃣ Simplificado (11%)\n\n' +
            '_Digite 1 ou 2_',
          shouldContinue: true
        };
      }

      const competenciaValidada = validarCompetencia(message);

      if (!competenciaValidada.valid) {
        return {
          response: `❌ ${competenciaValidada.error}\n\n` +
            'Por favor, digite no formato MM/YYYY (ex: 11/2025)',
          shouldContinue: true
        };
      }

      flowStates.set(phone, {
        ...state,
        state: 'waiting_plano',
        competencia: competenciaValidada.competencia
      });

      return {
        response: `✅ Competência: ${competenciaValidada.competencia}\n\n` +
          '3️⃣ Qual o tipo de contribuição?\n\n' +
          '1️⃣ Normal (20%)\n' +
          '2️⃣ Simplificado (11%)\n\n' +
          '_Digite 1 ou 2_',
        shouldContinue: true
      };
    }

    case 'waiting_plano': {
      let plano: 'normal' | 'simplificado' | null = null;
      let tipoContribuinte: 'autonomo' | 'autonomo_simplificado' | null = null;

      if (normalized === '1' || normalized.includes('normal')) {
        plano = 'normal';
        tipoContribuinte = 'autonomo';
      } else if (normalized === '2' || normalized.includes('simplificado')) {
        plano = 'simplificado';
        tipoContribuinte = 'autonomo_simplificado';
      } else {
        return {
          response: '❌ Opção inválida.\n\n' +
            'Por favor, digite:\n' +
            '1️⃣ para Normal (20%)\n' +
            '2️⃣ para Simplificado (11%)',
          shouldContinue: true
        };
      }

      // Calcular valor estimado para confirmação
      const valorBase = state.valorBase!;
      const competencia = state.competencia!;

      // Calcular valor estimado (aproximado)
      const salarioMinimo = 1518.00;
      const baseCalculo = Math.max(salarioMinimo, Math.min(valorBase, 8157.41));
      const aliquota = plano === 'normal' ? 0.20 : 0.11;
      const valorEstimado = baseCalculo * aliquota;

      flowStates.set(phone, {
        ...state,
        state: 'confirming_emissao',
        plano,
        tipoContribuinte
      });

      return {
        response: `📋 *Confirmação de Emissão*\n\n` +
          `💰 Valor base: R$ ${valorBase.toFixed(2)}\n` +
          `📅 Competência: ${competencia}\n` +
          `📊 Tipo: ${plano === 'normal' ? 'Normal (20%)' : 'Simplificado (11%)'}\n` +
          `💵 Valor estimado: R$ ${valorEstimado.toFixed(2)}\n\n` +
          'Confirma a emissão? (sim/não)',
        shouldContinue: true
      };
    }

    case 'confirming_emissao': {
      if (normalized.includes('não') || normalized.includes('nao') || normalized.includes('n')) {
        clearFlowState(phone);
        return {
          response: 'Emissão cancelada. Como posso ajudar?',
          shouldContinue: false
        };
      }

      if (!normalized.includes('sim') && !normalized.includes('s') && normalized !== '1') {
        return {
          response: 'Por favor, confirme digitando "sim" ou "não":',
          shouldContinue: true
        };
      }

      // Confirmado - emitir GPS
      flowStates.set(phone, { ...state, state: 'emitting' });

      try {
        const resultado = await emitirGps(
          phone,
          state.valorBase!,
          state.competencia!,
          state.tipoContribuinte!,
          state.plano!,
          userId,
          userProfile
        );

        // Marcar como concluído
        flowStates.set(phone, { ...state, state: 'completed' });

        // Limpar estado após 5 segundos
        setTimeout(() => {
          clearFlowState(phone);
        }, 5000);

        return {
          response: resultado.response,
          shouldContinue: false,
          pdfUrl: resultado.pdfUrl,
          emissaoConcluida: true,
          linhaDigitavel: resultado.linhaDigitavel
        };
      } catch (error: any) {
        logger.error('[GPS FLOW] Erro ao emitir GPS', { error, phone, errorMessage: error.message });

        // Limpar estado de erro e reiniciar fluxo automaticamente
        clearFlowState(phone);

        // Extrair mensagem de erro mais amigável
        let mensagemErro = 'Erro desconhecido';
        if (error.response?.data?.detail) {
          mensagemErro = error.response.data.detail;
        } else if (error.message) {
          mensagemErro = error.message;
        }

        // Mensagem amigável explicando o erro e oferecendo reiniciar
        return {
          response: '❌ *Ops! Ocorreu um erro ao emitir sua guia GPS.*\n\n' +
            `🔍 _Detalhes técnicos: ${mensagemErro.substring(0, 100)}_\n\n` +
            '💡 *O que aconteceu?*\n' +
            'Não conseguimos processar sua guia no momento. Isso pode acontecer por:\n' +
            '• Problema temporário no servidor\n' +
            '• Dados inválidos ou incompletos\n' +
            '• Problema de conexão\n\n' +
            '✅ *Vamos tentar novamente?*\n\n' +
            '💰 *Emissão de Guia GPS (INSS)*\n\n' +
            '1️⃣ Qual foi sua renda bruta do mês?\n\n' +
            '_Digite o valor (ex: 2000 ou 2000,00)_',
          shouldContinue: true
        };
      }
    }

    case 'emitting': {
      // GPS está sendo emitida - aguardar conclusão
      // Se receber mensagem durante emissão, informar que está processando
      return {
        response: '⏳ *Processando sua guia GPS...*\n\n' +
          'Por favor, aguarde alguns instantes. Você receberá a guia em breve.',
        shouldContinue: false
      };
    }

    case 'completed': {
      // GPS já foi emitida - não reiniciar automaticamente
      // Se usuário enviar mensagem após conclusão, apenas informar
      return {
        response: '✅ *Sua guia GPS já foi emitida!*\n\n' +
          'Se você não recebeu o PDF, verifique sua conexão ou entre em contato com o suporte.\n\n' +
          'Para emitir uma nova guia, digite "emitir guia" ou escolha uma opção do menu.',
        shouldContinue: false
      };
    }

    case 'error': {
      // Se está em erro, oferecer reiniciar
      clearFlowState(phone);
      return {
        response: '❌ Ocorreu um erro no fluxo anterior.\n\n' +
          'Vamos começar novamente?\n\n' +
          '💰 *Emissão de Guia GPS (INSS)*\n\n' +
          '1️⃣ Qual foi sua renda bruta do mês?\n\n' +
          '_Digite o valor (ex: 2000 ou 2000,00)_',
        shouldContinue: true
      };
    }

    default: {
      // Estado inválido - verificar se é um estado conhecido mas não tratado
      const estadosConhecidos = ['idle', 'waiting_valor_base', 'waiting_competencia', 'waiting_plano',
        'confirming_emissao', 'emitting', 'completed', 'error'];

      if (!estadosConhecidos.includes(state.state)) {
        logger.warn('[GPS FLOW] Estado inválido detectado, reiniciando fluxo', {
          phone,
          currentState: state.state,
          message: message.substring(0, 50)
        });
        clearFlowState(phone);
        flowStates.set(phone, { state: 'waiting_valor_base' });
        return {
          response: '💰 *Emissão de Guia GPS (INSS)*\n\n' +
            'Vamos começar!\n\n' +
            '1️⃣ Qual foi sua renda bruta do mês?\n\n' +
            '_Digite o valor (ex: 2000 ou 2000,00)_',
          shouldContinue: true
        };
      }

      // Estado conhecido mas não tratado - manter estado atual
      return {
        response: 'Por favor, aguarde enquanto processamos sua solicitação...',
        shouldContinue: true
      };
    }
  }
}

/**
 * Emite GPS chamando a API Python
 */
async function emitirGps(
  phone: string,
  valorBase: number,
  competencia: string,
  tipoContribuinte: 'autonomo' | 'autonomo_simplificado',
  plano: 'normal' | 'simplificado',
  userId: string,
  userProfile: any
): Promise<{ response: string; pdfUrl?: string; linhaDigitavel?: string }> {
  logger.info('[GPS FLOW] Emitindo GPS via API Python', {
    phone,
    valorBase,
    competencia,
    tipoContribuinte,
    plano
  });

  const payload = {
    whatsapp: phone,
    tipo_contribuinte: tipoContribuinte,
    valor_base: valorBase,
    plano: plano,
    competencia: competencia
  };

  logger.info('[GPS FLOW] Payload a ser enviado (JSON):', JSON.stringify(payload, null, 2));

  try {
    const response = await axios.post(
      `${INSS_API_URL}/api/v1/guias/emitir`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    if (response.status !== 200) {
      throw new Error(`API retornou status ${response.status}`);
    }

    const data = response.data;

    // Extrair informações da resposta
    const guia = data.guia || {};
    const codigoGps = guia.inss_code || guia.codigo_gps || 'N/A';
    const valor = guia.value || guia.valor || 0;
    const whatsappResult = data.whatsapp || {};

    // Verificar se PDF foi enviado via WhatsApp pela API Python
    const pdfEnviadoPelaAPI = whatsappResult.status === 'mock' || whatsappResult.sid;

    // Obter URL do PDF - tentar múltiplas fontes
    let pdfUrl: string | undefined = data.guia?.pdf_url ||
      data.guia?.media_url ||
      whatsappResult.media_url;

    // Se não encontrou URL, tentar obter do storage Supabase usando o ID da guia
    if (!pdfUrl && data.guia?.id) {
      // Tentar construir URL do Supabase Storage
      // Formato: https://{project}.supabase.co/storage/v1/object/public/guias/{id}.pdf
      logger.info('[GPS FLOW] Tentando construir URL do PDF do Supabase', {
        phone,
        guiaId: data.guia.id
      });
    }

    // Obter linha digitável da resposta
    const linhaDigitavel = data.guia?.linha_digitavel || data.guia?.linhaDigitavel;

    // Log do resultado
    if (pdfUrl) {
      logger.info('[GPS FLOW] PDF disponível, será enviado via backend', {
        phone,
        pdfUrl: pdfUrl.substring(0, 100),
        pdfEnviadoPelaAPI,
        temLinhaDigitavel: !!linhaDigitavel,
        fonte: data.guia?.pdf_url ? 'guia.pdf_url' :
          whatsappResult.media_url ? 'whatsapp.media_url' : 'outro'
      });
    } else {
      logger.warn('[GPS FLOW] PDF não disponível na resposta da API', {
        phone,
        guia: data.guia,
        whatsappResult,
        temGuia: !!data.guia,
        temWhatsappResult: !!whatsappResult
      });
    }

    return {
      response: `✅ *Guia GPS emitida com sucesso!*\n\n` +
        `📋 Código GPS: ${codigoGps}\n` +
        `💰 Valor: R$ ${valor.toFixed(2)}\n` +
        `📅 Competência: ${competencia}\n\n` +
        (linhaDigitavel
          ? `💳 *Linha Digitável:*\n\`${linhaDigitavel}\`\n\n` +
          '_Copie a linha acima para pagar no banco/app_\n\n'
          : '') +
        (pdfUrl && pdfUrl !== 'mock-url'
          ? '📄 O PDF da guia será enviado em seguida.\n\n'
          : '\n') +
        '✨ *Obrigado por usar o Guias MEI!*\n' +
        '🚀 Emissão rápida e automática para seu INSS',
      pdfUrl: pdfUrl && pdfUrl !== 'mock-url' ? pdfUrl : undefined,
      linhaDigitavel: linhaDigitavel
    };
  } catch (error: any) {
    logger.error('[GPS FLOW] Erro ao chamar API Python', {
      error: error.message,
      stack: error.stack,
      phone
    });

    if (error.response) {
      // Erro da API
      const errorMessage = error.response.data?.detail || error.response.data?.error || error.message;
      throw new Error(`Erro na API: ${errorMessage}`);
    } else if (error.request) {
      // Erro de conexão
      throw new Error('Não foi possível conectar com o servidor de GPS. Verifique se o servidor está rodando.');
    } else {
      // Outro erro
      throw new Error(error.message || 'Erro desconhecido ao emitir GPS');
    }
  }
}

/**
 * Limpa o estado do fluxo (útil para testes ou reset manual)
 */
export function clearGpsFlowState(phone: string) {
  clearFlowState(phone);
}

