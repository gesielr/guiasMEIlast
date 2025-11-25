// Catálogo completo LC 116 com keywords para match léxico
// Baseado na Lei Complementar 116/2003

export interface LC116Item {
  code: string;          // Ex: '01.01', '07.10'
  title: string;         // Título oficial
  desc?: string;         // Descrição adicional
  keywords?: string[];   // Sinônimos e palavras-chave para match
}

export const LC116_CATALOG: LC116Item[] = [
  // ===== 1. SERVIÇOS DE INFORMÁTICA E CONGÊNERES =====
  {
    code: '01.01',
    title: 'Análise e desenvolvimento de sistemas',
    keywords: ['software', 'programacao', 'sistema', 'aplicativo', 'app', 'desenvolvimento', 'programador', 'dev']
  },
  {
    code: '01.02',
    title: 'Programação',
    keywords: ['codigo', 'programacao', 'desenvolvimento', 'software', 'script']
  },
  {
    code: '01.03',
    title: 'Processamento de dados e congêneres',
    keywords: ['dados', 'processamento', 'banco', 'database', 'etl']
  },
  {
    code: '01.04',
    title: 'Elaboração de programas de computadores',
    keywords: ['software', 'programa', 'aplicativo', 'sistema']
  },
  {
    code: '01.05',
    title: 'Licenciamento ou cessão de direito de uso de programas de computação',
    keywords: ['licenca', 'software', 'saas', 'assinatura']
  },
  {
    code: '01.06',
    title: 'Assessoria e consultoria em informática',
    keywords: ['consultoria', 'ti', 'tecnologia', 'assessoria', 'consultor']
  },
  {
    code: '01.07',
    title: 'Suporte técnico em informática',
    keywords: ['suporte', 'helpdesk', 'atendimento', 'tecnico', 'ti']
  },
  {
    code: '01.08',
    title: 'Planejamento, confecção, manutenção e atualização de páginas eletrônicas',
    keywords: ['site', 'website', 'web', 'pagina', 'internet', 'online']
  },
  {
    code: '01.09',
    title: 'Disponibilização de infraestrutura de datacenter',
    keywords: ['datacenter', 'servidor', 'hospedagem', 'hosting', 'cloud', 'nuvem']
  },

  // ===== 6. SERVIÇOS DE CUIDADOS PESSOAIS, ESTÉTICA, ATIVIDADES FÍSICAS E CONGÊNERES =====
  {
    code: '06.01',
    title: 'Barbearia, cabeleireiros, manicuros, pedicuros e congêneres',
    keywords: ['cabelo', 'corte', 'barbeiro', 'cabeleireiro', 'manicure', 'pedicure', 'unha', 'salao', 'beleza']
  },
  {
    code: '06.02',
    title: 'Esteticistas, tratamento de pele, depilação e congêneres',
    keywords: ['estetica', 'pele', 'depilacao', 'massagem', 'spa', 'beleza', 'tratamento']
  },
  {
    code: '06.03',
    title: 'Banhos, duchas, sauna, massagens e congêneres',
    keywords: ['massagem', 'spa', 'sauna', 'banho', 'relaxamento']
  },
  {
    code: '06.04',
    title: 'Ginástica, dança, esportes, natação, artes marciais e demais atividades físicas',
    keywords: ['academia', 'ginastica', 'personal', 'treino', 'esporte', 'natacao', 'danca']
  },
  {
    code: '06.05',
    title: 'Centros de emagrecimento, spa e congêneres',
    keywords: ['emagrecimento', 'spa', 'dieta', 'nutricao']
  },
  {
    code: '06.06',
    title: 'Aplicação de tatuagens, piercings e congêneres',
    keywords: ['tatuagem', 'tattoo', 'piercing', 'body']
  },

  // ===== 7. SERVIÇOS RELATIVOS A ENGENHARIA, ARQUITETURA, GEOLOGIA, URBANISMO, CONSTRUÇÃO CIVIL =====
  {
    code: '07.01',
    title: 'Engenharia, agronomia, agrimensura, arquitetura, geologia, urbanismo, paisagismo e congêneres',
    keywords: ['engenharia', 'arquitetura', 'projeto', 'planta', 'obra', 'construcao']
  },
  {
    code: '07.02',
    title: 'Execução, por administração, empreitada ou subempreitada, de obras de construção civil',
    keywords: ['construcao', 'obra', 'reforma', 'edificacao', 'empreiteira']
  },
  {
    code: '07.03',
    title: 'Elaboração de planos diretores, estudos de viabilidade, estudos organizacionais e outros',
    keywords: ['planejamento', 'estudo', 'viabilidade', 'projeto']
  },
  {
    code: '07.04',
    title: 'Demolição',
    keywords: ['demolicao', 'desmonte', 'destruicao']
  },
  {
    code: '07.05',
    title: 'Reparação, conservação e reforma de edifícios, estradas, pontes, portos e congêneres',
    keywords: ['reparo', 'conservacao', 'reforma', 'manutencao', 'pintura']
  },
  {
    code: '07.06',
    title: 'Colocação e instalação de tapetes, carpetes, assoalhos, cortinas, revestimentos de parede, vidros, divisórias, placas de gesso e congêneres',
    keywords: ['instalacao', 'carpete', 'cortina', 'revestimento', 'gesso', 'vidro']
  },
  {
    code: '07.07',
    title: 'Recuperação, raspagem, polimento e lustração de pisos e congêneres',
    keywords: ['polimento', 'piso', 'lustração', 'raspagem']
  },
  {
    code: '07.08',
    title: 'Calafetação',
    keywords: ['vedacao', 'calafetacao', 'impermeabilizacao']
  },
  {
    code: '07.09',
    title: 'Varrição, coleta, remoção, incineração, tratamento, reciclagem, separação e destinação final de lixo, rejeitos e outros resíduos quaisquer',
    keywords: ['lixo', 'coleta', 'reciclagem', 'residuo', 'limpeza']
  },
  {
    code: '07.10',
    title: 'Limpeza, manutenção e conservação de vias e logradouros públicos, imóveis, chaminés, piscinas, parques, jardins e congêneres',
    keywords: ['limpeza', 'conservacao', 'manutencao', 'predio', 'escritorio', 'comercial', 'residencial', 'jardinagem']
  },
  {
    code: '07.11',
    title: 'Decoração e jardinagem',
    keywords: ['decoracao', 'jardinagem', 'jardim', 'paisagismo', 'plantas']
  },
  {
    code: '07.12',
    title: 'Controle e tratamento de efluentes de qualquer natureza e de agentes físicos, químicos e biológicos',
    keywords: ['tratamento', 'efluente', 'agua', 'esgoto', 'ambiental']
  },
  {
    code: '07.13',
    title: 'Dedetização, desinfecção, desinsetização, imunização, higienização, desratização, pulverização e congêneres',
    keywords: ['dedetizacao', 'desinfeccao', 'praga', 'controle', 'higienizacao', 'sanitizacao']
  },
  {
    code: '07.14',
    title: 'Florestamento, reflorestamento, semeadura, adubação e congêneres',
    keywords: ['floresta', 'plantio', 'adubacao', 'agricultura']
  },
  {
    code: '07.15',
    title: 'Escoramento, contenção de encostas e serviços congêneres',
    keywords: ['escoramento', 'contencao', 'encosta', 'muro']
  },
  {
    code: '07.16',
    title: 'Limpeza e dragagem de rios, portos, canais, baías, lagos, lagoas, represas, açudes e congêneres',
    keywords: ['dragagem', 'limpeza', 'rio', 'canal']
  },
  {
    code: '07.17',
    title: 'Acompanhamento e fiscalização da execução de obras de engenharia, arquitetura e urbanismo',
    keywords: ['fiscalizacao', 'acompanhamento', 'obra', 'engenharia']
  },
  {
    code: '07.18',
    title: 'Aerofotogrametria (inclusive interpretação), cartografia, mapeamento, levantamentos topográficos',
    keywords: ['topografia', 'mapeamento', 'levantamento', 'medicao']
  },
  {
    code: '07.19',
    title: 'Pesquisa, perfuração, cimentação, mergulho, perfilagem, concretação, testemunhagem, pescaria, estimulação e outros serviços relacionados com a exploração e explotação de petróleo, gás natural e de outros recursos minerais',
    keywords: ['perfuracao', 'petroleo', 'gas', 'mineral', 'exploracao']
  },
  {
    code: '07.20',
    title: 'Nucleação e bombardeamento de nuvens e congêneres',
    keywords: ['chuva', 'nuvem', 'clima']
  },

  // ===== 10. SERVIÇOS DE INTERMEDIAÇÃO E CONGÊNERES =====
  {
    code: '10.01',
    title: 'Agenciamento, corretagem ou intermediação de câmbio, de seguros, de cartões de crédito, de planos de saúde e de planos de previdência privada',
    keywords: ['corretagem', 'seguro', 'plano', 'saude', 'agenciamento']
  },
  {
    code: '10.02',
    title: 'Agenciamento, corretagem ou intermediação de títulos em geral, valores mobiliários e contratos quaisquer',
    keywords: ['corretagem', 'investimento', 'titulo', 'financeiro']
  },
  {
    code: '10.03',
    title: 'Agenciamento, corretagem ou intermediação de direitos de propriedade industrial, artística ou literária',
    keywords: ['propriedade', 'direito', 'autoral', 'patente']
  },
  {
    code: '10.04',
    title: 'Agenciamento, corretagem ou intermediação de contratos de arrendamento mercantil (leasing), de franquia (franchising) e de faturização (factoring)',
    keywords: ['leasing', 'factoring', 'franquia', 'intermediacao']
  },
  {
    code: '10.05',
    title: 'Agenciamento, corretagem ou intermediação de bens móveis ou imóveis',
    keywords: ['corretor', 'imovel', 'imobiliaria', 'compra', 'venda', 'aluguel']
  },
  {
    code: '10.06',
    title: 'Agenciamento, corretagem ou intermediação de contratos de câmbio em geral',
    keywords: ['cambio', 'moeda', 'dolar']
  },
  {
    code: '10.07',
    title: 'Agenciamento de publicidade e propaganda',
    keywords: ['publicidade', 'propaganda', 'marketing', 'agencia']
  },
  {
    code: '10.08',
    title: 'Representação de qualquer natureza',
    keywords: ['representacao', 'comercial', 'vendas']
  },
  {
    code: '10.09',
    title: 'Distribuição de bens de terceiros',
    keywords: ['distribuicao', 'logistica', 'entrega']
  },
  {
    code: '10.10',
    title: 'Intermediação e agenciamento de serviços e negócios em geral',
    keywords: ['intermediacao', 'agenciamento', 'negocio']
  },

  // ===== 14. SERVIÇOS RELATIVOS A BENS DE TERCEIROS =====
  {
    code: '14.01',
    title: 'Lubrificação, limpeza, lustração, revisão, carga e recarga, conserto, restauração, blindagem, manutenção e conservação de máquinas, veículos, aparelhos, equipamentos',
    keywords: ['manutencao', 'conserto', 'reparo', 'veiculo', 'carro', 'maquina', 'equipamento', 'assistencia']
  },
  {
    code: '14.02',
    title: 'Assistência técnica',
    keywords: ['assistencia', 'tecnica', 'reparo', 'conserto', 'manutencao']
  },
  {
    code: '14.03',
    title: 'Recondicionamento de motores',
    keywords: ['motor', 'recondicionamento', 'retifica']
  },
  {
    code: '14.04',
    title: 'Recauchutagem ou regeneração de pneus',
    keywords: ['pneu', 'recauchutagem', 'borracharia']
  },
  {
    code: '14.05',
    title: 'Restauração, recondicionamento, acondicionamento, pintura, beneficiamento, lavagem, secagem, tingimento, galvanoplastia, anodização, corte, recorte, polimento, plastificação e congêneres, de objetos quaisquer',
    keywords: ['restauracao', 'pintura', 'lavagem', 'tingimento', 'acabamento']
  },
  {
    code: '14.06',
    title: 'Instalação e montagem de aparelhos, máquinas e equipamentos',
    keywords: ['instalacao', 'montagem', 'maquina', 'equipamento']
  },
  {
    code: '14.07',
    title: 'Colocação de molduras e congêneres',
    keywords: ['moldura', 'quadro', 'emolduramento']
  },
  {
    code: '14.08',
    title: 'Encadernação, gravação e douração de livros, revistas e congêneres',
    keywords: ['encadernacao', 'livro', 'gravacao']
  },
  {
    code: '14.09',
    title: 'Alfaiataria e costura',
    keywords: ['costura', 'alfaiate', 'roupa', 'conserto']
  },
  {
    code: '14.10',
    title: 'Tinturaria e lavanderia',
    keywords: ['lavanderia', 'tinturaria', 'lavagem', 'roupa', 'limpeza']
  },
  {
    code: '14.11',
    title: 'Tapeçaria e reforma de estofamentos em geral',
    keywords: ['estofado', 'tapecaria', 'reforma', 'sofa']
  },
  {
    code: '14.12',
    title: 'Funilaria e lanternagem',
    keywords: ['funilaria', 'lanternagem', 'lataria', 'carro']
  },
  {
    code: '14.13',
    title: 'Carpintaria e serralheria',
    keywords: ['carpintaria', 'serralheria', 'madeira', 'metal', 'marcenaria']
  },

  // ===== 17. SERVIÇOS DE APOIO TÉCNICO, ADMINISTRATIVO, JURÍDICO, CONTÁBIL, COMERCIAL E CONGÊNERES =====
  {
    code: '17.01',
    title: 'Assessoria ou consultoria de qualquer natureza',
    keywords: ['consultoria', 'assessoria', 'consultor', 'assessor', 'orientacao']
  },
  {
    code: '17.02',
    title: 'Datilografia, digitação, estenografia, expediente, secretaria em geral, resposta audível, redação, edição, interpretação, revisão, tradução, apoio e infraestrutura administrativa e congêneres',
    keywords: ['digitacao', 'secretaria', 'traducao', 'revisao', 'edicao', 'redacao', 'administrativo']
  },
  {
    code: '17.03',
    title: 'Planejamento, coordenação, programação ou organização técnica, financeira ou administrativa',
    keywords: ['planejamento', 'organizacao', 'gestao', 'coordenacao']
  },
  {
    code: '17.04',
    title: 'Recrutamento, agenciamento, seleção e colocação de mão-de-obra',
    keywords: ['recrutamento', 'selecao', 'rh', 'recursos', 'humanos', 'vaga', 'emprego']
  },
  {
    code: '17.05',
    title: 'Fornecimento de mão-de-obra, mesmo em caráter temporário',
    keywords: ['terceirizacao', 'mao', 'obra', 'temporario']
  },
  {
    code: '17.06',
    title: 'Propaganda e publicidade',
    keywords: ['propaganda', 'publicidade', 'marketing', 'anuncio', 'campanha']
  },
  {
    code: '17.07',
    title: 'Franquia (franchising)',
    keywords: ['franquia', 'franchising']
  },
  {
    code: '17.08',
    title: 'Perícias, laudos, exames técnicos e análises técnicas',
    keywords: ['pericia', 'laudo', 'exame', 'analise', 'tecnica']
  },
  {
    code: '17.09',
    title: 'Planejamento, organização e administração de feiras, exposições, congressos e congêneres',
    keywords: ['evento', 'feira', 'congresso', 'exposicao', 'organizacao']
  },
  {
    code: '17.10',
    title: 'Organização de festas e recepções',
    keywords: ['festa', 'evento', 'recepcao', 'buffet', 'casamento']
  },
  {
    code: '17.11',
    title: 'Administração em geral',
    keywords: ['administracao', 'gestao', 'gerenciamento']
  },
  {
    code: '17.12',
    title: 'Leilão e congêneres',
    keywords: ['leilao', 'hasta', 'leiloeiro']
  },
  {
    code: '17.13',
    title: 'Advocacia',
    keywords: ['advogado', 'advocacia', 'juridico', 'direito', 'causa']
  },
  {
    code: '17.14',
    title: 'Arbitragem de qualquer espécie',
    keywords: ['arbitragem', 'arbitro', 'mediacao']
  },
  {
    code: '17.15',
    title: 'Auditoria',
    keywords: ['auditoria', 'auditor', 'fiscalizacao']
  },
  {
    code: '17.16',
    title: 'Análise de Organização e Métodos',
    keywords: ['organizacao', 'metodos', 'analise', 'processos']
  },
  {
    code: '17.17',
    title: 'Atuária e cálculos técnicos de qualquer natureza',
    keywords: ['atuaria', 'calculo', 'tecnico']
  },
  {
    code: '17.18',
    title: 'Contabilidade, inclusive serviços técnicos e auxiliares',
    keywords: ['contabilidade', 'contador', 'contabil', 'escrituracao', 'fiscal']
  },
  {
    code: '17.19',
    title: 'Consultoria e assessoria econômica ou financeira',
    keywords: ['consultoria', 'financeiro', 'economico', 'financas']
  },
  {
    code: '17.20',
    title: 'Estatística',
    keywords: ['estatistica', 'dados', 'analise']
  },
  {
    code: '17.21',
    title: 'Cobrança em geral',
    keywords: ['cobranca', 'divida', 'recuperacao']
  },
  {
    code: '17.22',
    title: 'Assessoria, análise, avaliação, atendimento, consulta, cadastro, seleção, gerenciamento de informações, administração de contas a receber ou a pagar e em geral, relacionados a operações de faturização (factoring)',
    keywords: ['factoring', 'faturizacao', 'cobranca']
  },
  {
    code: '17.23',
    title: 'Apresentação de palestras, conferências, seminários e congêneres',
    keywords: ['palestra', 'seminario', 'treinamento', 'curso', 'capacitacao', 'workshop']
  },
  {
    code: '17.24',
    title: 'Inserção de textos, desenhos e outros materiais de propaganda e publicidade',
    keywords: ['publicidade', 'propaganda', 'insercao', 'anuncio']
  },
  {
    code: '17.25',
    title: 'Pesquisa de mercado e de opinião pública',
    keywords: ['pesquisa', 'mercado', 'opiniao', 'enquete']
  },

  // ===== 25. SERVIÇOS FUNERÁRIOS =====
  {
    code: '25.01',
    title: 'Funerais, inclusive fornecimento de caixão, urna ou esquifes; aluguel de capela; transporte do corpo cadavérico; fornecimento de flores, coroas e outros paramentos',
    keywords: ['funeral', 'funeraria', 'velorio', 'sepultamento']
  },
  {
    code: '25.02',
    title: 'Cremação de corpos e partes de corpos cadavéricos',
    keywords: ['cremacao', 'crematório']
  },
  {
    code: '25.03',
    title: 'Planos ou convênios funerários',
    keywords: ['plano', 'funerario', 'convenio']
  },
  {
    code: '25.04',
    title: 'Manutenção e conservação de jazigos e cemitérios',
    keywords: ['cemiterio', 'jazigo', 'manutencao', 'tumulo']
  },
  {
    code: '25.05',
    title: 'Cessão de uso de espaços em cemitérios para sepultamento',
    keywords: ['cemiterio', 'sepultamento', 'terreno']
  },

  // ===== 17 (Continuação) - ALIMENTAÇÃO =====
  {
    code: '17.11',
    title: 'Administração de fundos quaisquer, de consórcio, de cartão de crédito ou débito e congêneres, de carteira de clientes, de cheques pré-datados e congêneres',
    keywords: ['administracao', 'fundo', 'consorcio', 'carteira']
  },
  {
    code: '17.24',
    title: 'Fornecimento de alimentos preparados',
    keywords: ['alimento', 'comida', 'refeicao', 'marmita', 'lanche', 'alimentacao', 'restaurante', 'bar', 'lanchonete']
  }
];

// Export função helper para buscar item por código
export function getLc116ByCode(code: string): LC116Item | undefined {
  return LC116_CATALOG.find(item => item.code === code);
}

// Export todas as keywords únicas para debug
export function getAllKeywords(): string[] {
  const keywords = new Set<string>();
  LC116_CATALOG.forEach(item => {
    item.keywords?.forEach(kw => keywords.add(kw));
  });
  return Array.from(keywords).sort();
}

