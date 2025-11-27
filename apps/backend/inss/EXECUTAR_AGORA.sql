-- ========================================
-- SQL PARA EXECUTAR AGORA NO SUPABASE
-- ========================================

-- 1. Desabilitar Row Level Security na tabela guias_inss
-- Isso resolve o erro: "401 Unauthorized - new row violates row-level security policy"
ALTER TABLE guias_inss DISABLE ROW LEVEL SECURITY;

-- 2. Remover Foreign Key que está causando erro 409 Conflict
-- O erro ocorre porque usuario_id não existe na tabela 'usuarios'
-- (você usa 'profiles', não 'usuarios')
ALTER TABLE guias_inss DROP CONSTRAINT IF EXISTS guias_inss_usuario_id_fkey;

-- 3. Alterar coluna usuario_id para aceitar NULL (caso precise)
ALTER TABLE guias_inss ALTER COLUMN usuario_id DROP NOT NULL;

-- 4. Criar FK correta apontando para 'profiles' (tabela que você usa)
ALTER TABLE guias_inss
ADD CONSTRAINT guias_inss_usuario_id_fkey
FOREIGN KEY (usuario_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- ========================================
-- VERIFICAÇÕES
-- ========================================

-- Verificar RLS (deve mostrar "rowsecurity = false")
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'guias_inss';

-- Verificar constraints (deve mostrar FK para 'profiles')
SELECT
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table,
    ccu.column_name AS foreign_column
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'guias_inss';
