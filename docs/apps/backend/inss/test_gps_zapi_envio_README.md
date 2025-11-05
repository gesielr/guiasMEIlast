# 📋 Teste de Envio de GPS via Z-API WhatsApp

## 🎯 Objetivo

Testar o envio de Guias GPS (PDF) via WhatsApp usando Z-API, validando:
- ✅ Carregamento de PDF local
- ✅ Conversão para Base64 com prefixo data URI
- ✅ Envio via endpoint `/send-document`
- ✅ Validação de respostas (200, 401, 403, 415, etc)
- ✅ Testes negativos (token inválido, telefone mal formatado)
- ✅ Geração de logs e evidências

## 📦 Pré-requisitos

```bash
# Instalar dependências
pip install httpx requests

# Ou se já tem requirements.txt
pip install -r apps/backend/inss/app/requirements.txt
```

## ⚙️ Configuração

### Variáveis de Ambiente

Configure no arquivo `.env` ou exporte no terminal:

```bash
# Z-API Configuration
ZAPI_BASE_URL=https://api.z-api.io
# OU
ZAPI_BASE=https://api.z-api.io

ZAPI_INSTANCE_ID=seu_instance_id
# OU
ZAPI_INSTANCE=seu_instance_id

ZAPI_TOKEN=seu_token

ZAPI_CLIENT_TOKEN=seu_client_token

# Telefone de teste (apenas números, com DDI 55)
TEST_PHONE=5548991117268
```

### Formato do Telefone

- ✅ **Correto**: `5548991117268` (DDI 55 + DDD 48 + número)
- ❌ **Incorreto**: `48991117268` (sem DDI)
- ❌ **Incorreto**: `+5548991117268` (com +)

## 🚀 Como Executar

```bash
cd apps/backend/inss
python test_gps_zapi_envio.py
```

## 📊 O que o Teste Faz

### 1. **Carregamento de Variáveis** ✅
- Carrega variáveis de ambiente
- Valida se todas estão presentes
- Mostra configurações (sem expor tokens completos)

### 2. **Carregamento do PDF** ✅
- Carrega `test_output/Modelo de GPS.pdf`
- Calcula tamanho e checksum SHA256
- Valida limite do WhatsApp (16MB)

### 3. **Conversão para Base64** ✅
- Converte PDF para Base64
- Adiciona prefixo `data:application/pdf;base64,`
- Valida formato data URI

### 4. **Envio via Z-API** ✅
- Constrói URL do endpoint
- Envia POST com headers corretos
- Valida resposta (espera 200 com zaapId e messageId)

### 5. **Testes Negativos** ✅
- **Token inválido**: Espera 401/403
- **Telefone mal formatado**: Espera 4xx

### 6. **Geração de Logs** ✅
- Salva log completo em `test_output/logs/gps_envio_<timestamp>.json`
- Inclui todas as evidências do teste

## 📁 Estrutura do Log

```json
{
  "teste": "envio_gps_zapi",
  "timestamp": "2025-02-22T10:30:00",
  "status_http": 200,
  "sucesso": true,
  "telefone_destino": "5548991117268",
  "pdf_metadata": {
    "tamanho_bytes": 12345,
    "tamanho_kb": 12.05,
    "checksum_sha256": "abc123...",
    "nome_arquivo": "Modelo de GPS.pdf"
  },
  "resposta_zapi": {
    "zaapId": "zaap_123",
    "messageId": "msg_456",
    "status": "sent"
  },
  "saidas_esperadas": {
    "status_http": 200,
    "zaapId": "zaap_123",
    "messageId": "msg_456",
    "pdf_bytes": 12345,
    "checksum_sha256": "abc123...",
    "telefone_destino": "5548991117268",
    "timestamp_envio": "2025-02-22T10:30:00"
  }
}
```

## ✅ Critérios de Sucesso

- ✅ HTTP 200 retornado
- ✅ `zaapId` e `messageId` presentes na resposta
- ✅ PDF entregue no WhatsApp (confirmação visual)
- ✅ Log salvo com todas as evidências
- ✅ Nenhum token exposto nos logs

## 🔍 Validações de Erro

### Status 415 (Unsupported Media Type)
- **Causa**: Content-Type incorreto ou formato não suportado
- **Solução**: Verificar se está usando `application/json` e Base64 válido

### Status 405 (Method Not Allowed)
- **Causa**: Método HTTP incorreto
- **Solução**: Deve ser POST, não GET

### Status 401/403 (Unauthorized/Forbidden)
- **Causa**: Token inválido ou não autorizado
- **Solução**: Verificar `ZAPI_TOKEN` e `ZAPI_CLIENT_TOKEN`

### Status 400 (Bad Request)
- **Causa**: Payload inválido (telefone mal formatado, etc)
- **Solução**: Verificar formato do telefone e payload

## 📝 Referências

- **Z-API Docs**: https://developer.z-api.io
- **Endpoint**: `POST /instances/{instance}/token/{token}/send-document`
- **Formato**: Base64 com prefixo `data:application/pdf;base64,`

## 🐛 Troubleshooting

### "Variáveis de ambiente faltando"
- Configure todas as variáveis no `.env`
- Ou exporte no terminal antes de executar

### "Arquivo não encontrado"
- Verifique se `test_output/Modelo de GPS.pdf` existe
- Execute de dentro do diretório `apps/backend/inss`

### "Timeout ao enviar PDF"
- PDF pode estar muito grande (>16MB)
- Verifique conexão com internet
- Timeout padrão: 30 segundos

### "Token inválido"
- Verifique `ZAPI_TOKEN` e `ZAPI_CLIENT_TOKEN` no painel Z-API
- Certifique-se de que o token está ativo

