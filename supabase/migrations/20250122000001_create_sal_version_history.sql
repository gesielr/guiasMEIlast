-- Migração: Criar tabela sal_version_history para versionamento de regras SAL
-- Data: 2025-01-22
-- Descrição: Armazena teto INSS, salário mínimo e alíquotas por ano

-- Criar tabela sal_version_history
CREATE TABLE IF NOT EXISTS public.sal_version_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    effective_date DATE NOT NULL UNIQUE,
    teto_inss DECIMAL(10,2) NOT NULL,
    salario_minimo DECIMAL(10,2) NOT NULL,
    tabela_aliquotas JSONB NOT NULL,
    tabela_codes JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comentários
COMMENT ON TABLE public.sal_version_history IS 'Versionamento de regras SAL por ano (teto, salário mínimo, alíquotas)';
COMMENT ON COLUMN public.sal_version_history.effective_date IS 'Data de vigência (geralmente 01/01 de cada ano)';
COMMENT ON COLUMN public.sal_version_history.teto_inss IS 'Teto máximo de contribuição INSS';
COMMENT ON COLUMN public.sal_version_history.salario_minimo IS 'Salário mínimo vigente';
COMMENT ON COLUMN public.sal_version_history.tabela_aliquotas IS 'Faixas e alíquotas por tipo de contribuinte (JSON)';
COMMENT ON COLUMN public.sal_version_history.tabela_codes IS 'Mapeamento de códigos GPS e tipos (JSON)';

-- Índice para performance (busca por data)
CREATE INDEX IF NOT EXISTS idx_sal_effective_date ON public.sal_version_history (effective_date DESC);

-- Enable RLS
ALTER TABLE public.sal_version_history ENABLE ROW LEVEL SECURITY;

-- Policy: Leitura pública (todos podem ler regras SAL)
CREATE POLICY "Enable read access for all users" ON public.sal_version_history
    FOR SELECT USING (TRUE);

-- Policy: Apenas service_role pode inserir/atualizar
CREATE POLICY "Enable insert for service_role only" ON public.sal_version_history
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Enable update for service_role only" ON public.sal_version_history
    FOR UPDATE USING (auth.role() = 'service_role');

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_sal_version_history_updated_at ON public.sal_version_history;
CREATE TRIGGER update_sal_version_history_updated_at
    BEFORE UPDATE ON public.sal_version_history
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Seed: Popular com dados de 2025
INSERT INTO public.sal_version_history (effective_date, teto_inss, salario_minimo, tabela_aliquotas, tabela_codes)
VALUES (
    '2025-01-01',
    7786.02,
    1412.00,
    '{
        "ci_normal": [
            {"faixa_min": 0.00, "faixa_max": 1412.00, "aliquota": 0.075},
            {"faixa_min": 1412.01, "faixa_max": 2666.68, "aliquota": 0.09},
            {"faixa_min": 2666.69, "faixa_max": 4000.03, "aliquota": 0.12},
            {"faixa_min": 4000.04, "faixa_max": 7786.02, "aliquota": 0.14}
        ],
        "ci_simplificado": [
            {"faixa_min": 0.00, "faixa_max": 7786.02, "aliquota": 0.11}
        ],
        "domestico": [
            {"faixa_min": 0.00, "faixa_max": 7786.02, "aliquota": 0.08}
        ],
        "rural": [
            {"faixa_min": 0.00, "faixa_max": 999999.99, "aliquota": 0.115}
        ]
    }'::jsonb,
    '{
        "1007": {"tipo": "ci_normal", "descricao": "Contribuinte Individual - Normal"},
        "1163": {"tipo": "ci_simplificado", "descricao": "Contribuinte Individual - Simplificado"},
        "1600": {"tipo": "domestico", "descricao": "Empregado Doméstico"},
        "2003": {"tipo": "rural", "descricao": "Produtor Rural"}
    }'::jsonb
)
ON CONFLICT (effective_date) DO UPDATE SET
    teto_inss = EXCLUDED.teto_inss,
    salario_minimo = EXCLUDED.salario_minimo,
    tabela_aliquotas = EXCLUDED.tabela_aliquotas,
    tabela_codes = EXCLUDED.tabela_codes,
    updated_at = NOW();
