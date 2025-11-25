-- Criar tabela para telemetria de escolhas de serviços
-- Permite aprender com o uso real e promover mapeamentos ao SEED

CREATE TABLE IF NOT EXISTS public.service_choices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cnae TEXT NOT NULL,
    lc116_code TEXT NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('seed', 'lexical-cnae', 'lexical-text', 'fallback')),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    free_text TEXT, -- Texto livre quando foi via fallback
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Índices para otimizar queries de análise
    INDEX idx_service_choices_cnae ON service_choices(cnae),
    INDEX idx_service_choices_lc116 ON service_choices(lc116_code),
    INDEX idx_service_choices_cnae_lc116 ON service_choices(cnae, lc116_code),
    INDEX idx_service_choices_source ON service_choices(source),
    INDEX idx_service_choices_created ON service_choices(created_at DESC)
);

-- Comentário explicativo
COMMENT ON TABLE public.service_choices IS 'Telemetria de escolhas de serviços pelos usuários. Usado para promover mapeamentos CNAE → LC116 ao SEED.';
COMMENT ON COLUMN public.service_choices.cnae IS 'Código CNAE normalizado (7 dígitos)';
COMMENT ON COLUMN public.service_choices.lc116_code IS 'Código LC116 escolhido (ex: 07.10)';
COMMENT ON COLUMN public.service_choices.source IS 'Origem da sugestão: seed (direto), lexical-cnae (match automático), lexical-text (fallback texto livre), fallback (último recurso)';
COMMENT ON COLUMN public.service_choices.free_text IS 'Texto livre digitado pelo usuário quando foi via fallback';

-- Enable RLS
ALTER TABLE public.service_choices ENABLE ROW LEVEL SECURITY;

-- Policies: Usuários podem inserir suas próprias escolhas
CREATE POLICY "Users can insert own choices" ON public.service_choices
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins podem ver todas as escolhas (para análise)
CREATE POLICY "Service role can view all choices" ON public.service_choices
    FOR SELECT USING (auth.jwt()->>'role' = 'service_role');

