// Catálogo de descrições CNAE para match léxico
// Fonte: Tabela CNAE 2.3 - IBGE/Concla

export interface CnaeDescription {
  code: string;      // Código CNAE normalizado (apenas dígitos)
  title: string;     // Título/descrição oficial
  keywords?: string[]; // Keywords adicionais para melhorar o match
}

/**
 * Catálogo de CNAEs mais comuns para MEIs e Autônomos
 * Formato: código normalizado (7 dígitos sem hífen/barra)
 */
export const CNAE_CATALOG: Record<string, CnaeDescription> = {
  // ===== LIMPEZA E CONSERVAÇÃO =====
  '8121400': {
    code: '8121400',
    title: 'Limpeza em prédios e em domicílios',
    keywords: ['limpeza', 'faxina', 'conservacao', 'higienizacao', 'predio', 'escritorio', 'residencia', 'casa']
  },
  '8129000': {
    code: '8129000',
    title: 'Atividades de limpeza não especificadas anteriormente',
    keywords: ['limpeza', 'higienizacao', 'conservacao']
  },
  '8130100': {
    code: '8130100',
    title: 'Atividades paisagísticas',
    keywords: ['jardinagem', 'jardim', 'paisagismo', 'plantas', 'grama']
  },

  // ===== ALIMENTAÇÃO =====
  '5611201': {
    code: '5611201',
    title: 'Restaurantes e similares',
    keywords: ['restaurante', 'comida', 'refeicao', 'alimentacao', 'prato']
  },
  '5611203': {
    code: '5611203',
    title: 'Lanchonetes, casas de chá, de sucos e similares',
    keywords: ['lanchonete', 'lanche', 'suco', 'cafe', 'bebida', 'snack']
  },
  '5620101': {
    code: '5620101',
    title: 'Fornecimento de alimentos preparados preponderantemente para empresa',
    keywords: ['marmita', 'marmitex', 'comida', 'refeicao', 'alimentacao', 'empresa', 'corporativo']
  },
  '5620104': {
    code: '5620104',
    title: 'Fornecimento de alimentos preparados preponderantemente para consumo domiciliar',
    keywords: ['marmita', 'marmitex', 'comida', 'refeicao', 'alimentacao', 'entrega', 'delivery', 'casa', 'residencia']
  },
  '5612100': {
    code: '5612100',
    title: 'Serviços ambulantes de alimentação',
    keywords: ['food', 'truck', 'ambulante', 'comida', 'trailer', 'barraca']
  },

  // ===== BELEZA E ESTÉTICA =====
  '9602501': {
    code: '9602501',
    title: 'Cabeleireiros, manicure e pedicure',
    keywords: ['cabelo', 'salao', 'beleza', 'manicure', 'pedicure', 'unha', 'corte', 'penteado']
  },
  '9602502': {
    code: '9602502',
    title: 'Atividades de estética e outros serviços de cuidados com a beleza',
    keywords: ['estetica', 'beleza', 'depilacao', 'massagem', 'tratamento', 'pele']
  },

  // ===== TECNOLOGIA DA INFORMAÇÃO =====
  '6201500': {
    code: '6201500',
    title: 'Desenvolvimento de programas de computador sob encomenda',
    keywords: ['programacao', 'software', 'desenvolvimento', 'sistema', 'app', 'aplicativo', 'dev']
  },
  '6202300': {
    code: '6202300',
    title: 'Desenvolvimento e licenciamento de programas de computador customizáveis',
    keywords: ['software', 'programa', 'licenca', 'sistema', 'desenvolvimento']
  },
  '6203100': {
    code: '6203100',
    title: 'Desenvolvimento e licenciamento de programas de computador não-customizáveis',
    keywords: ['software', 'programa', 'licenca', 'saas']
  },
  '6204000': {
    code: '6204000',
    title: 'Consultoria em tecnologia da informação',
    keywords: ['consultoria', 'ti', 'tecnologia', 'consultor', 'it']
  },
  '6209100': {
    code: '6209100',
    title: 'Suporte técnico, manutenção e outros serviços em tecnologia da informação',
    keywords: ['suporte', 'tecnico', 'manutencao', 'ti', 'helpdesk', 'assistencia']
  },
  '6311900': {
    code: '6311900',
    title: 'Tratamento de dados, provedores de serviços de aplicação e serviços de hospedagem na internet',
    keywords: ['hospedagem', 'hosting', 'servidor', 'cloud', 'nuvem', 'dados']
  },

  // ===== CONSULTORIA E GESTÃO =====
  '7020400': {
    code: '7020400',
    title: 'Atividades de consultoria em gestão empresarial',
    keywords: ['consultoria', 'gestao', 'empresa', 'negocio', 'administracao', 'consultor']
  },
  '7490104': {
    code: '7490104',
    title: 'Atividades de intermediação e agenciamento de serviços e negócios em geral',
    keywords: ['intermediacao', 'agenciamento', 'negocio', 'servico']
  },

  // ===== CONTABILIDADE =====
  '6920601': {
    code: '6920601',
    title: 'Atividades de contabilidade',
    keywords: ['contabilidade', 'contador', 'contabil', 'escrituracao', 'fiscal']
  },
  '6920602': {
    code: '6920602',
    title: 'Atividades de consultoria e auditoria contábil e tributária',
    keywords: ['consultoria', 'auditoria', 'contabil', 'tributario', 'fiscal']
  },

  // ===== CONSTRUÇÃO E MANUTENÇÃO =====
  '4313400': {
    code: '4313400',
    title: 'Obras de terraplenagem',
    keywords: ['terraplanagem', 'escavacao', 'obra', 'terra']
  },
  '4321500': {
    code: '4321500',
    title: 'Instalação e manutenção elétrica',
    keywords: ['eletrica', 'eletricista', 'instalacao', 'fiacao', 'luz']
  },
  '4322301': {
    code: '4322301',
    title: 'Instalações hidráulicas, sanitárias e de gás',
    keywords: ['hidraulica', 'encanador', 'agua', 'esgoto', 'gas', 'cano']
  },
  '4329101': {
    code: '4329101',
    title: 'Instalação de painéis publicitários',
    keywords: ['painel', 'outdoor', 'publicidade', 'placa']
  },
  '4330404': {
    code: '4330404',
    title: 'Serviços de pintura de edifícios em geral',
    keywords: ['pintura', 'pintor', 'parede', 'tinta']
  },

  // ===== TRANSPORTE =====
  '4923001': {
    code: '4923001',
    title: 'Serviço de táxi',
    keywords: ['taxi', 'taxista', 'transporte', 'corrida']
  },
  '4930202': {
    code: '4930202',
    title: 'Transporte rodoviário de carga, exceto produtos perigosos e mudanças, intermunicipal, interestadual e internacional',
    keywords: ['transporte', 'carga', 'frete', 'caminhao']
  },

  // ===== EDUCAÇÃO =====
  '8599604': {
    code: '8599604',
    title: 'Treinamento em desenvolvimento profissional e gerencial',
    keywords: ['treinamento', 'curso', 'capacitacao', 'workshop', 'palestra']
  },
  '8599699': {
    code: '8599699',
    title: 'Outras atividades de ensino não especificadas anteriormente',
    keywords: ['ensino', 'aula', 'curso', 'educacao', 'professor']
  },

  // ===== DESIGN E PUBLICIDADE =====
  '7410202': {
    code: '7410202',
    title: 'Design de interiores',
    keywords: ['design', 'interiores', 'decoracao', 'projeto']
  },
  '7311400': {
    code: '7311400',
    title: 'Agências de publicidade',
    keywords: ['publicidade', 'propaganda', 'agencia', 'marketing', 'campanha']
  },
  '7319002': {
    code: '7319002',
    title: 'Promoção de vendas',
    keywords: ['promocao', 'vendas', 'marketing', 'evento']
  },

  // ===== REPARAÇÃO E MANUTENÇÃO =====
  '9511800': {
    code: '9511800',
    title: 'Reparação e manutenção de computadores e de equipamentos periféricos',
    keywords: ['manutencao', 'reparo', 'computador', 'pc', 'notebook', 'tecnico']
  },
  '9512600': {
    code: '9512600',
    title: 'Reparação e manutenção de equipamentos de comunicação',
    keywords: ['manutencao', 'reparo', 'celular', 'telefone', 'comunicacao']
  },
  '9529199': {
    code: '9529199',
    title: 'Reparação e manutenção de outros objetos e equipamentos pessoais e domésticos não especificados anteriormente',
    keywords: ['manutencao', 'reparo', 'conserto', 'equipamento']
  },
  '4520001': {
    code: '4520001',
    title: 'Serviços de manutenção e reparação mecânica de veículos automotores',
    keywords: ['mecanica', 'carro', 'veiculo', 'auto', 'manutencao', 'reparo', 'conserto']
  },
  '4520002': {
    code: '4520002',
    title: 'Serviços de lanternagem ou funilaria e pintura de veículos automotores',
    keywords: ['lanternagem', 'funilaria', 'pintura', 'carro', 'veiculo', 'lataria']
  },

  // ===== SEGURANÇA =====
  '8011101': {
    code: '8011101',
    title: 'Atividades de vigilância e segurança privada',
    keywords: ['seguranca', 'vigilancia', 'vigia', 'guarda']
  },

  // ===== OUTROS SERVIÇOS DOMÉSTICOS =====
  '9700500': {
    code: '9700500',
    title: 'Serviços domésticos',
    keywords: ['domestico', 'empregada', 'diarista', 'servico', 'casa']
  }
};

/**
 * Busca descrição de um CNAE
 * @param cnaeCode Código CNAE (normalizado ou com máscara)
 * @returns Descrição do CNAE ou undefined
 */
export function getCnaeDescription(cnaeCode: string): CnaeDescription | undefined {
  // Normalizar código (remover caracteres não numéricos)
  const normalized = cnaeCode.replace(/\D/g, '');
  return CNAE_CATALOG[normalized];
}

/**
 * Busca apenas o título de um CNAE
 * @param cnaeCode Código CNAE
 * @returns Título ou string vazia
 */
export function getCnaeTitle(cnaeCode: string): string {
  const desc = getCnaeDescription(cnaeCode);
  return desc?.title || '';
}

/**
 * Busca todas as keywords de um CNAE
 * @param cnaeCode Código CNAE
 * @returns Array de keywords ou array vazio
 */
export function getCnaeKeywords(cnaeCode: string): string[] {
  const desc = getCnaeDescription(cnaeCode);
  return desc?.keywords || [];
}

/**
 * Verifica se um CNAE está cadastrado
 * @param cnaeCode Código CNAE
 * @returns true se existe no catálogo
 */
export function hasCnaeDescription(cnaeCode: string): boolean {
  const normalized = cnaeCode.replace(/\D/g, '');
  return normalized in CNAE_CATALOG;
}

