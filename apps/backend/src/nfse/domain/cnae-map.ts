// apps/backend/src/nfse/domain/cnae-map.ts
// Mapeamento CNAE → LC 116 (subitens)

export type Lc116Subitem = string; // ex.: '06.01', '07.10', '14.01.01' (padronize 2-2 ou 2-2-2 conforme sua base)
export type CnaeRaw = string;       // ex.: '8121-4/00', '9602-5/01'

/**
 * Normaliza CNAE (mantém só dígitos)
 * Exemplo: '8121-4/00' -> '8121400'
 */
export const normalizeCnae = (raw: CnaeRaw): string => {
  return raw.replace(/[^0-9]/g, '');
};

/**
 * Mapa SEED (prioridade pela ordem do array)
 * Regra: até 2 subitens por CNAE serão oferecidos
 */
export const SEED: Record<string, Lc116Subitem[]> = {
  // ===== LIMPEZA E CONSERVAÇÃO =====
  // CNAE 8121-4/00: Limpeza em prédios e domicílios
  '8121400': ['07.10.01', '07.11.01'], // Limpeza em prédios e escritórios, Limpeza de residências - COM desdobramento
  '8121401': ['07.10.01'], // Limpeza em prédios e escritórios - COM desdobramento
  '8121300': ['07.10.01'], // Limpeza, manutenção e conservação de vias e logradouros públicos - COM desdobramento
  
  // ===== SERVIÇOS DE BELEZA =====
  // CNAE 9602-5/01: Cabeleireiros, manicure e pedicure
  '9602501': ['06.01', '06.02'], // Cabeleireiros/Barbearia/Manicure/Pedicure, Estética/depilação
  
  // ===== JARDINAGEM E PAISAGISMO =====
  '8130100': ['07.12'], // Jardinagem e paisagismo
  
  // ===== SEGURANÇA =====
  '8011100': ['07.13'], // Vigilância e segurança privada
  
  // ===== SERVIÇOS DE INFORMÁTICA E TI =====
  // Desenvolvimento de software
  '6201500': ['01.01', '01.02'], // Desenvolvimento sob encomenda, Desenvolvimento customizável
  '6202300': ['01.01', '01.02'], // Desenvolvimento e licenciamento customizável
  '6209100': ['01.01'], // Suporte técnico em TI
  
  // Consultoria em TI
  '6202301': ['01.03'], // Web design
  '6311900': ['01.08'], // Tratamento de dados
  '6319400': ['01.08'], // Portais, provedores de conteúdo
  
  // Processamento de dados e hospedagem
  '6311900': ['01.08'], // Tratamento de dados, provedores de serviços de aplicação
  '6319400': ['01.07'], // Portais, provedores de conteúdo e outros serviços de informação
  
  // ===== CONSULTORIA EMPRESARIAL E GESTÃO =====
  '7020400': ['17.01', '17.02'], // Consultoria em gestão empresarial, Consultoria em tecnologia da informação
  '7490104': ['17.01'], // Consultoria em gestão empresarial
  
  // ===== CONTABILIDADE E AUDITORIA =====
  '6920601': ['17.19', '17.20'], // Atividades de contabilidade, Assessoria e consultoria contábil
  '6920602': ['17.20'], // Atividades de consultoria e auditoria contábil e tributária
  
  // ===== DESIGN E DECORAÇÃO =====
  '7410202': ['39.01'], // Design de interiores
  '7490199': ['39.01'], // Decoração de interiores
  
  // ===== MANUTENÇÃO E REPARAÇÃO =====
  '9511800': ['14.01'], // Reparação e manutenção de equipamentos de informática
  '9512600': ['14.01'], // Reparação e manutenção de equipamentos de comunicação
  '9529199': ['14.01'], // Reparação e manutenção de outros objetos e equipamentos pessoais
  
  // ===== EDUCAÇÃO E TREINAMENTO =====
  '8599604': ['08.01'], // Treinamento em desenvolvimento profissional e gerencial
  '8599699': ['08.01'], // Outras atividades de ensino
  
  // ===== PUBLICIDADE E MARKETING =====
  '7311400': ['17.06'], // Agências de publicidade
  '7319002': ['17.06'], // Promoção de vendas
  '7319004': ['17.06'], // Consultoria em publicidade
  
  // ===== SERVIÇOS DOMÉSTICOS =====
  // ❌ REMOVIDO: '9700500' → '07.10.01' - Código 071001 NÃO é administrado por Garopaba (E0312)
  // Garopaba não habilita códigos de limpeza (07.xx) na API Nacional
  // Este CNAE ficará sem mapeamento automático e o usuário precisará escolher manualmente
  
  // ===== ALIMENTAÇÃO =====
  '5620104': ['17.11.02'], // Fornecimento de alimentos preparados (bufê) - Conforme XML de sucesso
  '5620101': ['17.11.02'], // Fornecimento de alimentos preparados para empresas
  '5611201': ['17.11.02'], // Restaurantes e similares
  '5611203': ['17.11.02'], // Lanchonetes, casas de chá, de sucos e similares
  
  // Adicione aqui outros CNAEs conforme necessidade
};

/**
 * Retorna subitens LC 116 para um CNAE específico
 * @param rawCnae CNAE no formato original (ex: '8121-4/00')
 * @param perCnaeLimit Limite de subitens por CNAE (padrão: 2)
 * @returns Array de subitens LC 116
 */
export function servicesByCnae(rawCnae: CnaeRaw, perCnaeLimit = 2): Lc116Subitem[] {
  const key = normalizeCnae(rawCnae);
  const arr = SEED[key] || [];
  return arr.slice(0, Math.max(0, perCnaeLimit));
}

/**
 * Retorna subitens LC 116 para múltiplos CNAEs
 * Agrega e deduplica os resultados
 * @param cnaes Array de CNAEs
 * @param perCnaeLimit Limite de subitens por CNAE (padrão: 2)
 * @returns Array de subitens LC 116 únicos
 */
export function servicesByCnaes(cnaes: CnaeRaw[], perCnaeLimit = 2): Lc116Subitem[] {
  const out: Lc116Subitem[] = [];
  const seen = new Set<Lc116Subitem>();
  
  for (const c of cnaes) {
    const opts = servicesByCnae(c, perCnaeLimit);
    for (const s of opts) {
      if (!seen.has(s)) {
        seen.add(s);
        out.push(s);
      }
    }
  }
  
  return out;
}

