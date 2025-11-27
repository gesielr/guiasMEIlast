-- ========================================
-- ADICIONAR COLUNA validado_sal
-- ========================================

-- Adicionar coluna validado_sal (boolean) na tabela guias_inss
ALTER TABLE guias_inss
ADD COLUMN IF NOT EXISTS validado_sal BOOLEAN DEFAULT FALSE;

-- Verificar se a coluna foi adicionada
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'guias_inss'
AND column_name = 'validado_sal';
