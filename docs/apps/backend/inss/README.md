# INSS Guias API

Backend em FastAPI para emissão de guias INSS, complementações e atendimento via WhatsApp com agentes de IA.

## Requisitos

- Python 3.11+
- Conta Supabase (PostgreSQL e Storage liberado)
- Conta Twilio com WhatsApp Business API habilitada
- Chave OpenAI (suporta GPT-5)

## Instalação

```bash
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

Preencha o arquivo `.env` com as credenciais reais.

## Configuração Supabase

1. Crie o projeto e habilite a extensão `uuid-ossp`.
2. Execute o schema abaixo no SQL editor.
3. Crie um bucket público chamado `guias` para armazenar PDFs.
4. Gere uma chave anon e preencha `SUPABASE_URL` + `SUPABASE_KEY`.

## WhatsApp Business (Twilio)

1. Solicite acesso à API de WhatsApp no console da Meta.
2. No Twilio, crie um número Sandbox ou produção e habilite WhatsApp.
3. Configure o Webhook apontando para `POST /webhook/whatsapp` da API (usar ngrok em desenvolvimento).
4. Atualize o `.env` com `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` e `TWILIO_WHATSAPP_NUMBER`.

## Execução

```bash
uvicorn app.main:app --reload
```

## Exemplos de Requisições

```bash
curl -X POST http://localhost:8000/api/v1/guias/emitir \
  -H "Content-Type: application/json" \
  -d '{
    "whatsapp": "+5511999999999",
    "tipo_contribuinte": "autonomo",
    "valor_base": 2000.0,
    "plano": "normal",
    "competencia": "10/2025"
  }'
```

```bash
curl -X POST http://localhost:8000/api/v1/guias/complementacao \
  -H "Content-Type: application/json" \
  -d '{
    "whatsapp": "+5511999999999",
    "competencias": ["01/2024", "02/2024", "03/2024"],
    "valor_base": 1518.0
  }'
```

```bash
curl http://localhost:8000/api/v1/usuarios/+5511999999999/historico
```

## Testes

Todos os testes do módulo INSS foram validados e estão passando:

### Executar Todos os Testes

```bash
# Teste 1: Calculadora INSS (6 tipos de contribuinte)
python test_01_calculadora.py

# Teste 2: Geração de PDF via API (3 tipos)
python test_02_pdf_generator.py

# Teste 3: Estrutura de Endpoints (3 validações)
python test_03_api_endpoints.py

# Teste 4: Integração Supabase (4 validações)
python test_04_supabase.py

# Teste 5: Integração WhatsApp/Twilio (3 validações)
python test_05_whatsapp.py

# Teste 6: Fluxo Completo (6 validações)
python test_06_fluxo_completo.py

# Teste 7: End-to-End Emissão (3 tipos de guias)
python test_07_emitir_e2e.py
```

### Resumo dos Resultados

| Teste | Descrição | Status | Validações |
|-------|-----------|--------|------------|
| ✅ Teste 1 | Calculadora INSS | **PASSOU** | 6/6 |
| ✅ Teste 2 | Geração de PDF | **PASSOU** | 3/3 |
| ✅ Teste 3 | Estrutura Endpoints | **PASSOU** | 3/3 |
| ✅ Teste 4 | Integração Supabase | **PASSOU** | 4/4 |
| ✅ Teste 5 | Integração WhatsApp | **PASSOU** | 3/3 |
| ✅ Teste 6 | Fluxo Completo | **PASSOU** | 6/6 |
| ✅ Teste 7 | End-to-End Emissão | **PASSOU** | 3/3 |

**Total: 31 validações - 100% aprovadas** ✓

### Detalhes dos Testes

- **Teste 1**: Valida cálculos para autônomo (normal/simplificado), doméstico, produtor rural, facultativo e facultativo baixa renda
- **Teste 2**: Gera PDFs via API para autônomo, doméstico e produtor rural (salva em `test_output/`)
- **Teste 3**: Verifica estrutura dos endpoints `/emitir`, `/complementacao` e `/gerar-pdf`
- **Teste 4**: Valida conexão com Supabase, configurações e estrutura do banco
- **Teste 5**: Verifica credenciais Twilio e estrutura para envio WhatsApp (modo mock)
- **Teste 6**: Testa fluxo completo de config, calculadora, PDF, Supabase e Twilio
- **Teste 7**: End-to-End completo com registro no Supabase e envio WhatsApp (mock)

### Observações

- **Supabase**: Testes usam modo mock para não criar registros reais durante desenvolvimento
- **WhatsApp**: Testes rodam em modo mock (credenciais Twilio não obrigatórias para validação)
- **GPT-5**: Agente de IA habilitado com fallback automático para GPT-4o

## Troubleshooting

- **Erro 401 ao falar com Supabase**: confirme URL e key anon. Verifique se as tabelas existem.
- **Twilio exige URL pública para PDF**: assegure que o bucket `guias` está público ou gere signed URL.
- **PDF sem código de barras**: instale `python-barcode` e `Pillow` (já listados) e confirme que o bucket aceita binários.
- **Erro com OpenAI**: cheque saldo. O padrão é `gpt-5`; você pode definir `OPENAI_CHAT_MODEL` (ex.: `gpt-5`, `gpt-4o`). Há fallback automático para `gpt-4o` se `gpt-5` não estiver disponível.

## Escalabilidade

- Utilize Redis para cachear tabelas SAL ou respostas frequentes.
- Descarregue geração de PDF em fila (Celery/Redis).
- Armazene PDFs no Supabase Storage com CDN (Cloudflare).
- Aplique rate limiting (FastAPI-limiter) nos endpoints públicos.
- Monitore a aplicação com Sentry (erros) e Prometheus (métricas).
- Publique o container em plataformas como Railway ou Render com auto scale.
