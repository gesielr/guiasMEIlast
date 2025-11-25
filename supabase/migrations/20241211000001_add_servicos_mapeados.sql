-- Adicionar campo para armazenar serviços mapeados automaticamente no cadastro
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS servicos_mapeados JSONB DEFAULT '[]'::jsonb;

-- Comentário explicativo
COMMENT ON COLUMN public.profiles.servicos_mapeados IS 'Lista de serviços mapeados automaticamente dos CNAEs do usuário no momento do cadastro. Formato: [{ numero, descricao, codigoTributacao, itemListaLc116, subitemLc116 }]';

