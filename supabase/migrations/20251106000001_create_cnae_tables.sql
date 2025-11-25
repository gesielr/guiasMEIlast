-- Tabela para armazenar CNAEs do prestador
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS cnae_principal VARCHAR(7),
ADD COLUMN IF NOT EXISTS cnaes_secundarios JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS cnaes_updated_at TIMESTAMP WITH TIME ZONE;

-- Índice para busca rápida por CNAE
CREATE INDEX IF NOT EXISTS idx_profiles_cnae_principal ON public.profiles(cnae_principal);

-- Tabela de mapeamento CNAE → Códigos de Tributação Nacional
-- Esta tabela será populada com dados da Lista Nacional de Serviços (LC 116/2003)
CREATE TABLE IF NOT EXISTS public.cnae_tributacao (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cnae VARCHAR(7) NOT NULL,
  codigo_tributacao VARCHAR(6) NOT NULL, -- cTribNac (6 dígitos)
  descricao_servico TEXT NOT NULL,
  item_lista_lc116 VARCHAR(2) NOT NULL DEFAULT '01', -- Item da LC 116
  subitem_lista_lc116 VARCHAR(2), -- Subitem da LC 116
  desdobro_nacional VARCHAR(2), -- Desdobro nacional
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Garantir unicidade: um CNAE pode ter múltiplos códigos, mas não duplicados
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
COMMENT ON COLUMN public.cnae_tributacao.descricao_servico IS 'Descrição oficial do serviço conforme Lista Nacional de Serviços';
COMMENT ON COLUMN public.cnae_tributacao.item_lista_lc116 IS 'Item da Lista de Serviços LC 116/2003 (2 dígitos)';
COMMENT ON COLUMN public.cnae_tributacao.subitem_lista_lc116 IS 'Subitem da Lista de Serviços LC 116/2003 (2 dígitos)';
COMMENT ON COLUMN public.cnae_tributacao.desdobro_nacional IS 'Desdobro nacional (2 dígitos)';

-- Tabela de cache para descrições de serviços da API oficial
-- Evita consultas repetidas à API
CREATE TABLE IF NOT EXISTS public.codigos_tributacao_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo_tributacao VARCHAR(6) NOT NULL UNIQUE,
  descricao_oficial TEXT NOT NULL,
  item_lista_lc116 VARCHAR(2) NOT NULL,
  subitem_lista_lc116 VARCHAR(2),
  desdobro_nacional VARCHAR(2),
  source VARCHAR(50) DEFAULT 'api_oficial', -- 'api_oficial' | 'manual'
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_codigos_tributacao_cache_codigo ON public.codigos_tributacao_cache(codigo_tributacao);

-- Trigger para atualizar updated_at
CREATE TRIGGER handle_updated_at_cnae_tributacao
  BEFORE UPDATE ON public.cnae_tributacao
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_codigos_tributacao_cache
  BEFORE UPDATE ON public.codigos_tributacao_cache
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS Policies (permitir leitura pública para consultas, mas escrita apenas para service_role)
ALTER TABLE public.cnae_tributacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.codigos_tributacao_cache ENABLE ROW LEVEL SECURITY;

-- Política: todos podem ler (dados públicos de referência)
CREATE POLICY "Allow read access to cnae_tributacao" ON public.cnae_tributacao
  FOR SELECT USING (true);

CREATE POLICY "Allow read access to codigos_tributacao_cache" ON public.codigos_tributacao_cache
  FOR SELECT USING (true);

-- Política: apenas service_role pode escrever (dados de referência)
-- (A escrita será feita via service_role ou scripts de migração)

