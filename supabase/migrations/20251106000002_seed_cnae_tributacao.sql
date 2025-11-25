-- Seed inicial para mapeamento CNAE → Códigos de Tributação
-- Baseado na Lista Nacional de Serviços (LC 116/2003)
-- 
-- NOTA: Esta é uma versão inicial. Em produção, deve ser populado com dados oficiais
-- da API do Sistema Nacional NFS-e ou tabelas oficiais do governo.

-- Informática e Tecnologia
INSERT INTO public.cnae_tributacao (cnae, codigo_tributacao, descricao_servico, item_lista_lc116, subitem_lista_lc116, desdobro_nacional, ativo)
VALUES 
  ('6201500', '140301', 'Desenvolvimento de programas de computador sob encomenda', '14', '03', '01', true),
  ('6201500', '140302', 'Desenvolvimento e licenciamento de programas de computador customizados', '14', '03', '02', true),
  ('6202300', '140401', 'Consultoria em tecnologia da informação', '14', '04', '01', true),
  ('6202300', '140402', 'Consultoria em gestão de tecnologia da informação', '14', '04', '02', true),
  ('6203100', '140501', 'Gestão de dados e bancos de dados', '14', '05', '01', true),
  ('6204000', '140601', 'Processamento de dados, provedores de serviços de aplicação e serviços de hospedagem na internet', '14', '06', '01', true),
  ('6209100', '140901', 'Suporte técnico, manutenção e outros serviços em tecnologia da informação', '14', '09', '01', true)

ON CONFLICT (cnae, codigo_tributacao) DO NOTHING;

-- Serviços de Limpeza
INSERT INTO public.cnae_tributacao (cnae, codigo_tributacao, descricao_servico, item_lista_lc116, subitem_lista_lc116, desdobro_nacional, ativo)
VALUES 
  ('8121400', '140101', 'Limpeza em prédios e escritórios', '14', '01', '01', true),
  ('8122100', '140201', 'Limpeza de salas comerciais e residenciais', '14', '02', '01', true),
  ('8129000', '140301', 'Outras atividades de serviços de limpeza', '14', '03', '01', true)

ON CONFLICT (cnae, codigo_tributacao) DO NOTHING;

-- Serviços Contábeis
INSERT INTO public.cnae_tributacao (cnae, codigo_tributacao, descricao_servico, item_lista_lc116, subitem_lista_lc116, desdobro_nacional, ativo)
VALUES 
  ('6920601', '140701', 'Atividades de contabilidade, escrituração, auditoria e consultoria tributária', '14', '07', '01', true)

ON CONFLICT (cnae, codigo_tributacao) DO NOTHING;

-- Design e Comunicação Visual
INSERT INTO public.cnae_tributacao (cnae, codigo_tributacao, descricao_servico, item_lista_lc116, subitem_lista_lc116, desdobro_nacional, ativo)
VALUES 
  ('7410201', '140801', 'Design de interiores e decoração', '14', '08', '01', true),
  ('7420001', '140901', 'Design gráfico e comunicação visual', '14', '09', '01', true)

ON CONFLICT (cnae, codigo_tributacao) DO NOTHING;

-- Serviços de Marketing e Publicidade
INSERT INTO public.cnae_tributacao (cnae, codigo_tributacao, descricao_servico, item_lista_lc116, subitem_lista_lc116, desdobro_nacional, ativo)
VALUES 
  ('7311400', '141001', 'Agências de publicidade e propaganda', '14', '10', '01', true),
  ('7312200', '141101', 'Criação de conteúdo e produção de material publicitário', '14', '11', '01', true)

ON CONFLICT (cnae, codigo_tributacao) DO NOTHING;

-- Fotografia
INSERT INTO public.cnae_tributacao (cnae, codigo_tributacao, descricao_servico, item_lista_lc116, subitem_lista_lc116, desdobro_nacional, ativo)
VALUES 
  ('7420002', '141201', 'Fotografia e produção fotográfica', '14', '12', '01', true)

ON CONFLICT (cnae, codigo_tributacao) DO NOTHING;

-- Tradução e Interpretação
INSERT INTO public.cnae_tributacao (cnae, codigo_tributacao, descricao_servico, item_lista_lc116, subitem_lista_lc116, desdobro_nacional, ativo)
VALUES 
  ('7430001', '141301', 'Tradução e interpretação', '14', '13', '01', true)

ON CONFLICT (cnae, codigo_tributacao) DO NOTHING;

-- Organização de Eventos
INSERT INTO public.cnae_tributacao (cnae, codigo_tributacao, descricao_servico, item_lista_lc116, subitem_lista_lc116, desdobro_nacional, ativo)
VALUES 
  ('8230200', '141401', 'Organização de eventos, exceto eventos esportivos', '14', '14', '01', true)

ON CONFLICT (cnae, codigo_tributacao) DO NOTHING;

-- Manutenção e Reparação
INSERT INTO public.cnae_tributacao (cnae, codigo_tributacao, descricao_servico, item_lista_lc116, subitem_lista_lc116, desdobro_nacional, ativo)
VALUES 
  ('9511800', '141501', 'Manutenção e reparação de equipamentos de informática e periféricos', '14', '15', '01', true)

ON CONFLICT (cnae, codigo_tributacao) DO NOTHING;

-- Consultorias
INSERT INTO public.cnae_tributacao (cnae, codigo_tributacao, descricao_servico, item_lista_lc116, subitem_lista_lc116, desdobro_nacional, ativo)
VALUES 
  ('7020400', '141601', 'Consultoria em gestão empresarial', '14', '16', '01', true),
  ('7111100', '141701', 'Consultoria em arquitetura', '14', '17', '01', true),
  ('7112000', '141801', 'Consultoria em engenharia', '14', '18', '01', true)

ON CONFLICT (cnae, codigo_tributacao) DO NOTHING;

-- Comentário sobre a estrutura
COMMENT ON TABLE public.cnae_tributacao IS 'Tabela de mapeamento entre CNAEs e códigos de tributação nacional. Populada com dados iniciais comuns. Em produção, deve ser expandida com dados oficiais do Sistema Nacional NFS-e.';

