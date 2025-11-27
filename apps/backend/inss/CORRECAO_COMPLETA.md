# Guia Completo de Correção - GPS e Upload de PDFs

## Problemas Identificados

1. ✅ **Colunas faltantes na tabela** - RESOLVIDO (você já executou o SQL)
2. ⚠️ **Row Level Security bloqueando inserções** - PRECISA RESOLVER
3. ⚠️ **Bucket para PDFs pode não existir** - VERIFICAR

## Passo a Passo para Resolver

### 1. Corrigir Row Level Security (RLS)

Execute o arquivo: `fix_rls_guias_inss.sql`

**Por que?** O erro `401 Unauthorized - new row violates row-level security policy` indica que o Supabase está bloqueando a inserção de dados devido às políticas RLS.

**Como executar:**
1. Acesse o SQL Editor no Supabase
2. Cole o conteúdo de `fix_rls_guias_inss.sql`
3. Execute (Run)

**Resultado esperado:** A tabela ficará sem RLS (desenvolvimento) ou com políticas corretas.

---

### 2. Criar/Verificar Bucket para PDFs

**Opção A - Via Interface (RECOMENDADO):**

1. Acesse **Storage** no menu lateral do Supabase
2. Veja se existe um bucket chamado **"gps-pdfs"**
3. Se NÃO existir:
   - Clique em **"New bucket"**
   - Nome: `gps-pdfs`
   - Marque **"Public bucket"** ✅
   - File size limit: `10 MB`
   - Allowed MIME types: `application/pdf`
   - Clique em **"Create bucket"**

**Opção B - Via SQL:**

Execute o arquivo: `create_bucket_gps_pdfs.sql`

---

### 3. Verificar as Credenciais do Supabase

Certifique-se de que você está usando a **service_role key** (não a anon key).

Verifique no arquivo `.env`:

```env
SUPABASE_URL=https://idvfhgznofvubscjycvt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Deve ser a SERVICE ROLE KEY (longa)
```

**Onde encontrar:**
1. Vá em **Settings** → **API** no Supabase
2. Copie a **service_role key** (secret)
3. Cole no `.env`

---

## Verificar se Funcionou

Após executar os passos acima, teste novamente a emissão de GPS.

### Logs esperados de SUCESSO:

```
[DEBUG] Iniciando upload para bucket 'gps-pdfs', path 'gps_...'
[DEBUG] Upload concluído: ...
[DEBUG] URL pública gerada: https://idvfhgznofvubscjycvt.supabase.co/storage/v1/object/public/gps-pdfs/...
[DEBUG] Upload concluído: https://...
```

### Resposta esperada no JSON:

```json
{
  "message": "Guia emitida com sucesso (V2 Secure)",
  "pdf_url": "https://idvfhgznofvubscjycvt.supabase.co/storage/v1/object/public/gps-pdfs/gps_...",
  ...
}
```

---

## Troubleshooting

### Se ainda aparecer `temp://...`:

Verifique os logs de erro:
```
[ERROR] Erro ao fazer upload do arquivo:
[ERROR]   Bucket: gps-pdfs
[ERROR]   Path: ...
[ERROR]   Erro: ...
```

**Possíveis causas:**

1. **Bucket não existe** → Criar via interface ou SQL
2. **Permissões incorretas** → Verificar RLS e policies do bucket
3. **Credencial errada** → Usar service_role key
4. **Arquivo muito grande** → Verificar limite do bucket (10MB)

### Se aparecer erro 401 ao salvar na tabela:

Significa que o RLS ainda está bloqueando.

**Solução rápida:** Desabilite o RLS
```sql
ALTER TABLE guias_inss DISABLE ROW LEVEL SECURITY;
```

**Solução definitiva:** Configure as políticas RLS corretamente (veja `fix_rls_guias_inss.sql`)

---

## Resumo dos Arquivos Criados

1. ✅ `add_columns_guias_inss.sql` - Adiciona colunas (EXECUTADO)
2. 📝 `fix_rls_guias_inss.sql` - Corrige RLS (EXECUTAR AGORA)
3. 📝 `create_bucket_gps_pdfs.sql` - Cria bucket (OPCIONAL - melhor via interface)
4. 📄 `INSTRUCOES_ATUALIZACAO_TABELA.md` - Documentação
5. 📄 `CORRECAO_COMPLETA.md` - Este arquivo

---

## Próximos Passos

1. ✅ Execute `fix_rls_guias_inss.sql`
2. ✅ Verifique/Crie o bucket `gps-pdfs` via interface
3. ✅ Verifique a service_role key no `.env`
4. ✅ Teste a emissão de GPS novamente
5. ✅ Verifique os logs para confirmar upload bem-sucedido
