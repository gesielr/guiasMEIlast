-- SQL para adicionar colunas faltantes na tabela guias_inss
-- Execute este script no SQL Editor do Supabase

-- Campos de identificação do contribuinte
ALTER TABLE guias_inss ADD COLUMN IF NOT EXISTS cpf VARCHAR(14);
ALTER TABLE guias_inss ADD COLUMN IF NOT EXISTS nome VARCHAR(255);
ALTER TABLE guias_inss ADD COLUMN IF NOT EXISTS rg VARCHAR(20);
ALTER TABLE guias_inss ADD COLUMN IF NOT EXISTS endereco TEXT;
ALTER TABLE guias_inss ADD COLUMN IF NOT EXISTS pis_pasep VARCHAR(20);

-- Campos de período detalhado
ALTER TABLE guias_inss ADD COLUMN IF NOT EXISTS periodo_mes INTEGER;
ALTER TABLE guias_inss ADD COLUMN IF NOT EXISTS periodo_ano INTEGER;

-- Tipo de contribuinte
ALTER TABLE guias_inss ADD COLUMN IF NOT EXISTS tipo_contribuinte VARCHAR(50);

-- Campos de valores detalhados
ALTER TABLE guias_inss ADD COLUMN IF NOT EXISTS valor_base DECIMAL(10,2);
ALTER TABLE guias_inss ADD COLUMN IF NOT EXISTS aliquota DECIMAL(5,2);
ALTER TABLE guias_inss ADD COLUMN IF NOT EXISTS valor_contribuicao DECIMAL(10,2);
ALTER TABLE guias_inss ADD COLUMN IF NOT EXISTS valor_juros DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE guias_inss ADD COLUMN IF NOT EXISTS valor_multa DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE guias_inss ADD COLUMN IF NOT EXISTS valor_total DECIMAL(10,2);

-- Campos de controle e auditoria
ALTER TABLE guias_inss ADD COLUMN IF NOT EXISTS reference_number VARCHAR(100);
ALTER TABLE guias_inss ADD COLUMN IF NOT EXISTS linha_digitavel VARCHAR(200);
ALTER TABLE guias_inss ADD COLUMN IF NOT EXISTS codigo_barras VARCHAR(200);
ALTER TABLE guias_inss ADD COLUMN IF NOT EXISTS metodo_emissao VARCHAR(50);
ALTER TABLE guias_inss ADD COLUMN IF NOT EXISTS vencimento DATE;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_guias_cpf ON guias_inss(cpf);
CREATE INDEX IF NOT EXISTS idx_guias_reference ON guias_inss(reference_number);
CREATE INDEX IF NOT EXISTS idx_guias_periodo ON guias_inss(periodo_ano, periodo_mes);

-- Comentários nas colunas para documentação
COMMENT ON COLUMN guias_inss.cpf IS 'CPF do contribuinte';
COMMENT ON COLUMN guias_inss.nome IS 'Nome completo do contribuinte';
COMMENT ON COLUMN guias_inss.pis_pasep IS 'Número PIS/PASEP/NIT';
COMMENT ON COLUMN guias_inss.periodo_mes IS 'Mês da competência (1-12)';
COMMENT ON COLUMN guias_inss.periodo_ano IS 'Ano da competência';
COMMENT ON COLUMN guias_inss.tipo_contribuinte IS 'Tipo: ci_normal, ci_simplificado, domestico, etc';
COMMENT ON COLUMN guias_inss.valor_base IS 'Valor base para cálculo';
COMMENT ON COLUMN guias_inss.aliquota IS 'Alíquota aplicada (%)';
COMMENT ON COLUMN guias_inss.linha_digitavel IS 'Linha digitável da GPS';
COMMENT ON COLUMN guias_inss.codigo_barras IS 'Código de barras da GPS';
COMMENT ON COLUMN guias_inss.metodo_emissao IS 'Método usado: SAL, local, híbrido';
COMMENT ON COLUMN guias_inss.reference_number IS 'Número de referência único';
