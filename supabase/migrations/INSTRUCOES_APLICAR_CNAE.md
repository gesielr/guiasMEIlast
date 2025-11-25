# 📋 Instruções para Aplicar Migrações CNAE

## ✅ Passo 1: Aplicar as Migrações

### Opção A: Via Supabase Dashboard (Recomendado - Mais Fácil)

1. Acesse o **Supabase Dashboard** do seu projeto
2. Vá em **SQL Editor** (menu lateral esquerdo)
3. Clique em **New Query**
4. Abra o arquivo `supabase/migrations/APLICAR_CNAE_MIGRATIONS.sql`
5. **Copie TODO o conteúdo** do arquivo
6. Cole no editor SQL do Supabase
7. Clique em **Run** ou pressione `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)
8. Aguarde a execução (pode levar alguns segundos)
9. Verifique se apareceu a mensagem de sucesso no final

### Opção B: Via CLI Supabase

```bash
# No diretório raiz do projeto
supabase db push
```

Se houver erro em migrations anteriores, você pode aplicar apenas estas:

```bash
# Aplicar apenas as migrations CNAE
supabase migration up --version 20251106000001
supabase migration up --version 20251106000002
```

### Opção C: Via psql (se tiver acesso direto ao banco)

```bash
psql <sua_connection_string> -f supabase/migrations/APLICAR_CNAE_MIGRATIONS.sql
```

## ✅ Passo 2: Verificar se Aplicou Corretamente

Execute estas queries no Supabase SQL Editor para verificar:

```sql
-- 1. Verificar se as colunas foram adicionadas em profiles
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles' 
AND column_name IN ('cnae_principal', 'cnaes_secundarios', 'cnaes_updated_at');

-- 2. Verificar se a tabela cnae_tributacao foi criada
SELECT COUNT(*) as total_mappings 
FROM public.cnae_tributacao;

-- 3. Ver alguns exemplos de mapeamentos
SELECT cnae, codigo_tributacao, descricao_servico 
FROM public.cnae_tributacao 
LIMIT 10;

-- 4. Verificar se a tabela de cache foi criada
SELECT COUNT(*) as total_cache 
FROM public.codigos_tributacao_cache;
```

**Resultado esperado:**
- ✅ 3 colunas em `profiles` (cnae_principal, cnaes_secundarios, cnaes_updated_at)
- ✅ Tabela `cnae_tributacao` com pelo menos 20 registros
- ✅ Tabela `codigos_tributacao_cache` criada (pode estar vazia inicialmente)

## 📝 O que foi criado?

### 1. Colunas na tabela `profiles`:
- `cnae_principal` (VARCHAR(7)) - CNAE principal do prestador
- `cnaes_secundarios` (JSONB) - Array de CNAEs secundários
- `cnaes_updated_at` (TIMESTAMP) - Data da última atualização

### 2. Tabela `cnae_tributacao`:
- Mapeamento entre CNAEs e códigos de tributação nacional (cTribNac)
- Populada com dados iniciais de serviços comuns
- Índices para busca rápida

### 3. Tabela `codigos_tributacao_cache`:
- Cache de descrições oficiais de códigos de tributação
- Evita consultas repetidas à API

## ⚠️ Notas Importantes

- As migrações são **idempotentes** (podem ser executadas múltiplas vezes sem erro)
- Usa `IF NOT EXISTS` e `ON CONFLICT DO NOTHING` para evitar duplicações
- As políticas RLS permitem leitura pública (dados de referência)
- A escrita será feita apenas via service_role ou scripts

## 🐛 Problemas Comuns

### Erro: "function handle_updated_at() does not exist"
**Solução:** O script já trata isso com `DO $$ BEGIN ... END $$`. Se ainda der erro, você pode ignorar os triggers (não são críticos).

### Erro: "permission denied"
**Solução:** Certifique-se de estar usando a conexão com permissões de administrador (service_role).

### Tabelas não aparecem
**Solução:** Verifique se está no schema `public` correto. Execute:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%cnae%';
```

## ✅ Próximos Passos

Após aplicar as migrações com sucesso:

1. ✅ Verificar se as tabelas foram criadas (queries acima)
2. ✅ Testar o fluxo de emissão de NFSe
3. ✅ Verificar se os CNAEs estão sendo salvos no cadastro
4. ✅ Testar se os códigos de tributação estão sendo mapeados corretamente

---

**Dúvidas?** Consulte o arquivo `COMO_APLICAR_MIGRATIONS.md` para mais detalhes.

