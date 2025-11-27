-- ========================================
-- CORRIGIR POLÍTICAS DE STORAGE (BUCKET)
-- ========================================

-- O erro "403 new row violates row-level security policy" ao fazer upload
-- indica que o bucket 'guias' tem RLS ativo bloqueando uploads

-- OPÇÃO 1: Tornar o bucket completamente público (SEM RLS)
-- Mais simples, permite qualquer um fazer upload/leitura

-- Desabilitar RLS no bucket 'guias'
UPDATE storage.buckets
SET public = true
WHERE id = 'guias';

-- Remover todas as políticas existentes do bucket 'guias'
DELETE FROM storage.policies
WHERE bucket_id = 'guias';

-- Criar política permissiva para uploads (anon pode fazer upload)
INSERT INTO storage.policies (name, bucket_id, definition, check_)
VALUES (
    'Permitir upload público',
    'guias',
    '(bucket_id = ''guias''::text)',
    '(bucket_id = ''guias''::text)'
)
ON CONFLICT (id) DO NOTHING;

-- Criar política permissiva para leitura (anon pode ler)
INSERT INTO storage.policies (name, bucket_id, definition)
VALUES (
    'Permitir leitura pública',
    'guias',
    '(bucket_id = ''guias''::text)'
)
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- VERIFICAÇÕES
-- ========================================

-- Verificar configuração do bucket
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'guias';

-- Verificar políticas do bucket
SELECT id, name, bucket_id, definition, check_
FROM storage.policies
WHERE bucket_id = 'guias';
