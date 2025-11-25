// Serviço para gerenciar menu duplo para usuários MEI+Autônomo
import { createSupabaseClients } from '../../../services/supabase';
import logger from '../../utils/logger';

const { admin } = createSupabaseClients();

/**
 * Normaliza número de telefone removendo caracteres especiais e aplicando regras consistentes
 * Retorna apenas dígitos, garantindo formato unificado para comparação
 * EXPORTADA para uso em outros serviços (ai-agent, etc)
 */
export function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return '';

  // Remover todos os caracteres não-numéricos
  let digits = phone.replace(/\D+/g, '');

  // Remover prefixo 55 se presente
  if (digits.startsWith('55')) {
    digits = digits.substring(2);
  }

  // Garantir que tem 11 dígitos (DDD + 9 dígitos)
  // Se tem 10 dígitos, adicionar 9 após o DDD (posição 2)
  if (digits.length === 10) {
    digits = digits.substring(0, 2) + '9' + digits.substring(2);
  }

  // Retornar com prefixo 55 para formato padrão
  return '55' + digits;
}

export type DualMenuState = 
  | 'idle'
  | 'showing_menu'
  | 'chose_nfse'
  | 'chose_gps';

interface DualMenuData {
  state: DualMenuState;
  lastChoice?: 'nfse' | 'gps';
  timestamp: number;
}

// Cache de estados do menu duplo por telefone
const menuStates = new Map<string, DualMenuData>();

// Timeout de 5 minutos de inatividade
const MENU_TIMEOUT = 5 * 60 * 1000;
const menuTimers = new Map<string, NodeJS.Timeout>();

/**
 * Limpa o estado do menu após timeout
 */
function clearMenuState(phone: string) {
  menuStates.delete(phone);
  const timer = menuTimers.get(phone);
  if (timer) {
    clearTimeout(timer);
    menuTimers.delete(phone);
  }
}

/**
 * Reseta o timer de inatividade
 */
function resetMenuTimer(phone: string) {
  const existingTimer = menuTimers.get(phone);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }
  
  const timer = setTimeout(() => {
    logger.info(`[DUAL MENU] Timeout de inatividade para ${phone}`);
    clearMenuState(phone);
  }, MENU_TIMEOUT);
  
  menuTimers.set(phone, timer);
}

/**
 * Verifica se usuário é MEI+Autônomo
 * Um usuário é considerado duplo se:
 * 1. ✅ NOVO: Tem perfis com diferentes user_type no mesmo telefone (MEI e Autônomo), OU
 * 2. Tem user_type = 'mei' E tem emissões de GPS, OU
 * 3. Tem user_type = 'autonomo' E tem emissões de NFS-e, OU
 * 4. Tem ambos os tipos de emissões independente do user_type
 */
export async function isDualUser(userId: string, userType: string | null): Promise<boolean> {
  try {
    // ✅ NOVO: Verificar se há perfis com diferentes user_type no mesmo telefone
    // Buscar telefone do usuário atual
    const { data: currentProfile, error: profileError } = await admin
      .from('profiles')
      .select('whatsapp_phone')
      .eq('id', userId)
      .maybeSingle();
    
    if (!profileError && currentProfile?.whatsapp_phone) {
      // Normalizar telefone do perfil atual
      const normalizedCurrentPhone = normalizePhone(currentProfile.whatsapp_phone);

      // Buscar TODOS os perfis para comparar telefones normalizados
      const { data: allProfiles, error: profilesError } = await admin
        .from('profiles')
        .select('user_type, id, whatsapp_phone');

      if (!profilesError && allProfiles) {
        // Filtrar perfis que têm o mesmo telefone normalizado
        const profilesWithSamePhone = allProfiles.filter(p => {
          const normalizedPhone = normalizePhone(p.whatsapp_phone);
          return normalizedPhone === normalizedCurrentPhone;
        });

        if (profilesWithSamePhone.length > 1) {
          // Verificar se tem perfis com user_type diferentes
          const userTypes = new Set(profilesWithSamePhone.map(p => p.user_type).filter(Boolean));
          const hasMei = userTypes.has('mei');
          const hasAutonomo = userTypes.has('autonomo');

          if (hasMei && hasAutonomo) {
            logger.info(`[DUAL MENU] Usuário ${userId} é duplo (tem perfis MEI e Autônomo no mesmo telefone)`, {
              normalizedPhone: normalizedCurrentPhone,
              profilesFound: profilesWithSamePhone.map(p => ({ id: p.id, type: p.user_type, phone: p.whatsapp_phone }))
            });
            return true;
          }
        }
      }
    }
    
    // Verificar se tem emissões de NFS-e
    const { data: nfseEmissions, error: nfseError } = await admin
      .from('nfse_emissions')
      .select('id')
      .eq('user_id', userId)
      .limit(1);
    
    // Verificar se tem emissões de GPS
    const { data: gpsEmissions, error: gpsError } = await admin
      .from('gps_emissions')
      .select('id')
      .eq('user_id', userId)
      .limit(1);
    
    const hasNfse = !nfseError && nfseEmissions && nfseEmissions.length > 0;
    const hasGps = !gpsError && gpsEmissions && gpsEmissions.length > 0;
    
    // Se tem ambos os tipos de emissões, é usuário duplo
    if (hasNfse && hasGps) {
      logger.info(`[DUAL MENU] Usuário ${userId} é duplo (tem NFS-e e GPS)`);
      return true;
    }
    
    // Se é MEI mas tem GPS, é duplo
    if (userType === 'mei' && hasGps) {
      logger.info(`[DUAL MENU] Usuário ${userId} é MEI mas tem GPS - considerado duplo`);
      return true;
    }
    
    // Se é Autônomo mas tem NFS-e, é duplo
    if (userType === 'autonomo' && hasNfse) {
      logger.info(`[DUAL MENU] Usuário ${userId} é Autônomo mas tem NFS-e - considerado duplo`);
      return true;
    }
    
    return false;
  } catch (error) {
    logger.error(`[DUAL MENU] Erro ao verificar se usuário é duplo: ${error}`);
    return false;
  }
}

/**
 * Obtém mensagem do menu duplo
 * ✅ SEMPRE usar nome do autônomo (CPF) quando fornecido
 */
export function getDualMenuMessage(userName?: string): string {
  // Se não forneceu nome, usar "usuário" genérico
  const saudacao = userName ? `Olá *${userName}*` : 'Olá';
  
  return `${saudacao}! 👋\n\n` +
         `Você pode emitir tanto *Notas Fiscais* quanto *Guias de INSS*.\n\n` +
         `*Escolha uma opção:*\n\n` +
         `1️⃣ Emitir Notas (NFS-e)\n\n` +
         `2️⃣ Emitir Guia de INSS (GPS)\n\n` +
         `_Digite o número da opção desejada._`;
}

/**
 * Verifica se está mostrando menu duplo
 */
export function isShowingDualMenu(phone: string): boolean {
  const state = menuStates.get(phone);
  return state !== undefined && state.state === 'showing_menu';
}

/**
 * Verifica se escolheu uma opção do menu duplo
 */
export function getDualMenuChoice(phone: string): 'nfse' | 'gps' | null {
  const state = menuStates.get(phone);
  if (state && (state.state === 'chose_nfse' || state.state === 'chose_gps')) {
    return state.lastChoice || null;
  }
  return null;
}

/**
 * Processa escolha do menu duplo
 */
export function processDualMenuChoice(phone: string, message: string): { 
  valid: boolean; 
  choice?: 'nfse' | 'gps'; 
  response?: string;
  shouldShowMenu?: boolean;
} {
  const normalized = message.toLowerCase().trim();
  
  // Verificar se está mostrando menu
  const state = menuStates.get(phone);
  if (!state || state.state !== 'showing_menu') {
    return { valid: false };
  }
  
  resetMenuTimer(phone);
  
  // Opção 1: NFS-e
  if (normalized === '1' || normalized.includes('nota') || normalized.includes('nfse') || normalized.includes('emitir nota')) {
    menuStates.set(phone, {
      state: 'chose_nfse',
      lastChoice: 'nfse',
      timestamp: Date.now()
    });
    
    // Limpar após 5 segundos
    setTimeout(() => {
      clearMenuState(phone);
    }, 5000);
    
    return {
      valid: true,
      choice: 'nfse',
      response: '✅ Você escolheu *Emitir Notas (NFS-e)*\n\nVamos começar!'
    };
  }
  
  // Opção 2: GPS
  if (normalized === '2' || normalized.includes('guia') || normalized.includes('gps') || normalized.includes('inss') || normalized.includes('emitir guia')) {
    menuStates.set(phone, {
      state: 'chose_gps',
      lastChoice: 'gps',
      timestamp: Date.now()
    });
    
    // Limpar após 5 segundos
    setTimeout(() => {
      clearMenuState(phone);
    }, 5000);
    
    return {
      valid: true,
      choice: 'gps',
      response: '✅ Você escolheu *Emitir Guia de INSS (GPS)*\n\nVamos começar!'
    };
  }
  
  // Opção inválida - mostrar menu novamente (sem mensagem de erro)
  return {
    valid: false,
    response: getDualMenuMessage(), // Mostrar menu sem "Opção inválida"
    shouldShowMenu: true
  };
}

/**
 * Define que está mostrando menu duplo
 */
export function setShowingDualMenu(phone: string, userName?: string) {
  menuStates.set(phone, {
    state: 'showing_menu',
    timestamp: Date.now()
  });
  resetMenuTimer(phone);
}

/**
 * Limpa estado do menu duplo
 */
export function clearDualMenu(phone: string) {
  clearMenuState(phone);
}

/**
 * Verifica se deve mostrar menu duplo
 * Mostra se:
 * - É usuário duplo (tem ambos os tipos de emissões)
 * - Não está em nenhum fluxo ativo
 * - Não escolheu uma opção recentemente
 */
export function shouldShowDualMenu(phone: string): boolean {
  const state = menuStates.get(phone);
  
  // Se já escolheu uma opção recentemente, não mostrar menu
  if (state && (state.state === 'chose_nfse' || state.state === 'chose_gps')) {
    const timeSinceChoice = Date.now() - state.timestamp;
    // Se escolheu há menos de 30 segundos, não mostrar menu novamente
    if (timeSinceChoice < 30000) {
      return false;
    }
  }
  
  // Se está mostrando menu, não mostrar novamente
  if (state && state.state === 'showing_menu') {
    return false;
  }
  
  return true;
}

