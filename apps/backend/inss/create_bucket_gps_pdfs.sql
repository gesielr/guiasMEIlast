-- SQL para criar bucket de armazenamento para PDFs de GPS
-- Execute este script no SQL Editor do Supabase

-- IMPORTANTE: Este script cria o bucket via SQL
-- Alternativamente, você pode criar manualmente via interface do Supabase:
-- 1. Vá em Storage (menu lateral)
-- 2. Clique em "New bucket"
-- 3. Nome: "gps-pdfs"
-- 4. Marque "Public bucket" se quiser URLs públicas acessíveis
-- 5. Clique em "Create bucket"

-- Criar bucket via SQL (se preferir usar SQL)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'gps-pdfs',
    'gps-pdfs',
    true,  -- bucket público (URLs acessíveis sem autenticação)
    10485760,  -- 10MB limite por arquivo
    ARRAY['application/pdf']  -- apenas PDFs
)
ON CONFLICT (id) DO NOTHING;

-- Criar políticas de acesso ao bucket
-- Permite upload autenticado
INSERT INTO storage.policies (name, bucket_id, definition, check_)
VALUES (
    'Permitir upload de PDFs',
    'gps-pdfs',
    '(bucket_id = ''gps-pdfs''::text)',
    '(bucket_id = ''gps-pdfs''::text)'
)
ON CONFLICT DO NOTHING;

-- Permite leitura pública dos PDFs
INSERT INTO storage.policies (name, bucket_id, definition)
VALUES (
    'Permitir leitura pública de PDFs',
    'gps-pdfs',
    '(bucket_id = ''gps-pdfs''::text)'
)
ON CONFLICT DO NOTHING;

-- Verificar se o bucket foi criado
SELECT id, name, public, created_at
FROM storage.buckets
WHERE id = 'gps-pdfs';
