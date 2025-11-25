// apps/backend/src/nfse/domain/lc116-labels.ts
// Rótulos dos subitens LC 116 para exibição no WhatsApp

import type { Lc116Subitem } from './cnae-map';

export const LC116_LABEL: Record<Lc116Subitem, string> = {
  // ===== LIMPEZA E CONSERVAÇÃO (07.xx) =====
  '07.10': 'Limpeza em prédios e escritórios',
  '07.10.01': 'Limpeza, manutenção e conservação de vias e logradouros públicos, imóveis',
  '07.11': 'Limpeza de salas comerciais e residenciais',
  '07.11.01': 'Limpeza de salas comerciais e residenciais (detalhado)',
  '07.12': 'Jardinagem e paisagismo',
  '07.13': 'Vigilância e segurança privada',
  
  // ===== SERVIÇOS DE BELEZA (06.xx) =====
  '06.01': 'Serviços de cabeleireiro/barbearia/manicure/pedicure',
  '06.02': 'Serviços de estética/depilação',
  
  // ===== TECNOLOGIA DA INFORMAÇÃO (01.xx) =====
  '01.01': 'Desenvolvimento de programas de computador sob encomenda',
  '01.02': 'Desenvolvimento e licenciamento de programas de computador customizados',
  '01.03': 'Processamento, armazenamento ou hospedagem de dados',
  '01.06': 'Assessoria e consultoria em informática',
  '01.07': 'Suporte técnico em tecnologia da informação',
  '01.08': 'Processamento de dados, provedores de serviços de aplicação e serviços de hospedagem na internet',
  
  // ===== MANUTENÇÃO E REPARAÇÃO (14.xx) =====
  '14.01': 'Manutenção e conservação de máquinas e equipamentos',
  '14.01.01': 'Manutenção e conservação de máquinas e equipamentos (detalhado)',
  
  // ===== CONSULTORIA E ASSESSORIA (17.xx) =====
  '17.01': 'Consultoria em tecnologia da informação',
  '17.02': 'Consultoria em gestão de tecnologia da informação',
  '17.06': 'Consultoria em publicidade',
  '17.11': 'Administração e gestão',
  '17.11.02': 'Fornecimento de alimentos preparados (bufê, confecção de bolos e salgadinhos)',
  '17.19': 'Atividades de contabilidade, escrituração, auditoria e consultoria tributária',
  '17.20': 'Assessoria e consultoria contábil e tributária',
  '17.24': 'Fornecimento de alimentos preparados',
  
  // ===== EDUCAÇÃO E TREINAMENTO (08.xx) =====
  '08.01': 'Ensino regular pré-escolar, fundamental, médio e superior',
  
  // ===== DESIGN E DECORAÇÃO (39.xx) =====
  '39.01': 'Design de interiores e decoração',
  
  // Adicione mais rótulos conforme expandir o SEED
};

/**
 * Retorna o rótulo legível para um subitem LC 116
 * @param subitem Subitem LC 116 (ex: '07.10')
 * @returns Rótulo legível ou fallback
 */
export function labelFor(subitem: Lc116Subitem): string {
  return LC116_LABEL[subitem] || `Serviço ${subitem}`;
}

/**
 * Converte subitem LC 116 para código de 6 dígitos usado na API
 * Exemplo: '07.10' -> '071000', '14.01.01' -> '140101'
 */
export function subitemToCodigoServico(subitem: Lc116Subitem): string {
  // Remove pontos e preenche com zeros à direita até 6 dígitos
  const digits = subitem.replace(/\./g, '');
  return digits.padEnd(6, '0');
}

/**
 * Converte código de serviço de 6 dígitos para subitem LC 116
 * Exemplo: '071000' -> '07.10', '140101' -> '14.01.01'
 */
export function codigoServicoToSubitem(codigo: string): Lc116Subitem {
  const digits = codigo.replace(/\D/g, '').padEnd(6, '0');
  
  // Formato 2-2-2 (ex: 14.01.01)
  if (digits.length >= 6 && digits.substring(2, 4) !== '00') {
    return `${digits.substring(0, 2)}.${digits.substring(2, 4)}.${digits.substring(4, 6)}`;
  }
  
  // Formato 2-2 (ex: 07.10)
  if (digits.length >= 4 && digits.substring(2, 4) !== '00') {
    return `${digits.substring(0, 2)}.${digits.substring(2, 4)}`;
  }
  
  // Formato 2 (ex: 07)
  return digits.substring(0, 2);
}

