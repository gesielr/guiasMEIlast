# Teste E2E: Fluxo Completo Autônomo

**Data:** Janeiro 2025  
**Status:** ✅ Testes Unitários Passando  
**Arquivo:** `apps/backend/inss/tests/test_fluxo_completo_autonomo.py`

## Objetivo

Validar o fluxo completo desde o cadastro de autônomo até a emissão de guia GPS, incluindo:
1. Validação de dados de cadastro
2. Cálculo de GPS
3. Geração de PDF
4. Validação de formatos (WhatsApp, competência)
5. Fluxo completo simulado

## Resultados dos Testes

**Status:** ✅ **8/8 TESTES PASSARAM** (100% de sucesso)

### Testes Executados

| # | Teste | Descrição | Status |
|---|-------|-----------|--------|
| 1 | `test_01_cadastro_autonomo_dados_validos` | Valida dados de cadastro (CPF, nome, email, WhatsApp) | ✅ PASSOU |
| 2 | `test_02_calculo_gps_autonomo` | Valida cálculo de GPS para autônomo (20%) | ✅ PASSOU |
| 3 | `test_03_geracao_pdf_gps` | Valida geração de PDF da guia GPS | ✅ PASSOU |
| 4 | `test_04_estrutura_dados_emissao` | Valida estrutura de dados para emissão | ✅ PASSOU |
| 5 | `test_05_fluxo_completo_simulado` | Simula fluxo completo (cadastro → cálculo → PDF) | ✅ PASSOU |
| 6 | `test_06_validacao_whatsapp_format` | Valida formatos de número WhatsApp | ✅ PASSOU |
| 7 | `test_07_validacao_competencia` | Valida formato de competência (MM/AAAA) | ✅ PASSOU |
| 8 | `test_fluxo_completo_autonomo` | Função principal executando todos os testes | ✅ PASSOU |

## Detalhes dos Testes

### Teste 1: Validação de Dados de Cadastro

**Dados Testados:**
- CPF: 11 dígitos
- Nome: Não vazio
- Email: Formato válido
- WhatsApp: 10-11 dígitos
- PIS: Opcional, 11 dígitos

**Resultado:** ✅ Todos os dados validados corretamente

### Teste 2: Cálculo de GPS

**Entrada:**
- Valor base: R$ 2.000,00
- Tipo: Autônomo Normal
- Plano: Normal (20%)

**Resultado Esperado:**
- Valor GPS: R$ 400,00 (20% de R$ 2.000,00)
- Código GPS: 1007
- Alíquota: 20%

**Resultado:** ✅ Cálculo correto

### Teste 3: Geração de PDF

**Dados:**
- Nome: João Silva
- CPF: 12345678901
- Valor: R$ 400,00
- Código GPS: 1007
- Competência: 11/2025

**Validações:**
- PDF gerado (não vazio)
- Formato válido (inicia com %PDF)
- Tamanho: ~1655 bytes

**Resultado:** ✅ PDF gerado corretamente

### Teste 4: Estrutura de Dados

**Campos Obrigatórios:**
- `whatsapp`: Número WhatsApp
- `tipo_contribuinte`: "autonomo"
- `valor_base`: Valor positivo
- `plano`: "normal" ou "simplificado"
- `competencia`: Formato MM/AAAA (opcional)

**Resultado:** ✅ Estrutura válida

### Teste 5: Fluxo Completo Simulado

**Passos Simulados:**
1. ✅ Dados de cadastro validados
2. ✅ Cálculo de GPS executado
3. ✅ PDF gerado com sucesso
4. ✅ Todos os passos validados

**Resultado:** ✅ Fluxo completo funcionando

### Teste 6: Validação de Formato WhatsApp

**Formatos Testados:**
- `11999999999` (formato nacional)
- `+5511999999999` (formato internacional)
- `5511999999999` (formato sem +)

**Resultado:** ✅ Todos os formatos validados

### Teste 7: Validação de Competência

**Formatos Válidos:**
- `11/2025` ✅
- `01/2025` ✅
- `12/2024` ✅

**Formatos Inválidos:**
- `2025/11` (formato invertido)
- `11-2025` (separador incorreto)
- `1/2025` (mês sem zero)

**Resultado:** ✅ Validação funcionando corretamente

## Como Executar os Testes

```bash
# Executar todos os testes do fluxo
cd apps/backend/inss
.venv\Scripts\python.exe -m pytest tests/test_fluxo_completo_autonomo.py -v

# Executar teste específico
.venv\Scripts\python.exe -m pytest tests/test_fluxo_completo_autonomo.py::TestFluxoCompletoAutonomo::test_05_fluxo_completo_simulado -v

# Executar com output detalhado
.venv\Scripts\python.exe -m pytest tests/test_fluxo_completo_autonomo.py -v -s
```

## Próximos Passos - Integrações Reais

### ⏳ Pendências para Teste E2E Completo

1. **Integração com Supabase**
   - [ ] Testar cadastro real de usuário no Supabase
   - [ ] Validar criação de perfil na tabela `profiles`
   - [ ] Validar criptografia de dados sensíveis (CPF, PIS)

2. **Integração com WhatsApp**
   - [ ] Testar envio de mensagem inicial após cadastro
   - [ ] Validar processamento de mensagem "Emitir GPS"
   - [ ] Testar fluxo de diálogo via WhatsApp

3. **Integração com Endpoint de Emissão**
   - [ ] Testar POST `/api/v1/guias/emitir` com dados reais
   - [ ] Validar salvamento na tabela `gps_emissions`
   - [ ] Validar envio de PDF via WhatsApp

4. **Teste de Integração Completo**
   - [ ] Cadastro via frontend → Supabase
   - [ ] Mensagem WhatsApp → Processamento → Resposta
   - [ ] Emissão GPS → PDF → Envio WhatsApp

## Estrutura do Fluxo Completo

```
1. CADASTRO
   ↓
   Frontend (CadastroPageGps.jsx)
   ↓
   API Backend (/api/auth/register)
   ↓
   Supabase Auth + Profiles
   ↓
   Redirecionamento WhatsApp

2. WHATSAPP
   ↓
   Mensagem inicial do usuário
   ↓
   Webhook WhatsApp (/whatsapp/webhook)
   ↓
   IA processa mensagem
   ↓
   Resposta com instruções

3. EMISSÃO GPS
   ↓
   Usuário: "Emitir GPS"
   ↓
   IA coleta dados (tipo, valor, competência)
   ↓
   POST /api/v1/guias/emitir
   ↓
   Cálculo GPS
   ↓
   Geração PDF
   ↓
   Salvamento no Supabase
   ↓
   Envio PDF via WhatsApp
```

## Validações Implementadas

✅ **Dados de Cadastro**
- CPF válido (11 dígitos)
- Email válido
- WhatsApp válido (10-11 dígitos)
- PIS opcional (11 dígitos)

✅ **Cálculo GPS**
- Valores corretos conforme alíquotas
- Códigos GPS corretos
- Validação de limites (mínimo/máximo)

✅ **Geração PDF**
- PDF válido (formato correto)
- Campos obrigatórios presentes
- Tamanho adequado

✅ **Formatos**
- WhatsApp (nacional/internacional)
- Competência (MM/AAAA)

## Histórico de Alterações

- **Janeiro 2025**: Criação dos testes E2E do fluxo autônomo
- **Janeiro 2025**: Validação de todos os componentes do fluxo
- **Janeiro 2025**: Documentação do fluxo completo

## Referências

- Fluxo documentado em: `docs/document_projet/FLUXO_APLICATIVO.md`
- Fluxo WhatsApp: `docs/document_projet/FLUXO_NOVO_WHATSAPP_ONLY.md`
- Endpoint de emissão: `apps/backend/inss/app/routes/inss.py`
- Webhook WhatsApp: `apps/backend/routes/whatsapp.ts`

