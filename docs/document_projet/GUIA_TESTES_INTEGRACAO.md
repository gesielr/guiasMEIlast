# 🧪 Guia de Testes de Integração - GuiasMEI

**Data:** 20 de Janeiro de 2025  
**Versão:** 1.0  
**Status:** 🟢 Pronto para Testes

---

## 📋 Pré-requisitos

### 1. Configuração do Ambiente

✅ **Variáveis de Ambiente Necessárias:**
```bash
# Sicoob PIX
SICOOB_PIX_CHAVE=seu_cnpj_aqui
SICOOB_CLIENT_ID=seu_client_id
SICOOB_CLIENT_SECRET=seu_client_secret
SICOOB_CERTIFICADO_PATH=caminho_do_certificado.pfx
SICOOB_CERTIFICADO_SENHA=senha_do_certificado

# Supabase
SUPABASE_URL=sua_url
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key

# Frontend
FRONTEND_URL=http://localhost:5173
WHATSAPP_NUMBER=5548991117268

# OpenAI (para IA do WhatsApp)
OPENAI_API_KEY=sua_chave_openai
```

### 2. Banco de Dados

✅ **Execute as migrations:**
```bash
# 1. Criar configurações de preços (se ainda não executou)
supabase migration up 20250120000001_add_pricing_configs

# 2. Configurar valores de teste (R$ 0,10)
supabase migration up 20250120000002_set_test_values
```

### 3. Iniciar Serviços

```bash
# Terminal 1: Backend
cd apps/backend
npm install
npm run dev

# Terminal 2: Frontend
cd apps/web
npm install
npm run dev
```

---

## 🎯 Fluxos de Teste

### **TESTE 1: Fluxo MEI - Certificado Digital (Mock)**

#### Objetivo
Testar o fluxo completo de cadastro MEI → Pagamento PIX (R$ 0,10) → Agendamento Mock → Certificado Mock

#### Passos

1. **Cadastro MEI**
   - Acesse: `http://localhost:5173/cadastro/mei`
   - Preencha todos os dados
   - Complete o cadastro
   - Será redirecionado para WhatsApp com mensagem: "Olá! Acabei de me cadastrar no GuiasMEI"

2. **Interação no WhatsApp**
   - A IA detectará que você acabou de se cadastrar
   - A IA enviará mensagem sobre certificado digital
   - **Valor esperado:** R$ 0,10 (não R$ 150,00)
   - A IA gerará QR Code PIX via Sicoob

3. **Pagamento PIX**
   - Escaneie o QR Code ou copie o código PIX
   - Faça o pagamento de R$ 0,10
   - Aguarde confirmação do webhook Sicoob

4. **Mock de Agendamento e Certificado**
   - Após pagamento confirmado, o sistema criará um enrollment PENDING
   - **Opção 1: Script TypeScript (Recomendado)**
     ```bash
     # Buscar o user_id do pagamento
     # Execute no Supabase SQL Editor:
     # SELECT user_id FROM payment_cert_digital WHERE txid = 'seu_txid' AND status = 'CONFIRMED';
     
     # Executar script de mock
     cd apps/backend
     npx ts-node ../scripts/mock-certificado-after-payment.ts <USER_ID>
     ```
   
   - **Opção 2: Script SQL**
     ```bash
     # Edite scripts/mock-certificado.sql e substitua <USER_ID> pelo ID do usuário
     # Execute no Supabase SQL Editor
     ```
   
   - **Opção 3: Manual (SQL direto)**
     ```sql
     -- 1. Simular agendamento
     UPDATE cert_enrollments 
     SET status = 'SCHEDULED',
         scheduled_at = NOW() + INTERVAL '2 days',
         external_enrollment_id = 'MOCK_ENROLL_' || id
     WHERE user_id = 'seu_user_id'
     AND status = 'PENDING';
     
     -- 2. Simular certificado ativo
     UPDATE cert_enrollments 
     SET status = 'ACTIVE',
         external_cert_id = 'MOCK_CERT_' || id,
         subject = 'CN=MOCK CERTIFICADO, O=GuiasMEI, C=BR',
         serial_number = 'MOCK_SERIAL_' || NOW()::text,
         thumbprint = UPPER(ENCODE(gen_random_bytes(20), 'hex')),
         valid_from = NOW(),
         valid_until = NOW() + INTERVAL '1 year',
         activated_at = NOW()
     WHERE user_id = 'seu_user_id'
     AND status = 'SCHEDULED';
     ```

6. **Verificação**
   - Volte ao WhatsApp
   - Digite: "Verificar certificado"
   - A IA deve confirmar que o certificado está ativo
   - Digite: "Emitir nota"
   - A IA deve permitir emissão de NFS-e

#### ✅ Critérios de Sucesso

- [ ] Cadastro MEI completo
- [ ] Mensagem WhatsApp com valor R$ 0,10
- [ ] QR Code PIX gerado corretamente
- [ ] Webhook Sicoob confirma pagamento
- [ ] Enrollment criado no banco
- [ ] Mock de agendamento funciona
- [ ] Mock de certificado funciona
- [ ] IA reconhece certificado ativo
- [ ] Sistema permite emissão de NFS-e

---

### **TESTE 2: Fluxo Autônomo - Ativação do Sistema**

#### Objetivo
Testar o fluxo completo de cadastro Autônomo → Pagamento PIX (R$ 0,10) → Ativação → Emissão GPS

#### Passos

1. **Cadastro Autônomo**
   - Acesse: `http://localhost:5173/cadastro/autonomo`
   - Preencha todos os dados
   - Complete o cadastro
   - Será redirecionado para WhatsApp com mensagem: "Olá! Acabei de me cadastrar no GuiasMEI"

2. **Interação no WhatsApp**
   - A IA detectará que você acabou de se cadastrar
   - A IA enviará mensagem sobre ativação do sistema
   - **Valor esperado:** R$ 0,10 (não R$ 150,00)
   - **Taxa GPS esperada:** 6% (configurável no admin)
   - A IA gerará QR Code PIX via Sicoob

3. **Pagamento PIX**
   - Escaneie o QR Code ou copie o código PIX
   - Faça o pagamento de R$ 0,10
   - Aguarde confirmação do webhook Sicoob

4. **Ativação Automática**
   - Após pagamento confirmado, o webhook atualiza:
     - `payments.status = 'completed'`
     - `profiles.onboarding_completed = true`
   - Sistema enviará mensagem WhatsApp confirmando ativação

5. **Emissão GPS**
   - Volte ao WhatsApp
   - Digite: "Emitir GPS"
   - A IA deve perguntar: mês, valor, tipo de contribuinte
   - Complete os dados
   - Sistema deve gerar GPS e enviar PDF

#### ✅ Critérios de Sucesso

- [ ] Cadastro Autônomo completo
- [ ] Mensagem WhatsApp com valor R$ 0,10
- [ ] Mensagem menciona taxa de 6% sobre guia
- [ ] QR Code PIX gerado corretamente
- [ ] Webhook Sicoob confirma pagamento
- [ ] Perfil marcado como `onboarding_completed = true`
- [ ] Mensagem de confirmação enviada
- [ ] Sistema permite emissão de GPS
- [ ] PDF da GPS é gerado e enviado

---

## 🔍 Verificações no Banco de Dados

### Verificar Pagamentos

```sql
-- Verificar pagamentos recentes
SELECT 
  p.id,
  p.user_id,
  p.amount,
  p.type,
  p.status,
  p.stripe_session_id as txid,
  p.created_at,
  pr.nome,
  pr.user_type
FROM payments p
JOIN profiles pr ON pr.id = p.user_id
WHERE p.created_at > NOW() - INTERVAL '1 hour'
ORDER BY p.created_at DESC;
```

### Verificar Certificados (MEI)

```sql
-- Verificar enrollments
SELECT 
  ce.id,
  ce.user_id,
  ce.status,
  ce.external_cert_id,
  ce.scheduled_at,
  ce.activated_at,
  ce.valid_from,
  ce.valid_to,
  pr.nome,
  pr.user_type
FROM cert_enrollments ce
JOIN profiles pr ON pr.id = ce.user_id
WHERE ce.created_at > NOW() - INTERVAL '1 hour'
ORDER BY ce.created_at DESC;
```

### Verificar Perfis Ativados

```sql
-- Verificar perfis com onboarding completo
SELECT 
  id,
  nome,
  user_type,
  onboarding_completed,
  created_at,
  updated_at
FROM profiles
WHERE onboarding_completed = true
AND updated_at > NOW() - INTERVAL '1 hour'
ORDER BY updated_at DESC;
```

---

## 🐛 Troubleshooting

### Problema: QR Code não é gerado

**Causas possíveis:**
- Variável `SICOOB_PIX_CHAVE` não configurada
- Erro na autenticação Sicoob
- Certificado Sicoob inválido

**Solução:**
```bash
# Verificar logs do backend
cd apps/backend
npm run dev
# Procure por erros relacionados a Sicoob
```

### Problema: Webhook não confirma pagamento

**Causas possíveis:**
- Webhook Sicoob não está configurado
- URL do webhook não está acessível publicamente
- Erro no processamento do webhook

**Solução:**
1. Verifique se o webhook está configurado no Sicoob
2. Use ngrok para expor localhost:
   ```bash
   ngrok http 3333
   ```
3. Configure a URL do ngrok no Sicoob

### Problema: IA não detecta cadastro recente

**Causas possíveis:**
- Perfil criado há mais de 2 horas
- Telefone não está normalizado corretamente

**Solução:**
```sql
-- Forçar perfil como recém-criado (apenas para testes)
UPDATE profiles
SET created_at = NOW()
WHERE telefone = 'seu_telefone_aqui';
```

---

## 📊 Checklist Final de Testes

### Fluxo MEI
- [ ] Cadastro completo
- [ ] Mensagem WhatsApp com R$ 0,10
- [ ] QR Code PIX gerado
- [ ] Pagamento confirmado
- [ ] Enrollment criado
- [ ] Mock de agendamento
- [ ] Mock de certificado
- [ ] Certificado ativo reconhecido
- [ ] Sistema permite NFS-e

### Fluxo Autônomo
- [ ] Cadastro completo
- [ ] Mensagem WhatsApp com R$ 0,10
- [ ] QR Code PIX gerado
- [ ] Pagamento confirmado
- [ ] Perfil ativado
- [ ] Sistema permite GPS
- [ ] GPS gerada e enviada

### Configurações
- [ ] Valores de teste (R$ 0,10) aplicados
- [ ] Painel admin funciona
- [ ] Valores podem ser alterados
- [ ] Mensagens WhatsApp atualizadas

---

## 🔄 Reverter para Produção

Após os testes, execute:

```bash
# Reverter valores para produção
supabase migration up 20250120000003_revert_to_production_values
```

Ou manualmente:
```sql
UPDATE public.system_config 
SET config_value = '150.00'
WHERE config_key IN ('valor_ativacao_autonomo', 'valor_certificado_mei');
```

Ou pelo painel admin:
- Acesse: `/dashboard/admin` → Aba "💰 Preços e Taxas"
- Altere os valores de volta para R$ 150,00
- Salve as configurações

---

## 📝 Notas Importantes

1. **Valores de Teste:** R$ 0,10 permite testes reais com PIX sem custo alto
2. **Mocks:** Certisign está em modo mock - não há integração real ainda
3. **Webhooks:** Use ngrok para expor localhost para testes de webhook
4. **Logs:** Sempre verifique os logs do backend durante os testes
5. **Banco de Dados:** Use as queries SQL fornecidas para verificar o estado

---

**Próximos Passos Após Testes:**
- [ ] Integração real com Certisign
- [ ] Testes de emissão NFS-e completa
- [ ] Testes de emissão GPS completa
- [ ] Testes de comissões de parceiros

