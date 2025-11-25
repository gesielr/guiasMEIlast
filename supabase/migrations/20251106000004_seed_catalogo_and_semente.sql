-- ============================================
-- Seed: Catálogo Nacional + Semente CNAE → cTribNac
-- ============================================

-- 1) Popular Catálogo Nacional de cTribNac
-- Baseado nos códigos já mapeados na tabela cnae_tributacao
INSERT INTO public.catalogo_ctribnac (ctribnac, descricao, item_lista_lc116, subitem_lista_lc116, desdobro_nacional)
SELECT DISTINCT
  codigo_tributacao as ctribnac,
  descricao_servico as descricao,
  item_lista_lc116,
  subitem_lista_lc116,
  desdobro_nacional
FROM public.cnae_tributacao
WHERE ativo = true
ON CONFLICT (ctribnac) DO NOTHING;

-- Adicionar códigos comuns que podem não estar na tabela cnae_tributacao
INSERT INTO public.catalogo_ctribnac (ctribnac, descricao, item_lista_lc116, subitem_lista_lc116, desdobro_nacional)
VALUES
  ('140101', 'Limpeza em prédios e escritórios', '14', '01', '01'),
  ('140201', 'Limpeza de salas comerciais e residenciais', '14', '02', '01'),
  ('140301', 'Desenvolvimento de programas de computador sob encomenda', '14', '03', '01'),
  ('140302', 'Desenvolvimento e licenciamento de programas de computador customizados', '14', '03', '02'),
  ('140401', 'Consultoria em tecnologia da informação', '14', '04', '01'),
  ('140402', 'Consultoria em gestão de tecnologia da informação', '14', '04', '02'),
  ('140501', 'Gestão de dados e bancos de dados', '14', '05', '01'),
  ('140601', 'Processamento de dados, provedores de serviços de aplicação e serviços de hospedagem na internet', '14', '06', '01'),
  ('140701', 'Atividades de contabilidade, escrituração, auditoria e consultoria tributária', '14', '07', '01'),
  ('140801', 'Design de interiores e decoração', '14', '08', '01'),
  ('140901', 'Design gráfico e comunicação visual', '14', '09', '01'),
  ('141001', 'Agências de publicidade e propaganda', '14', '10', '01'),
  ('141101', 'Criação de conteúdo e produção de material publicitário', '14', '11', '01'),
  ('141201', 'Fotografia e produção fotográfica', '14', '12', '01'),
  ('141301', 'Tradução e interpretação', '14', '13', '01'),
  ('141401', 'Organização de eventos, exceto eventos esportivos', '14', '14', '01'),
  ('141501', 'Manutenção e reparação de equipamentos de informática e periféricos', '14', '15', '01'),
  ('141601', 'Consultoria em gestão empresarial', '14', '16', '01'),
  ('141701', 'Consultoria em arquitetura', '14', '17', '01'),
  ('141801', 'Consultoria em engenharia', '14', '18', '01')
ON CONFLICT (ctribnac) DO NOTHING;

-- 2) Popular Semente CNAE → cTribNac
-- Baseado na tabela cnae_tributacao existente
INSERT INTO public.cnae_to_ctribnac_seed (cnae_subclasse, ctribnac, weight, source)
SELECT 
  cnae as cnae_subclasse,
  codigo_tributacao as ctribnac,
  10 as weight, -- Peso padrão
  'cnae_tributacao_table' as source
FROM public.cnae_tributacao
WHERE ativo = true
ON CONFLICT (cnae_subclasse, ctribnac) DO UPDATE
SET weight = GREATEST(cnae_to_ctribnac_seed.weight, 10);

-- Adicionar mapeamentos adicionais com pesos diferentes
-- CNAEs de limpeza
INSERT INTO public.cnae_to_ctribnac_seed (cnae_subclasse, ctribnac, weight, source)
VALUES
  ('8121400', '140101', 15, 'manual'), -- Limpeza em prédios - peso maior
  ('8122100', '140201', 15, 'manual'), -- Limpeza de salas - peso maior
  ('8129000', '140301', 10, 'manual'), -- Outras limpeza
  ('8129000', '140101', 8, 'manual'),  -- Fallback para outras limpeza
  ('8129000', '140201', 8, 'manual')   -- Fallback para outras limpeza
ON CONFLICT (cnae_subclasse, ctribnac) DO UPDATE
SET weight = GREATEST(cnae_to_ctribnac_seed.weight, EXCLUDED.weight);

-- CNAEs de informática
INSERT INTO public.cnae_to_ctribnac_seed (cnae_subclasse, ctribnac, weight, source)
VALUES
  ('6201500', '140301', 20, 'manual'), -- Desenvolvimento - peso máximo
  ('6201500', '140302', 15, 'manual'), -- Desenvolvimento customizado
  ('6202300', '140401', 20, 'manual'), -- Consultoria TI - peso máximo
  ('6202300', '140402', 15, 'manual'), -- Consultoria gestão TI
  ('6203100', '140501', 18, 'manual'), -- Gestão de dados
  ('6204000', '140601', 18, 'manual'), -- Processamento de dados
  ('6209100', '140901', 15, 'manual')  -- Suporte técnico
ON CONFLICT (cnae_subclasse, ctribnac) DO UPDATE
SET weight = GREATEST(cnae_to_ctribnac_seed.weight, EXCLUDED.weight);

-- Verificação final
SELECT 
  'Catálogo cTribNac' as tabela,
  COUNT(*) as total_registros
FROM public.catalogo_ctribnac;

SELECT 
  'Semente CNAE → cTribNac' as tabela,
  COUNT(*) as total_registros
FROM public.cnae_to_ctribnac_seed;

