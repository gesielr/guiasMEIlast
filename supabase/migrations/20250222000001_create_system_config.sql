-- Tabela de configurações do sistema
-- Armazena configurações globais como salário mínimo, teto INSS, etc.

CREATE TABLE IF NOT EXISTS public.system_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key TEXT NOT NULL UNIQUE,
    config_value TEXT NOT NULL,
    config_type TEXT NOT NULL DEFAULT 'string', -- 'string', 'number', 'boolean', 'json'
    description TEXT,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_system_config_key ON public.system_config(config_key);

-- Habilitar RLS
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Política: Apenas admins podem ler e escrever
CREATE POLICY "Admins can manage system config"
    ON public.system_config
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.user_type = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.user_type = 'admin'
        )
    );

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION handle_system_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_system_config_updated_at
    BEFORE UPDATE ON public.system_config
    FOR EACH ROW
    EXECUTE FUNCTION handle_system_config_updated_at();

-- Inserir valores iniciais
INSERT INTO public.system_config (config_key, config_value, config_type, description)
VALUES 
    ('salario_minimo', '1518.00', 'number', 'Salário mínimo vigente usado para cálculos de GPS'),
    ('teto_inss', '7786.02', 'number', 'Teto do INSS para cálculos de contribuições'),
    ('ano_vigente', '2025', 'number', 'Ano de vigência das configurações')
ON CONFLICT (config_key) DO NOTHING;

