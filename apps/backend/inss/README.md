# INSS Guias API

Backend em FastAPI para emissão de guias INSS, complementações e atendimento via WhatsApp com agentes de IA.

## Requisitos

- Python 3.11+
- Conta Supabase (PostgreSQL e Storage liberado)
- Conta Twilio com WhatsApp Business API habilitada
- Chave OpenAI GPT-4

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

```bash
pytest
```

## Troubleshooting

- **Erro 401 ao falar com Supabase**: confirme URL e key anon. Verifique se as tabelas existem.
- **Twilio exige URL pública para PDF**: assegure que o bucket `guias` está público ou gere signed URL.
- **PDF sem código de barras**: instale `python-barcode` e `Pillow` (já listados) e confirme que o bucket aceita binários.
- **Erro com OpenAI**: cheque saldo e mantenha o modelo em `gpt-4o` ou superior.

## Escalabilidade

- Utilize Redis para cachear tabelas SAL ou respostas frequentes.
- Descarregue geração de PDF em fila (Celery/Redis).
- Armazene PDFs no Supabase Storage com CDN (Cloudflare).
- Aplique rate limiting (FastAPI-limiter) nos endpoints públicos.
- Monitore a aplicação com Sentry (erros) e Prometheus (métricas).
- Publique o container em plataformas como Railway ou Render com auto scale.
