-- ========================================
-- CORRIGIR FOREIGN KEY na tabela guias_inss
-- ========================================

-- Problema: A FK aponta para a tabela 'usuarios' mas você usa 'profiles'
-- Erro: "insert or update on table guias_inss violates foreign key constraint"

-- OPÇÃO 1: Remover a Foreign Key (SOLUÇÃO RÁPIDA)
-- Isso permite salvar guias mesmo que o usuario_id não exista em 'usuarios'
ALTER TABLE guias_inss DROP CONSTRAINT IF EXISTS guias_inss_usuario_id_fkey;

-- OPÇÃO 2: Alterar FK para apontar para 'profiles' (SOLUÇÃO MELHOR)
-- Execute apenas se você quer manter a integridade referencial

-- Primeiro remove a FK antiga
-- ALTER TABLE guias_inss DROP CONSTRAINT IF EXISTS guias_inss_usuario_id_fkey;

-- Depois cria FK apontando para 'profiles' em vez de 'usuarios'
-- ALTER TABLE guias_inss
-- ADD CONSTRAINT guias_inss_usuario_id_fkey
-- FOREIGN KEY (usuario_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- OPÇÃO 3: Tornar a coluna usuario_id NULLABLE (permite NULL)
-- ALTER TABLE guias_inss ALTER COLUMN usuario_id DROP NOT NULL;

-- Verificar constraints existentes
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'guias_inss';
