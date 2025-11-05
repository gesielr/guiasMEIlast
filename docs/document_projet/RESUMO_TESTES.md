# 📝 Resumo: Preparação para Testes de Integração

## ✅ O que foi implementado

### 1. **Sistema de Configurações de Preços**
- ✅ Tabela `system_config` com valores configuráveis
- ✅ Painel admin para editar valores sem alterar código
- ✅ Serviços atualizados para usar valores do banco
- ✅ Mensagens WhatsApp atualizadas dinamicamente

### 2. **Scripts de Teste**
- ✅ Migration para configurar valores de teste (R$ 0,10)
- ✅ Migration para reverter para produção (R$ 150,00)
- ✅ Script TypeScript para mockar certificado
- ✅ Scripts SQL para mockar agendamento e certificado
- ✅ Script PowerShell para verificar ambiente

### 3. **Documentação**
- ✅ Guia completo de testes (`GUIA_TESTES_INTEGRACAO.md`)
- ✅ Scripts SQL reutilizáveis
- ✅ Instruções passo a passo

---

## 🚀 Como Iniciar os Testes

### Passo 1: Configurar Valores de Teste

```bash
# Opção 1: Via Migration (Recomendado)
supabase migration up 20250120000002_set_test_values

# Opção 2: Via SQL direto
psql -h seu_host -U seu_user -d seu_db -f scripts/test-setup.sql

# Opção 3: Via Painel Admin
# Acesse: http://localhost:5173/dashboard/admin → Preços e Taxas
# Altere valores para R$ 0,10
```

### Passo 2: Verificar Ambiente

```powershell
# Execute o script de verificação
.\scripts\test-flows.ps1
```

### Passo 3: Iniciar Serviços

```bash
# Terminal 1: Backend
cd apps/backend
npm run dev

# Terminal 2: Frontend
cd apps/web
npm run dev
```

### Passo 4: Seguir o Guia de Testes

Abra `GUIA_TESTES_INTEGRACAO.md` e siga os fluxos:
1. **TESTE 1:** Fluxo MEI - Certificado Digital (Mock)
2. **TESTE 2:** Fluxo Autônomo - Ativação do Sistema

---

## 📊 Valores Configuráveis

| Configuração | Valor Produção | Valor Teste | Onde Configurar |
|-------------|----------------|-------------|-----------------|
| Ativação Autônomo | R$ 150,00 | R$ 0,10 | Painel Admin / Migration |
| Certificado MEI | R$ 150,00 | R$ 0,10 | Painel Admin / Migration |
| Taxa GPS | 6% | 6% | Painel Admin |
| Taxa NFS-e | R$ 3,00 | R$ 3,00 | Painel Admin |
| Comissão Parceiro | 30% | 30% | Painel Admin |

---

## 🎯 Fluxos de Teste

### Fluxo MEI (Com Mock)
1. Cadastro → WhatsApp
2. IA detecta cadastro → Gera PIX R$ 0,10
3. Pagamento confirmado → Enrollment criado
4. **Mock:** Agendamento e Certificado
5. Certificado ativo → Sistema permite NFS-e

### Fluxo Autônomo
1. Cadastro → WhatsApp
2. IA detecta cadastro → Gera PIX R$ 0,10
3. Pagamento confirmado → Perfil ativado
4. Sistema permite GPS

---

## 🔧 Scripts Disponíveis

### Mock Certificado
```bash
# TypeScript (Recomendado)
npx ts-node scripts/mock-certificado-after-payment.ts <USER_ID>

# SQL
# Edite scripts/mock-certificado.sql e execute no Supabase
```

### Verificar Pagamentos
```sql
-- Ver pagamentos recentes
SELECT * FROM payments 
WHERE amount = 0.10 
ORDER BY created_at DESC;
```

### Verificar Certificados
```sql
-- Ver enrollments mockados
SELECT * FROM cert_enrollments 
WHERE external_cert_id LIKE 'MOCK_%'
ORDER BY created_at DESC;
```

---

## ⚠️ Importante

1. **Valores de Teste:** R$ 0,10 permite testes reais com PIX sem custo alto
2. **Mocks:** Certisign está em modo mock - não há integração real ainda
3. **Webhooks:** Use ngrok para expor localhost para testes de webhook
4. **Limpeza:** Após testes, reverta valores para produção
5. **Logs:** Sempre verifique os logs do backend durante os testes

---

## 📚 Documentação

- **Guia Completo:** `GUIA_TESTES_INTEGRACAO.md`
- **Scripts SQL:** `scripts/test-setup.sql`, `scripts/mock-certificado.sql`
- **Script TypeScript:** `scripts/mock-certificado-after-payment.ts`
- **Script PowerShell:** `scripts/test-flows.ps1`

---

## ✅ Checklist Pré-Testes

- [ ] Valores de teste (R$ 0,10) configurados
- [ ] Variáveis de ambiente configuradas
- [ ] Backend rodando
- [ ] Frontend rodando
- [ ] Supabase conectado
- [ ] Sicoob PIX configurado
- [ ] Webhook Sicoob configurado (ou ngrok)
- [ ] Documentação lida

---

**Pronto para testar! 🚀**



