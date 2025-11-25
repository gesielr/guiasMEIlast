# Como Aplicar as Novas Migrations de CNAE

## Problema

A migration `20241217000006_disable_updated_at_trigger_on_auth_users.sql` está falhando por falta de permissões no schema `auth`. Isso bloqueia a aplicação de todas as migrations subsequentes.

## Solução 1: Aplicar via Supabase Dashboard (Recomendado)

1. Acesse o **Supabase Dashboard** do seu projeto
2. Vá em **SQL Editor**
3. Abra o arquivo `supabase/migrations/APPLY_CNAE_TABLES.sql`
4. Cole todo o conteúdo no editor SQL
5. Clique em **Run** ou pressione `Ctrl+Enter`
6. Verifique se as tabelas foram criadas com sucesso

## Solução 2: Aplicar via CLI (após corrigir migration problemática)

A migration `20241217000006` foi corrigida para não falhar. Tente novamente:

```bash
supabase db push
```

Se ainda falhar, você pode aplicar apenas as novas migrations:

```bash
# Aplicar apenas as novas migrations
supabase migration up --version 20251106000001
supabase migration up --version 20251106000002
```

## Solução 3: Aplicar via psql (se tiver acesso direto)

```bash
psql <sua_connection_string> -f supabase/migrations/APPLY_CNAE_TABLES.sql
```

## Verificação

Após aplicar, verifique se as tabelas foram criadas:

```sql
-- Verificar colunas adicionadas em profiles
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles' 
AND column_name IN ('cnae_principal', 'cnaes_secundarios', 'cnaes_updated_at');

-- Verificar tabela cnae_tributacao
SELECT COUNT(*) as total_mappings FROM public.cnae_tributacao;

-- Verificar tabela codigos_tributacao_cache
SELECT COUNT(*) as total_cache FROM public.codigos_tributacao_cache;
```

## Nota

As novas migrations **não dependem** da migration problemática. Elas apenas:
- Adicionam colunas em `public.profiles` (schema público)
- Criam tabelas em `public` (schema público)
- Não modificam nada no schema `auth`

Portanto, podem ser aplicadas com segurança mesmo se a migration antiga falhar.

