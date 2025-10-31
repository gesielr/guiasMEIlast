# Guia Rápido - Correções Sicoob

Execute estas etapas para completar os testes Sicoob.

---

## 1️⃣ Criar Tabela no Supabase (5 min)

### Via Dashboard Web:
1. Acesse: https://supabase.com/dashboard/project/[seu-projeto]/editor
2. Clique em "SQL Editor"
3. Cole e execute este SQL:

```sql
-- Criar tabela de logs de testes
create table if not exists public.sicoob_test_logs (
  id bigint generated always as identity primary key,
  timestamp timestamptz not null default now(),
  ambiente text not null,
  categoria text not null,
  tipo_teste text not null,
  dados_resposta jsonb not null,
  created_at timestamptz not null default now()
);

-- Criar índices
create index if not exists idx_sicoob_test_logs_timestamp on public.sicoob_test_logs (timestamp desc);
create index if not exists idx_sicoob_test_logs_categoria on public.sicoob_test_logs (categoria);
create index if not exists idx_sicoob_test_logs_tipo_teste on public.sicoob_test_logs (tipo_teste);
create index if not exists idx_sicoob_test_logs_ambiente on public.sicoob_test_logs (ambiente);

-- Habilitar RLS
alter table public.sicoob_test_logs enable row level security;

-- Políticas
create policy "Admin pode ler logs de testes Sicoob"
  on public.sicoob_test_logs
  for select
  using (auth.jwt() ->> 'role' = 'admin' or auth.jwt() ->> 'role' = 'service_role');

create policy "Service role pode inserir logs de testes"
  on public.sicoob_test_logs
  for insert
  with check (true);
```

4. Clique "Run" e verifique sucesso (✅ Success)

### Via CLI (alternativa):
```powershell
cd "c:\Users\carlo\OneDrive\Área de Trabalho\Curso\Projetos Pessoais\Inss - Guias\guiasMEI"
supabase db push
```

---

## 2️⃣ Adicionar Variável de Ambiente Boleto (1 min)

Edite o arquivo `apps/backend/.env` e adicione:

```env
# URL base para API de Boletos Sicoob (diferente do PIX)
SICOOB_BOLETO_BASE_URL=https://api.sicoob.com.br/cobranca-bancaria/v3
```

**Importante:** A URL de boleto é diferente da URL de PIX!

---

## 3️⃣ Reexecutar Testes (2 min)

```powershell
cd "c:\Users\carlo\OneDrive\Área de Trabalho\Curso\Projetos Pessoais\Inss - Guias\guiasMEI"
npx tsx apps/backend/scripts/test-sicoob-ciclo-completo.ts
```

**Resultado Esperado:**
- ✅ GET /cob/{txid}: PASS (já passou antes)
- ⏸️ POST /cobv: SKIP ou FAIL (limitação sandbox - OK)
- ✅ Boleto (gerar): PASS (se URL correta)
- ✅ Boleto (consultar): PASS (se geração OK)
- ✅ Boleto (PDF): PASS (se nossoNumero válido)
- ✅ Logging Supabase: PASS (se tabela criada)

---

## 4️⃣ Verificar Logs no Supabase (1 min)

Após execução, verifique se os logs foram salvos:

```sql
SELECT 
  id,
  timestamp,
  ambiente,
  categoria,
  tipo_teste,
  dados_resposta->>'status' as status
FROM public.sicoob_test_logs
ORDER BY timestamp DESC
LIMIT 10;
```

---

## 5️⃣ Verificar PDFs Gerados (Opcional)

Se o teste de boleto passar, você terá um arquivo PDF na raiz do projeto:

```
boleto_[nossoNumero]_[timestamp].pdf
```

Abra para validar visual mente.

---

## ⚠️ Problemas Conhecidos

### Se POST /cobv continuar falhando:
- **Normal!** Limitação do sandbox Sicoob
- Solução: Documentar e aguardar produção
- Atualização necessária: `docs/sicoob-test-results.md`

### Se Boleto continuar 404:
1. Verifique se `SICOOB_BOLETO_BASE_URL` está no `.env`
2. Reinicie o script (pode haver cache)
3. Verifique os logs do console para URL usada

### Se Supabase continuar "table not found":
1. Confirme que executou o SQL no projeto correto
2. Verifique se está usando `SUPABASE_SERVICE_ROLE_KEY` (não anon key)
3. Teste insert manual:
```sql
INSERT INTO public.sicoob_test_logs (ambiente, categoria, tipo_teste, dados_resposta)
VALUES ('sandbox', 'teste', 'manual', '{"status":"ok"}'::jsonb);
```

---

## ✅ Checklist Final

Após executar todas as etapas:

- [ ] Tabela `sicoob_test_logs` existe no Supabase
- [ ] Variável `SICOOB_BOLETO_BASE_URL` adicionada ao `.env`
- [ ] Script de teste executado sem erros críticos
- [ ] Pelo menos 3 testes PASS (GET /cob, gerar boleto, consultar boleto)
- [ ] Logs registrados no Supabase (verificar via SQL)
- [ ] PDF de boleto gerado (se aplicável)
- [ ] Relatório JSON salvo localmente

---

## 📞 Se Precisar de Ajuda

**Erros comuns:**
- "Could not find table": Execute SQL no Supabase Dashboard
- "404 Not Found (boleto)": Verifique variável `SICOOB_BOLETO_BASE_URL`
- "405 Method Not Allowed (/cobv)": Normal no sandbox, documentar

**Próximos passos após sucesso:**
1. Atualizar `docs/sicoob-test-results.md`
2. Consolidar evidências (screenshots, PDFs, logs)
3. Marcar tarefas como concluídas na documentação

---

**Tempo estimado total:** 10-15 minutos  
**Resultado esperado:** 4-5 testes PASS, ciclo Sicoob concluído! 🎉
