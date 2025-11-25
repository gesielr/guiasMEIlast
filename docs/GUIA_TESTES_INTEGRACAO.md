# Guia de Testes de Integração Real - Fluxo Autônomo

**Data:** Janeiro 2025  
**Status:** ✅ Testes Criados  
**Arquivo:** `apps/backend/inss/tests/test_integracao_real.py`

## Objetivo

Este guia explica como executar os testes de integração real que fazem chamadas ao:
- **Supabase** (cadastro de usuário, salvamento de guias)
- **Endpoint de Emissão** (POST `/api/v1/guias/emitir`)
- **WhatsApp** (simulado, não envia mensagens reais)

## Pré-requisitos

### 1. Variáveis de Ambiente

Certifique-se de que o arquivo `.env` está configurado com:

```env
# Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=eyJ...  # Service Role Key ou Anon Key

# WhatsApp (opcional para testes)
TWILIO_ACCOUNT_SID=seu-sid
TWILIO_AUTH_TOKEN=seu-token
TWILIO_WHATSAPP_NUMBER=whatsapp:+5511999999999

# API URL (para testes de endpoint)
API_URL=http://localhost:8000
```

### 2. Dependências Python

Instale as dependências necessárias:

```bash
cd apps/backend/inss
.venv\Scripts\python.exe -m pip install httpx pytest-asyncio
```

Ou adicione ao `requirements.txt`:
```
httpx>=0.24.0
pytest-asyncio>=0.21.0
```

### 3. Servidor FastAPI (Opcional)

Para testar o endpoint de emissão, inicie o servidor:

```bash
cd apps/backend/inss
.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

## Como Executar os Testes

### Opção 1: Script de Execução (Recomendado)

```bash
cd apps/backend/inss
.venv\Scripts\python.exe run_testes_integracao.py
```

Este script:
- Verifica configurações
- Executa todos os testes de integração
- Mostra resultados detalhados

### Opção 2: Pytest Direto

```bash
cd apps/backend/inss
.venv\Scripts\python.exe -m pytest tests/test_integracao_real.py -v -s
```

### Opção 3: Teste Específico

```bash
# Apenas testes de Supabase
.venv\Scripts\python.exe -m pytest tests/test_integracao_real.py::TestIntegracaoSupabase -v

# Apenas testes de endpoint
.venv\Scripts\python.exe -m pytest tests/test_integracao_real.py::TestIntegracaoEndpoint -v

# Apenas teste E2E completo
.venv\Scripts\python.exe -m pytest tests/test_integracao_real.py::TestE2ECompleto -v
```

## Testes Disponíveis

### TestIntegracaoSupabase

| Teste | Descrição | Requisitos |
|-------|-----------|------------|
| `test_01_criar_usuario_supabase` | Cria usuário na tabela `usuarios` | Supabase acessível |
| `test_02_buscar_usuario_por_whatsapp` | Busca usuário pelo WhatsApp | Supabase + usuário criado |
| `test_03_salvar_guia_supabase` | Salva guia GPS na tabela `guias` | Supabase + usuário criado |

### TestIntegracaoEndpoint

| Teste | Descrição | Requisitos |
|-------|-----------|------------|
| `test_01_health_check` | Verifica se servidor está rodando | Servidor FastAPI na porta 8000 |
| `test_02_emitir_guia_endpoint` | Emite guia via POST `/api/v1/guias/emitir` | Servidor rodando + Supabase |
| `test_03_gerar_pdf_endpoint` | Gera PDF via POST `/api/v1/guias/gerar-pdf` | Servidor rodando |

### TestE2ECompleto

| Teste | Descrição | Requisitos |
|-------|-----------|------------|
| `test_fluxo_completo_e2e` | Fluxo completo: Cadastro → Cálculo → Emissão | Supabase + Servidor (opcional) |

## Comportamento dos Testes

### Testes que Requerem Supabase

Se o Supabase não estiver disponível, os testes serão **pulados** (skipped) com mensagem:
```
⚠ Supabase não disponível - pulando teste de integração
```

### Testes que Requerem Servidor

Se o servidor não estiver rodando, os testes serão **pulados** com mensagem:
```
⚠ Servidor não está rodando em http://localhost:8000
```

### Testes que Sempre Passam

Alguns testes não requerem integrações externas e sempre executam:
- Cálculo de GPS
- Validação de dados
- Estrutura de payloads

## Estrutura dos Testes

```
test_integracao_real.py
├── TestIntegracaoSupabase
│   ├── test_01_criar_usuario_supabase
│   ├── test_02_buscar_usuario_por_whatsapp
│   └── test_03_salvar_guia_supabase
├── TestIntegracaoEndpoint
│   ├── test_01_health_check
│   ├── test_02_emitir_guia_endpoint
│   └── test_03_gerar_pdf_endpoint
└── TestE2ECompleto
    └── test_fluxo_completo_e2e
```

## Exemplo de Execução

```bash
$ python run_testes_integracao.py

======================================================================
TESTES DE INTEGRAÇÃO REAL - FLUXO AUTÔNOMO
======================================================================

Configurações:
  - Supabase URL: https://idvfhgznofvubscjycvt.supabase.co...
  - Supabase Key: ✓ Configurado
  - WhatsApp: whatsapp:+5548991117268

tests/test_integracao_real.py::TestIntegracaoSupabase::test_01_criar_usuario_supabase PASSED
tests/test_integracao_real.py::TestIntegracaoSupabase::test_02_buscar_usuario_por_whatsapp PASSED
tests/test_integracao_real.py::TestIntegracaoSupabase::test_03_salvar_guia_supabase PASSED
tests/test_integracao_real.py::TestIntegracaoEndpoint::test_01_health_check PASSED
tests/test_integracao_real.py::TestIntegracaoEndpoint::test_02_emitir_guia_endpoint PASSED
tests/test_integracao_real.py::TestIntegracaoEndpoint::test_03_gerar_pdf_endpoint PASSED
tests/test_integracao_real.py::TestE2ECompleto::test_fluxo_completo_e2e PASSED

======================================================================
✅ TODOS OS TESTES PASSARAM!
======================================================================
```

## Troubleshooting

### Erro: "Supabase não disponível"

**Causa:** Variáveis de ambiente não configuradas ou Supabase inacessível.

**Solução:**
1. Verifique o arquivo `.env` em `apps/backend/inss/.env`
2. Confirme que `SUPABASE_URL` e `SUPABASE_KEY` estão corretos
3. Teste a conexão manualmente:
   ```python
   from app.services.supabase_service import SupabaseService
   service = SupabaseService()
   print(service.client)  # Deve retornar um cliente, não None
   ```

### Erro: "Servidor não está rodando"

**Causa:** Servidor FastAPI não está iniciado.

**Solução:**
1. Inicie o servidor em outro terminal:
   ```bash
   cd apps/backend/inss
   .venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
   ```
2. Aguarde a mensagem: `Uvicorn running on http://127.0.0.1:8000`
3. Execute os testes novamente

### Erro: "ModuleNotFoundError: No module named 'httpx'"

**Causa:** Dependência não instalada.

**Solução:**
```bash
.venv\Scripts\python.exe -m pip install httpx pytest-asyncio
```

### Erro: "asyncio mode not set"

**Causa:** pytest-asyncio não configurado.

**Solução:**
```bash
.venv\Scripts\python.exe -m pip install pytest-asyncio
# Ou adicione ao pytest.ini:
# [pytest]
# asyncio_mode = auto
```

## Próximos Passos

Após executar os testes de integração:

1. ✅ Validar que Supabase está funcionando
2. ✅ Validar que endpoint de emissão está funcionando
3. ⏳ Testar integração real com WhatsApp (requer credenciais Twilio)
4. ⏳ Testar fluxo completo em ambiente de desenvolvimento
5. ⏳ Testar em ambiente de staging/produção

## Notas Importantes

- **Dados de Teste:** Os testes usam números de WhatsApp únicos baseados em timestamp para evitar conflitos
- **Modo Mock:** Se WhatsApp não estiver configurado, o sistema opera em modo mock (não envia mensagens reais)
- **Limpeza:** Os testes criam dados no Supabase. Em produção, considere limpar dados de teste periodicamente
- **Segurança:** Nunca commite credenciais reais no código. Use sempre variáveis de ambiente

## Referências

- Testes unitários: `tests/test_conformidade_inss.py`
- Testes de fluxo: `tests/test_fluxo_completo_autonomo.py`
- Endpoint de emissão: `app/routes/inss.py`
- Serviço Supabase: `app/services/supabase_service.py`

