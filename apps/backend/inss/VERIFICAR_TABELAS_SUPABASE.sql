-- Script para verificar tabelas necessárias para o fluxo autônomo
-- Execute este script no SQL Editor do Supabase

-- ============================================================
-- VERIFICAÇÃO DE TABELAS NECESSÁRIAS
-- ============================================================

-- 1. Verificar se tabela 'usuarios' existe
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'usuarios'
        ) 
        THEN '✅ Tabela usuarios EXISTE'
        ELSE '❌ Tabela usuarios NÃO EXISTE'
    END AS status_usuarios;

-- 2. Verificar se tabela 'gps_emissions' existe
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'gps_emissions'
        ) 
        THEN '✅ Tabela gps_emissions EXISTE'
        ELSE '❌ Tabela gps_emissions NÃO EXISTE'
    END AS status_gps_emissions;

-- 3. Verificar se tabela 'profiles' existe
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'profiles'
        ) 
        THEN '✅ Tabela profiles EXISTE'
        ELSE '❌ Tabela profiles NÃO EXISTE'
    END AS status_profiles;

-- 4. Verificar estrutura da tabela 'usuarios' (se existir)
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'usuarios'
ORDER BY ordinal_position;

-- 5. Verificar estrutura da tabela 'gps_emissions' (se existir)
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'gps_emissions'
ORDER BY ordinal_position;

-- 6. Verificar estrutura da tabela 'profiles' (se existir)
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 7. Contar registros em cada tabela
SELECT 
    'usuarios' AS tabela,
    COUNT(*) AS total_registros
FROM usuarios
UNION ALL
SELECT 
    'gps_emissions' AS tabela,
    COUNT(*) AS total_registros
FROM gps_emissions
UNION ALL
SELECT 
    'profiles' AS tabela,
    COUNT(*) AS total_registros
FROM profiles;

-- 8. Verificar se há usuários autônomos cadastrados
SELECT 
    COUNT(*) AS total_autonomos,
    COUNT(DISTINCT whatsapp) AS whatsapps_unicos
FROM usuarios
WHERE tipo_contribuinte = 'autonomo' OR tipo_contribuinte LIKE '%autonomo%';

-- 9. Verificar guias GPS emitidas recentemente
SELECT 
    COUNT(*) AS total_guias,
    SUM(value) AS valor_total,
    MIN(created_at) AS primeira_guia,
    MAX(created_at) AS ultima_guia
FROM gps_emissions
WHERE created_at >= NOW() - INTERVAL '30 days';

-- 10. Verificar triggers e políticas RLS
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND event_object_table IN ('usuarios', 'gps_emissions', 'profiles');

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('usuarios', 'gps_emissions', 'profiles');

