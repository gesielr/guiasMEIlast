-- Migração: Criar tabela gps_history_v2 para histórico completo de GPS
-- Data: 2025-01-22
-- Descrição: Armazena histórico completo de GPS emitidas conforme documento técnico SAL 2025
-- Nota: Criando como gps_history_v2 para não conflitar com gps_emissions existente

-- Criar tabela gps_history_v2
CREATE TABLE IF NOT EXISTS public.gps_history_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    cpf VARCHAR(11) NOT NULL,
    nome_contribuinte TEXT,
    rg_contribuinte TEXT,
    endereco_contribuinte TEXT,
    pis_pasep_nit VARCHAR(15),
    periodo_mes INT NOT NULL CHECK (periodo_mes >= 1 AND periodo_mes <= 12),
    periodo_ano INT NOT NULL CHECK (periodo_ano >= 1900),
    tipo_contribuinte VARCHAR(50) NOT NULL,
    codigo_gps VARCHAR(10) NOT NULL,
    valor_base DECIMAL(10,2) NOT NULL,
    aliquota DECIMAL(5,4) NOT NULL,
    valor_contribuicao DECIMAL(10,2) NOT NULL,
    valor_juros DECIMAL(10,2) DEFAULT 0.00,
    valor_multa DECIMAL(10,2) DEFAULT 0.00,
    valor_total DECIMAL(10,2) NOT NULL,
    vencimento DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'emitted' CHECK (status IN ('draft', 'emitted', 'paid', 'cancelled', 'overdue')),
    reference_number VARCHAR(50) UNIQUE NOT NULL,
    linha_digitavel VARCHAR(100) NOT NULL,
    codigo_barras VARCHAR(48),
    pdf_url TEXT,
    metodo_emissao VARCHAR(50) DEFAULT 'v2_secure',
    validado_sal BOOLEAN DEFAULT FALSE,
    validado_em TIMESTAMP WITH TIME ZONE,
    emitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint de duplicidade: mesmo CPF, período e tipo não pode ter duas GPS
    UNIQUE(cpf, periodo_mes, periodo_ano, tipo_contribuinte)
);

-- Comentários
COMMENT ON TABLE public.gps_history_v2 IS 'Histórico completo de GPS emitidas (versão 2 - SAL 2025)';
COMMENT ON COLUMN public.gps_history_v2.cpf IS 'CPF do contribuinte (11 dígitos)';
COMMENT ON COLUMN public.gps_history_v2.tipo_contribuinte IS 'Tipo: ci_normal, ci_simplificado, domestico, rural, etc';
COMMENT ON COLUMN public.gps_history_v2.codigo_gps IS 'Código GPS oficial (ex: 1007, 1163)';
COMMENT ON COLUMN public.gps_history_v2.aliquota IS 'Alíquota aplicada (decimal, ex: 0.20 para 20%)';
COMMENT ON COLUMN public.gps_history_v2.status IS 'Status da GPS: draft, emitted, paid, cancelled, overdue';
COMMENT ON COLUMN public.gps_history_v2.reference_number IS 'Número de referência único da GPS';
COMMENT ON COLUMN public.gps_history_v2.linha_digitavel IS 'Linha digitável para pagamento';
COMMENT ON COLUMN public.gps_history_v2.codigo_barras IS 'Código de barras (48 dígitos)';
COMMENT ON COLUMN public.gps_history_v2.metodo_emissao IS 'Método usado: v2_secure, sal_validado, sal_oficial, local';
COMMENT ON COLUMN public.gps_history_v2.validado_sal IS 'Se foi validado no sistema SAL oficial';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_gps_history_v2_cpf_emitted_at ON public.gps_history_v2 (cpf, emitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_gps_history_v2_status ON public.gps_history_v2 (status);
CREATE INDEX IF NOT EXISTS idx_gps_history_v2_vencimento ON public.gps_history_v2 (vencimento);
CREATE INDEX IF NOT EXISTS idx_gps_history_v2_user_id ON public.gps_history_v2 (user_id);
CREATE INDEX IF NOT EXISTS idx_gps_history_v2_periodo ON public.gps_history_v2 (periodo_ano, periodo_mes);
CREATE INDEX IF NOT EXISTS idx_gps_history_v2_reference ON public.gps_history_v2 (reference_number);

-- Enable RLS
ALTER TABLE public.gps_history_v2 ENABLE ROW LEVEL SECURITY;

-- Policies: Usuário só pode ver suas próprias GPS
CREATE POLICY "Users can view own GPS" ON public.gps_history_v2
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own GPS" ON public.gps_history_v2
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own GPS" ON public.gps_history_v2
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own GPS" ON public.gps_history_v2
    FOR DELETE USING (auth.uid() = user_id);

-- Policy: Service role pode fazer tudo
CREATE POLICY "Service role can do everything" ON public.gps_history_v2
    FOR ALL USING (auth.role() = 'service_role');

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_gps_history_v2_updated_at ON public.gps_history_v2;
CREATE TRIGGER update_gps_history_v2_updated_at
    BEFORE UPDATE ON public.gps_history_v2
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Trigger para atualizar status para 'overdue' automaticamente
CREATE OR REPLACE FUNCTION public.update_gps_overdue_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'emitted' AND NEW.vencimento < CURRENT_DATE THEN
        NEW.status = 'overdue';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_gps_overdue ON public.gps_history_v2;
CREATE TRIGGER check_gps_overdue
    BEFORE INSERT OR UPDATE ON public.gps_history_v2
    FOR EACH ROW
    EXECUTE FUNCTION public.update_gps_overdue_status();
