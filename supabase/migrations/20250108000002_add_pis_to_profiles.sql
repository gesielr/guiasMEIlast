-- Adicionar coluna PIS na tabela profiles
-- PIS é obrigatório para usuários autônomos (GPS)

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS pis TEXT;

-- Comentário para documentação
COMMENT ON COLUMN public.profiles.pis IS 'Número do PIS/NIT (criptografado) - obrigatório para usuários autônomos';

-- Índice para busca rápida (se necessário no futuro)
-- CREATE INDEX IF NOT EXISTS idx_profiles_pis ON public.profiles(pis) WHERE pis IS NOT NULL;

