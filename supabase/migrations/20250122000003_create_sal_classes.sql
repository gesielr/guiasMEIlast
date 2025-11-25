-- Migração: Criar tabela sal_classes para códigos GPS
-- Data: 2025-01-22
-- Descrição: Armazena dados mestre de códigos GPS e tipos de contribuinte

-- Criar tabela sal_classes
CREATE TABLE IF NOT EXISTS public.sal_classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_gps VARCHAR(10) UNIQUE NOT NULL,
    descricao TEXT NOT NULL,
    tipo_contribuinte VARCHAR(50) NOT NULL,
    aliquota_minima DECIMAL(5,4),
    aliquota_maxima DECIMAL(5,4),
    requer_nit BOOLEAN DEFAULT FALSE,
    ativo BOOLEAN DEFAULT TRUE,
    valid_from DATE NOT NULL,
    valid_to DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comentários
COMMENT ON TABLE public.sal_classes IS 'Dados mestre de códigos GPS e tipos de contribuinte';
COMMENT ON COLUMN public.sal_classes.codigo_gps IS 'Código GPS oficial (ex: 1007, 1163)';
COMMENT ON COLUMN public.sal_classes.descricao IS 'Descrição do tipo de GPS';
COMMENT ON COLUMN public.sal_classes.tipo_contribuinte IS 'Tipo: ci_normal, ci_simplificado, domestico, rural, etc';
COMMENT ON COLUMN public.sal_classes.aliquota_minima IS 'Alíquota mínima aplicável';
COMMENT ON COLUMN public.sal_classes.aliquota_maxima IS 'Alíquota máxima aplicável';
COMMENT ON COLUMN public.sal_classes.requer_nit IS 'Se requer NIT/PIS/PASEP';
COMMENT ON COLUMN public.sal_classes.ativo IS 'Se o código está ativo';
COMMENT ON COLUMN public.sal_classes.valid_from IS 'Data de início de validade';
COMMENT ON COLUMN public.sal_classes.valid_to IS 'Data de fim de validade (NULL = indefinido)';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_sal_classes_codigo_gps ON public.sal_classes (codigo_gps);
CREATE INDEX IF NOT EXISTS idx_sal_classes_tipo_contribuinte ON public.sal_classes (tipo_contribuinte);
CREATE INDEX IF NOT EXISTS idx_sal_classes_validity ON public.sal_classes (valid_from, valid_to);
CREATE INDEX IF NOT EXISTS idx_sal_classes_ativo ON public.sal_classes (ativo);

-- Enable RLS
ALTER TABLE public.sal_classes ENABLE ROW LEVEL SECURITY;

-- Policy: Leitura pública
CREATE POLICY "Enable read access for all users" ON public.sal_classes
    FOR SELECT USING (TRUE);

-- Policy: Apenas service_role pode modificar
CREATE POLICY "Enable insert for service_role only" ON public.sal_classes
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Enable update for service_role only" ON public.sal_classes
    FOR UPDATE USING (auth.role() = 'service_role');

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_sal_classes_updated_at ON public.sal_classes;
CREATE TRIGGER update_sal_classes_updated_at
    BEFORE UPDATE ON public.sal_classes
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Seed: Popular com códigos GPS principais
INSERT INTO public.sal_classes (codigo_gps, descricao, tipo_contribuinte, aliquota_minima, aliquota_maxima, requer_nit, ativo, valid_from)
VALUES
    ('1007', 'Contribuinte Individual - Normal (20%)', 'ci_normal', 0.20, 0.20, TRUE, TRUE, '2025-01-01'),
    ('1163', 'Contribuinte Individual - Simplificado (11%)', 'ci_simplificado', 0.11, 0.11, TRUE, TRUE, '2025-01-01'),
    ('1120', 'Contribuinte Individual - Complementação', 'ci_normal', 0.09, 0.09, TRUE, TRUE, '2025-01-01'),
    ('1147', 'Contribuinte Individual - Facultativo (20%)', 'facultativo', 0.20, 0.20, FALSE, TRUE, '2025-01-01'),
    ('1929', 'Contribuinte Individual - Facultativo Baixa Renda (5%)', 'facultativo_baixa_renda', 0.05, 0.05, FALSE, TRUE, '2025-01-01'),
    ('1600', 'Empregado Doméstico', 'domestico', 0.08, 0.14, TRUE, TRUE, '2025-01-01'),
    ('2003', 'Produtor Rural - Pessoa Física', 'rural', 0.115, 0.115, FALSE, TRUE, '2025-01-01'),
    ('2100', 'Segurado Especial', 'segurado_especial', 0.00, 0.00, FALSE, TRUE, '2025-01-01')
ON CONFLICT (codigo_gps) DO UPDATE SET
    descricao = EXCLUDED.descricao,
    tipo_contribuinte = EXCLUDED.tipo_contribuinte,
    aliquota_minima = EXCLUDED.aliquota_minima,
    aliquota_maxima = EXCLUDED.aliquota_maxima,
    requer_nit = EXCLUDED.requer_nit,
    ativo = EXCLUDED.ativo,
    valid_from = EXCLUDED.valid_from,
    updated_at = NOW();
