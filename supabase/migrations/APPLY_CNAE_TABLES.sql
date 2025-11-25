-- Script SQL para aplicar as novas tabelas de CNAE diretamente
-- Execute este script no Supabase Dashboard -> SQL Editor
-- OU via CLI: psql <connection_string> -f APPLY_CNAE_TABLES.sql

-- ============================================
-- Migration: 20251106000001_create_cnae_tables.sql
-- ============================================

-- Tabela para armazenar CNAEs do prestador
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS cnae_principal VARCHAR(7),
ADD COLUMN IF NOT EXISTS cnaes_secundarios JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS cnaes_updated_at TIMESTAMP WITH TIME ZONE;

-- Índice para busca rápida por CNAE
CREATE INDEX IF NOT EXISTS idx_profiles_cnae_principal ON public.profiles(cnae_principal);

-- Tabela de mapeamento CNAE → Códigos de Tributação Nacional
CREATE TABLE IF NOT EXISTS public.cnae_tributacao (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cnae VARCHAR(7) NOT NULL,
  codigo_tributacao VARCHAR(6) NOT NULL,
  descricao_servico TEXT NOT NULL,
  item_lista_lc116 VARCHAR(2) NOT NULL DEFAULT '01',
  subitem_lista_lc116 VARCHAR(2),
  desdobro_nacional VARCHAR(2),
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(cnae, codigo_tributacao)
);

-- Índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_cnae_tributacao_cnae ON public.cnae_tributacao(cnae);
CREATE INDEX IF NOT EXISTS idx_cnae_tributacao_codigo ON public.cnae_tributacao(codigo_tributacao);
CREATE INDEX IF NOT EXISTS idx_cnae_tributacao_ativo ON public.cnae_tributacao(ativo) WHERE ativo = TRUE;

-- Comentários para documentação
COMMENT ON TABLE public.cnae_tributacao IS 'Mapeamento entre CNAEs e códigos de tributação nacional (cTribNac) da Lista Nacional de Serviços (LC 116/2003)';
COMMENT ON COLUMN public.cnae_tributacao.cnae IS 'Código CNAE no formato 6201-5/00 (sem hífen e barra: 6201500)';
COMMENT ON COLUMN public.cnae_tributacao.codigo_tributacao IS 'Código de tributação nacional (cTribNac) - 6 dígitos: Item(2) + Subitem(2) + Desdobro(2)';

-- Tabela de cache para descrições de serviços
CREATE TABLE IF NOT EXISTS public.codigos_tributacao_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo_tributacao VARCHAR(6) NOT NULL UNIQUE,
  descricao_oficial TEXT NOT NULL,
  item_lista_lc116 VARCHAR(2) NOT NULL,
  subitem_lista_lc116 VARCHAR(2),
  desdobro_nacional VARCHAR(2),
  source VARCHAR(50) DEFAULT 'api_oficial',
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_codigos_tributacao_cache_codigo ON public.codigos_tributacao_cache(codigo_tributacao);

-- Triggers para updated_at
CREATE TRIGGER handle_updated_at_cnae_tributacao
  BEFORE UPDATE ON public.cnae_tributacao
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_codigos_tributacao_cache
  BEFORE UPDATE ON public.codigos_tributacao_cache
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS Policies
ALTER TABLE public.cnae_tributacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.codigos_tributacao_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to cnae_tributacao" ON public.cnae_tributacao
  FOR SELECT USING (true);

CREATE POLICY "Allow read access to codigos_tributacao_cache" ON public.codigos_tributacao_cache
  FOR SELECT USING (true);

-- ============================================
-- Migration: 20251106000002_seed_cnae_tributacao.sql
-- ============================================

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

-- Verificação final
SELECT 
  'Tabelas criadas com sucesso!' as status,
  COUNT(*) as total_cnae_mappings
FROM public.cnae_tributacao;

