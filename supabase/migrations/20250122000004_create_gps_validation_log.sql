-- Migração: Criar tabela gps_validation_log para auditoria de validações
-- Data: 2025-01-22
-- Descrição: Registra todas as validações realizadas durante emissão de GPS

-- Criar tabela gps_validation_log
CREATE TABLE IF NOT EXISTS public.gps_validation_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gps_id UUID REFERENCES public.gps_history_v2(id) ON DELETE CASCADE,
    validation_type VARCHAR(50) NOT NULL,
    passed BOOLEAN NOT NULL,
    error_message TEXT,
    validation_data JSONB,
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comentários
COMMENT ON TABLE public.gps_validation_log IS 'Log de validações realizadas durante emissão de GPS';
COMMENT ON COLUMN public.gps_validation_log.validation_type IS 'Tipo: teto_check, periodo_check, duplicidade_check, cpf_check, valor_check, tipo_check';
COMMENT ON COLUMN public.gps_validation_log.passed IS 'Se a validação passou (TRUE) ou falhou (FALSE)';
COMMENT ON COLUMN public.gps_validation_log.error_message IS 'Mensagem de erro se a validação falhou';
COMMENT ON COLUMN public.gps_validation_log.validation_data IS 'Dados adicionais da validação (JSON)';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_validation_gps_id ON public.gps_validation_log (gps_id);
CREATE INDEX IF NOT EXISTS idx_validation_checked_at ON public.gps_validation_log (checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_validation_type ON public.gps_validation_log (validation_type);
CREATE INDEX IF NOT EXISTS idx_validation_passed ON public.gps_validation_log (passed);

-- Enable RLS
ALTER TABLE public.gps_validation_log ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários podem ver logs de suas próprias GPS
CREATE POLICY "Users can view own GPS validations" ON public.gps_validation_log
    FOR SELECT USING (
        (SELECT user_id FROM public.gps_history_v2 WHERE id = gps_id) = auth.uid()
    );

-- Policy: Service role pode inserir logs
CREATE POLICY "Service role can insert validations" ON public.gps_validation_log
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Policy: Service role pode fazer tudo
CREATE POLICY "Service role can do everything" ON public.gps_validation_log
    FOR ALL USING (auth.role() = 'service_role');
