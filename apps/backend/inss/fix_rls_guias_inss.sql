-- SQL para corrigir Row Level Security (RLS) na tabela guias_inss
-- Execute este script no SQL Editor do Supabase

-- Opção 1: Desabilitar RLS (mais simples, para desenvolvimento/testes)
-- Use esta opção se você já controla o acesso via service_role key
ALTER TABLE guias_inss DISABLE ROW LEVEL SECURITY;

-- Opção 2: Manter RLS habilitado mas criar políticas permissivas
-- Comente as linhas acima e use estas abaixo se preferir manter RLS

/*
-- Habilita RLS
ALTER TABLE guias_inss ENABLE ROW LEVEL SECURITY;

-- Remove políticas antigas se existirem
DROP POLICY IF EXISTS "Permitir inserção de guias" ON guias_inss;
DROP POLICY IF EXISTS "Permitir leitura de guias" ON guias_inss;
DROP POLICY IF EXISTS "Permitir atualização de guias" ON guias_inss;
DROP POLICY IF EXISTS "Permitir exclusão de guias" ON guias_inss;

-- Política para service_role (backend) - acesso total
CREATE POLICY "Service role tem acesso total"
ON guias_inss
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Política para usuários autenticados - podem ver apenas suas próprias guias
CREATE POLICY "Usuários veem apenas suas guias"
ON guias_inss
FOR SELECT
TO authenticated
USING (auth.uid() = usuario_id);

-- Política para inserção - usuários autenticados podem inserir suas próprias guias
CREATE POLICY "Usuários podem inserir suas guias"
ON guias_inss
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = usuario_id);

-- Política para atualização - usuários podem atualizar apenas suas guias
CREATE POLICY "Usuários podem atualizar suas guias"
ON guias_inss
FOR UPDATE
TO authenticated
USING (auth.uid() = usuario_id)
WITH CHECK (auth.uid() = usuario_id);
*/

-- Verificar se as políticas foram aplicadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'guias_inss';
