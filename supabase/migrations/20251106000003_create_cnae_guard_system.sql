-- ============================================
-- Sistema de Guarda-Corpo CNAE + Parâmetros Municipais
-- ============================================
-- Este sistema implementa a estratégia de usar CNAE como "trava de segurança"
-- e API de Parâmetros Municipais como fonte de verdade para códigos válidos
-- ============================================

-- 1) Catálogo Nacional de cTribNac
-- Fonte: Lista Nacional de Serviços (LC 116/2003)
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
-- Recebe dados da API de Parâmetros Municipais do Sistema Nacional
CREATE TABLE IF NOT EXISTS public.muni_parametros (
  cod_ibge VARCHAR(7) NOT NULL,
  ctribnac VARCHAR(6) NOT NULL REFERENCES public.catalogo_ctribnac(ctribnac),
  vigente_desde DATE NOT NULL,
  vigente_ate DATE, -- null = sem fim definido
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
-- Tabela de correlação não-oficial para sugerir códigos compatíveis
CREATE TABLE IF NOT EXISTS public.cnae_to_ctribnac_seed (
  cnae_subclasse VARCHAR(10) NOT NULL, -- ex.: '8121-4/00' ou '8121400'
  ctribnac VARCHAR(6) NOT NULL REFERENCES public.catalogo_ctribnac(ctribnac),
  weight INTEGER NOT NULL DEFAULT 10, -- Peso/relevância da associação (maior = mais relevante)
  source TEXT, -- Fonte da associação ('lc116', 'manual', 'usage_stats', etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (cnae_subclasse, ctribnac)
);

CREATE INDEX IF NOT EXISTS idx_cnae_seed_cnae ON public.cnae_to_ctribnac_seed(cnae_subclasse);
CREATE INDEX IF NOT EXISTS idx_cnae_seed_weight ON public.cnae_to_ctribnac_seed(weight DESC);

COMMENT ON TABLE public.cnae_to_ctribnac_seed IS 'Semente heurística CNAE → cTribNac. Usada para sugerir candidatos, mas validação final é via Parâmetros Municipais.';

-- 4) Matriz CNPJ × Município → Códigos Permitidos (allowlist)
-- Persiste o resultado da interseção: (candidatos do CNAE) ∩ (códigos administrados pelo município)
CREATE TABLE IF NOT EXISTS public.cnpj_servicos_permitidos (
  cnpj CHAR(14) NOT NULL,
  cod_ibge VARCHAR(7) NOT NULL,
  ctribnac VARCHAR(6) NOT NULL REFERENCES public.catalogo_ctribnac(ctribnac),
  origem VARCHAR(20) NOT NULL DEFAULT 'auto', -- 'auto' (CNAE+parametros) | 'manual' | 'fallback'
  valido_desde DATE NOT NULL,
  valido_ate DATE, -- null = sem fim definido
  competencia_calculada VARCHAR(7) NOT NULL, -- YYYY-MM da competência usada no cálculo
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

-- RLS Policies (leitura pública para dados de referência)
ALTER TABLE public.catalogo_ctribnac ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.muni_parametros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cnae_to_ctribnac_seed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cnpj_servicos_permitidos ENABLE ROW LEVEL SECURITY;

-- Políticas de leitura pública
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

-- Política especial: CNPJ pode ver apenas seus próprios serviços permitidos
DROP POLICY IF EXISTS "Allow read own servicos_permitidos" ON public.cnpj_servicos_permitidos;
CREATE POLICY "Allow read own servicos_permitidos" ON public.cnpj_servicos_permitidos
  FOR SELECT USING (
    -- Permitir se for service_role ou se o CNPJ corresponder ao usuário
    auth.role() = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.document = cnpj_servicos_permitidos.cnpj 
      AND profiles.id = auth.uid()
    )
  );

