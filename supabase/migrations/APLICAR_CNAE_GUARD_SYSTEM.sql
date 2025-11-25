-- ============================================
-- Script Unificado: Sistema de Guarda-Corpo CNAE
-- ============================================
-- Execute este script no Supabase Dashboard -> SQL Editor
-- OU via CLI: psql <connection_string> -f APLICAR_CNAE_GUARD_SYSTEM.sql
--
-- Este script aplica:
-- 1. Tabelas do sistema de guarda-corpo (20251106000003_create_cnae_guard_system.sql)
-- 2. Seed do catálogo e semente (20251106000004_seed_catalogo_and_semente.sql)
-- ============================================

-- ============================================
-- PARTE 1: Sistema de Guarda-Corpo
-- ============================================

-- 1) Catálogo Nacional de cTribNac
CREATE TABLE IF NOT EXISTS public.catalogo_ctribnac (
  ctribnac VARCHAR(6) PRIMARY KEY,
  descricao TEXT NOT NULL,
  item_lista_lc116 VARCHAR(2) NOT NULL,
  subitem_lista_lc116 VARCHAR(2),
  desdobro_nacional VARCHAR(2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_catalogo_ctribnac_item ON public.catalogo_ctribnac(item_lista_lc116, subitem_lista_lc116);

COMMENT ON TABLE public.catalogo_ctribnac IS 'Catálogo nacional de códigos de tributação (cTribNac) da LC 116/2003. Fonte de verdade para vocabulário de serviços.';

-- 2) Espelho dos Parâmetros Municipais (cache atualizável)
CREATE TABLE IF NOT EXISTS public.muni_parametros (
  cod_ibge VARCHAR(7) NOT NULL,
  ctribnac VARCHAR(6) NOT NULL REFERENCES public.catalogo_ctribnac(ctribnac),
  vigente_desde DATE NOT NULL,
  vigente_ate DATE,
  administrado BOOLEAN NOT NULL DEFAULT true,
  last_fetch TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (cod_ibge, ctribnac, vigente_desde)
);

CREATE INDEX IF NOT EXISTS idx_muni_parametros_cod_ibge ON public.muni_parametros(cod_ibge);
CREATE INDEX IF NOT EXISTS idx_muni_parametros_ctribnac ON public.muni_parametros(ctribnac);
CREATE INDEX IF NOT EXISTS idx_muni_parametros_vigencia ON public.muni_parametros(vigente_desde, vigente_ate);

COMMENT ON TABLE public.muni_parametros IS 'Espelho dos parâmetros municipais da API Nacional. Cache dos códigos administrados por município com vigências.';

-- 3) Semente CNAE → Candidatos cTribNac (heurística)
CREATE TABLE IF NOT EXISTS public.cnae_to_ctribnac_seed (
  cnae_subclasse VARCHAR(10) NOT NULL,
  ctribnac VARCHAR(6) NOT NULL REFERENCES public.catalogo_ctribnac(ctribnac),
  weight INTEGER NOT NULL DEFAULT 10,
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (cnae_subclasse, ctribnac)
);

CREATE INDEX IF NOT EXISTS idx_cnae_seed_cnae ON public.cnae_to_ctribnac_seed(cnae_subclasse);
CREATE INDEX IF NOT EXISTS idx_cnae_seed_weight ON public.cnae_to_ctribnac_seed(weight DESC);

COMMENT ON TABLE public.cnae_to_ctribnac_seed IS 'Semente heurística CNAE → cTribNac. Usada para sugerir candidatos, mas validação final é via Parâmetros Municipais.';

-- 4) Matriz CNPJ × Município → Códigos Permitidos (allowlist)
CREATE TABLE IF NOT EXISTS public.cnpj_servicos_permitidos (
  cnpj CHAR(14) NOT NULL,
  cod_ibge VARCHAR(7) NOT NULL,
  ctribnac VARCHAR(6) NOT NULL REFERENCES public.catalogo_ctribnac(ctribnac),
  origem VARCHAR(20) NOT NULL DEFAULT 'auto',
  valido_desde DATE NOT NULL,
  valido_ate DATE,
  competencia_calculada VARCHAR(7) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (cnpj, cod_ibge, ctribnac, valido_desde)
);

CREATE INDEX IF NOT EXISTS idx_cnpj_servicos_cnpj ON public.cnpj_servicos_permitidos(cnpj);
CREATE INDEX IF NOT EXISTS idx_cnpj_servicos_ibge ON public.cnpj_servicos_permitidos(cod_ibge);
CREATE INDEX IF NOT EXISTS idx_cnpj_servicos_vigencia ON public.cnpj_servicos_permitidos(valido_desde, valido_ate);
CREATE INDEX IF NOT EXISTS idx_cnpj_servicos_competencia ON public.cnpj_servicos_permitidos(competencia_calculada);

COMMENT ON TABLE public.cnpj_servicos_permitidos IS 'Allowlist de serviços permitidos por CNPJ e município. Resultado da interseção CNAE × Parâmetros Municipais.';

-- Triggers para updated_at
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at') THEN
    DROP TRIGGER IF EXISTS handle_updated_at_catalogo_ctribnac ON public.catalogo_ctribnac;
    CREATE TRIGGER handle_updated_at_catalogo_ctribnac
      BEFORE UPDATE ON public.catalogo_ctribnac
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

    DROP TRIGGER IF EXISTS handle_updated_at_muni_parametros ON public.muni_parametros;
    CREATE TRIGGER handle_updated_at_muni_parametros
      BEFORE UPDATE ON public.muni_parametros
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

    DROP TRIGGER IF EXISTS handle_updated_at_cnae_seed ON public.cnae_to_ctribnac_seed;
    CREATE TRIGGER handle_updated_at_cnae_seed
      BEFORE UPDATE ON public.cnae_to_ctribnac_seed
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

    DROP TRIGGER IF EXISTS handle_updated_at_cnpj_servicos ON public.cnpj_servicos_permitidos;
    CREATE TRIGGER handle_updated_at_cnpj_servicos
      BEFORE UPDATE ON public.cnpj_servicos_permitidos
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

-- RLS Policies
ALTER TABLE public.catalogo_ctribnac ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.muni_parametros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cnae_to_ctribnac_seed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cnpj_servicos_permitidos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access to catalogo_ctribnac" ON public.catalogo_ctribnac;
CREATE POLICY "Allow read access to catalogo_ctribnac" ON public.catalogo_ctribnac
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow read access to muni_parametros" ON public.muni_parametros;
CREATE POLICY "Allow read access to muni_parametros" ON public.muni_parametros
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow read access to cnae_to_ctribnac_seed" ON public.cnae_to_ctribnac_seed;
CREATE POLICY "Allow read access to cnae_to_ctribnac_seed" ON public.cnae_to_ctribnac_seed
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow read access to cnpj_servicos_permitidos" ON public.cnpj_servicos_permitidos;
CREATE POLICY "Allow read access to cnpj_servicos_permitidos" ON public.cnpj_servicos_permitidos
  FOR SELECT USING (true);

-- ============================================
-- PARTE 2: Seed Catálogo e Semente
-- ============================================

-- Popular Catálogo Nacional de cTribNac
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

-- Adicionar códigos comuns
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

-- Popular Semente CNAE → cTribNac
INSERT INTO public.cnae_to_ctribnac_seed (cnae_subclasse, ctribnac, weight, source)
SELECT 
  cnae as cnae_subclasse,
  codigo_tributacao as ctribnac,
  10 as weight,
  'cnae_tributacao_table' as source
FROM public.cnae_tributacao
WHERE ativo = true
ON CONFLICT (cnae_subclasse, ctribnac) DO UPDATE
SET weight = GREATEST(cnae_to_ctribnac_seed.weight, 10);

-- Adicionar mapeamentos com pesos diferentes
INSERT INTO public.cnae_to_ctribnac_seed (cnae_subclasse, ctribnac, weight, source)
VALUES
  ('8121400', '140101', 15, 'manual'),
  ('8122100', '140201', 15, 'manual'),
  ('8129000', '140301', 10, 'manual'),
  ('8129000', '140101', 8, 'manual'),
  ('8129000', '140201', 8, 'manual'),
  ('6201500', '140301', 20, 'manual'),
  ('6201500', '140302', 15, 'manual'),
  ('6202300', '140401', 20, 'manual'),
  ('6202300', '140402', 15, 'manual'),
  ('6203100', '140501', 18, 'manual'),
  ('6204000', '140601', 18, 'manual'),
  ('6209100', '140901', 15, 'manual')
ON CONFLICT (cnae_subclasse, ctribnac) DO UPDATE
SET weight = GREATEST(cnae_to_ctribnac_seed.weight, EXCLUDED.weight);

-- ============================================
-- PARTE 3: Verificação
-- ============================================

SELECT 
  'Catálogo cTribNac' as tabela,
  COUNT(*) as total_registros
FROM public.catalogo_ctribnac;

SELECT 
  'Semente CNAE → cTribNac' as tabela,
  COUNT(*) as total_registros
FROM public.cnae_to_ctribnac_seed;

SELECT 
  'Tabelas criadas' as status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'catalogo_ctribnac') THEN '✅ catalogo_ctribnac'
    ELSE '❌ catalogo_ctribnac'
  END as catalogo,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'muni_parametros') THEN '✅ muni_parametros'
    ELSE '❌ muni_parametros'
  END as parametros,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cnae_to_ctribnac_seed') THEN '✅ cnae_to_ctribnac_seed'
    ELSE '❌ cnae_to_ctribnac_seed'
  END as semente,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cnpj_servicos_permitidos') THEN '✅ cnpj_servicos_permitidos'
    ELSE '❌ cnpj_servicos_permitidos'
  END as allowlist;

