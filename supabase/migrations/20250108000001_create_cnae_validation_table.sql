-- Tabela para armazenar validações de códigos tributários por município
-- Esta tabela é populada automaticamente quando uma nota fiscal é emitida com sucesso

CREATE TABLE IF NOT EXISTS public.cnae_codigo_tributacao_validacao (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cnae VARCHAR(7) NOT NULL,
  codigo_tributacao VARCHAR(6) NOT NULL,
  codigo_municipio VARCHAR(7) NOT NULL,
  validado BOOLEAN DEFAULT TRUE,
  primeira_validacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ultima_validacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_emissoes INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Garantir unicidade: um CNAE + código tributário + município só pode ter uma validação
  UNIQUE(cnae, codigo_tributacao, codigo_municipio)
);

-- Índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_cnae_validacao_cnae ON public.cnae_codigo_tributacao_validacao(cnae);
CREATE INDEX IF NOT EXISTS idx_cnae_validacao_codigo ON public.cnae_codigo_tributacao_validacao(codigo_tributacao);
CREATE INDEX IF NOT EXISTS idx_cnae_validacao_municipio ON public.cnae_codigo_tributacao_validacao(codigo_municipio);
CREATE INDEX IF NOT EXISTS idx_cnae_validacao_validado ON public.cnae_codigo_tributacao_validacao(validado) WHERE validado = TRUE;

-- Comentários para documentação
COMMENT ON TABLE public.cnae_codigo_tributacao_validacao IS 'Validações de códigos tributários por CNAE e município. Populada automaticamente quando notas fiscais são emitidas com sucesso.';
COMMENT ON COLUMN public.cnae_codigo_tributacao_validacao.cnae IS 'Código CNAE normalizado (sem hífen e barra)';
COMMENT ON COLUMN public.cnae_codigo_tributacao_validacao.codigo_tributacao IS 'Código de tributação nacional (cTribNac) - 6 dígitos';
COMMENT ON COLUMN public.cnae_codigo_tributacao_validacao.codigo_municipio IS 'Código IBGE do município (7 dígitos)';
COMMENT ON COLUMN public.cnae_codigo_tributacao_validacao.total_emissoes IS 'Total de notas fiscais emitidas com sucesso usando este código';

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_cnae_validacao_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.ultima_validacao = NOW();
  NEW.total_emissoes = COALESCE(NEW.total_emissoes, 0) + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar timestamp automaticamente
CREATE TRIGGER trigger_update_cnae_validacao_timestamp
BEFORE UPDATE ON public.cnae_codigo_tributacao_validacao
FOR EACH ROW
EXECUTE FUNCTION update_cnae_validacao_timestamp();

