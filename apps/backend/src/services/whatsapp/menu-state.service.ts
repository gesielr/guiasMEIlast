/**
 * Serviço de gerenciamento de estado de menus e submenus
 */

interface MenuState {
  menu: 'main' | 'relatorio_notas' | 'cancelar_nota';
  waitingFor?: 'cnpj_tomador' | 'numero_nota' | 'motivo_cancelamento' | 'confirmar_cancelamento' | 'data_inicial' | 'data_final';
  data?: {
    cnpjTomador?: string;
    numeroNota?: string;
    motivoCancelamento?: string;
    dataInicial?: Date;
    dataFinal?: Date;
    notaId?: string;
    notaStatus?: string;
    notaIdentificador?: string;
    notaValor?: number;
    tomadorNome?: string;
  };
}

// Cache de estados por telefone (em produção, usar Redis)
const menuStates = new Map<string, MenuState>();

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

  const newTimer = setTimeout(() => {
    clearMenuState(phone);
  }, MENU_TIMEOUT);

  menuTimers.set(phone, newTimer);
}

/**
 * Obter estado atual do menu
 */
export function getMenuState(phone: string): MenuState | null {
  return menuStates.get(phone) || null;
}

/**
 * Definir estado do menu
 */
export function setMenuState(phone: string, state: MenuState) {
  menuStates.set(phone, state);
  resetMenuTimer(phone);
}

/**
 * Limpar estado do menu
 */
export function clearMenu(phone: string) {
  clearMenuState(phone);
}

/**
 * Verificar se está em algum submenu
 */
export function isInSubmenu(phone: string): boolean {
  const state = menuStates.get(phone);
  return state !== undefined && state !== null && state.menu !== 'main';
}

/**
 * Mensagem de menu principal para MEI
 */
export function getMainMenuMessage(): string {
  return `*Escolha uma opção:*

1️⃣ Emitir Notas

2️⃣ Relatórios de Notas

3️⃣ Cancelar Nota

4️⃣ Relatórios de Notas Canceladas

_Digite o número da opção desejada._`;
}

/**
 * Mensagem de submenu de relatórios
 */
export function getRelatorioSubmenuMessage(): string {
  return `*📊 Relatório de NFS-e Emitidas*

Escolha o tipo de relatório:

1️⃣ Buscar pelo CNPJ do tomador

2️⃣ Buscar notas da última semana

3️⃣ Buscar notas do mês atual

4️⃣ Buscar por período (até 5 meses atrás)

0️⃣ Voltar ao menu principal

_Digite o número da opção desejada._`;
}

/**
 * Validar se mensagem é uma opção válida do menu principal
 */
export function isValidMainMenuOption(message: string): boolean {
  const normalized = message.toLowerCase().trim();
  return ['1', '2', '3', '4'].includes(normalized);
}

/**
 * Validar se mensagem é uma opção válida do submenu de relatórios
 */
export function isValidRelatorioSubmenuOption(message: string): boolean {
  const normalized = message.toLowerCase().trim();
  return ['0', '1', '2', '3', '4'].includes(normalized);
}

/**
 * Validar CNPJ básico (apenas formato)
 */
export function isValidCNPJ(cnpj: string): boolean {
  const cleaned = cnpj.replace(/\D/g, '');
  return cleaned.length === 14;
}

/**
 * Validar CPF básico (apenas formato)
 */
export function isValidCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, '');
  return cleaned.length === 11;
}

/**
 * Validar data no formato DD/MM/YYYY
 */
export function isValidDate(dateString: string): { valid: boolean; date?: Date; error?: string } {
  const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const match = dateString.match(regex);
  
  if (!match) {
    return { valid: false, error: 'Formato inválido. Use DD/MM/YYYY' };
  }
  
  const [, day, month, year] = match;
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  
  // Verificar se é uma data válida
  if (isNaN(date.getTime())) {
    return { valid: false, error: 'Data inválida' };
  }
  
  // Verificar se está dentro dos últimos 5 meses
  const today = new Date();
  const fiveMonthsAgo = new Date(today);
  fiveMonthsAgo.setMonth(today.getMonth() - 5);
  
  if (date < fiveMonthsAgo) {
    return { 
      valid: false, 
      error: 'Data muito antiga. Permitido apenas até 5 meses atrás.' 
    };
  }
  
  if (date > today) {
    return { valid: false, error: 'Data não pode ser no futuro' };
  }
  
  return { valid: true, date };
}

/**
 * Mensagem de erro para opção inválida
 */
export function getInvalidOptionMessage(): string {
  return '❌ *Opção inválida*\n\n_Escolha as opções do menu acima._';
}

