# Guia de Testes - Polling, PDF e Tratamento de Erros (NFSe)

## Visão Geral

Este documento descreve os testes e endpoints para validar:
1. **Emissão de NFS-e** via API Nacional
2. **Polling de Status** para rastrear emissões
3. **Download de PDF/DANFSe**
4. **Tratamento Robusto de Erros**
5. **Logs e Monitoramento**

---

## 1. ENDPOINTS DA API

### 1.1 Emissão de NFS-e

```http
POST /nfse
Content-Type: application/json

{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "versao": "1.00",
  "dps_xml_gzip_b64": "<base64-gzipped-xml>"
}
```

**Resposta de Sucesso (202):**
```json
{
  "protocolo": "PROTO-20251029-001",
  "chaveAcesso": "31062001251235800000112230000000173023019580208160",
  "numeroNfse": "1",
  "status": "EM_FILA",
  "situacao": "AGUARDANDO_PROCESSAMENTO",
  "dataProcessamento": "2025-10-29T14:30:00Z",
  "resposta": {
    "identificadorDps": "PROTO-20251029-001",
    "chaveAcesso": "31062001251235800000112230000000173023019580208160"
  }
}
```

**Erros Possíveis:**
- `400 Bad Request`: XML inválido, payload malformado
- `401 Unauthorized`: Certificado inválido ou expirado
- `422 Unprocessable Entity`: Validação de negócio falhou
- `500 Internal Server Error`: Erro no servidor

---

### 1.2 Polling de Status

```http
GET /nfse/{protocolo}
Accept: application/json
```

**Parâmetros:**
- `protocolo` (path): ID do protocolo retornado na emissão

**Resposta de Sucesso (200):**
```json
{
  "protocolo": "PROTO-20251029-001",
  "chaveAcesso": "31062001251235800000112230000000173023019580208160",
  "situacao": "AUTORIZADA",
  "numeroNfse": "1",
  "dataHoraProcessamento": "2025-10-29T14:35:22Z",
  "mensagens": []
}
```

**Estados Possíveis:**
- `AGUARDANDO_PROCESSAMENTO`: Enviado, aguardando processamento
- `EM_PROCESSAMENTO`: Sendo processado
- `AUTORIZADA`: Emitida com sucesso ✓
- `REJEITADA`: Emissão rejeitada ✗
- `CANCELADA`: Cancelada pelo usuário
- `SUBSTITUÍDA`: Substituída por nova emissão

---

### 1.3 Download de PDF/DANFSe

```http
GET /nfse/{chaveAcesso}/pdf
Accept: application/pdf
```

**Parâmetros:**
- `chaveAcesso` (path): Chave de acesso da NFS-e (44 ou 50 dígitos)

**Resposta de Sucesso (200):**
- Content-Type: `application/pdf`
- Body: Arquivo PDF em binário

**Headers Recomendados:**
```
Content-Disposition: inline; filename=NFSe-{chaveAcesso}.pdf
Content-Length: {tamanho}
```

---

### 1.4 Métricas do Sistema

```http
GET /nfse/metrics
Accept: application/json
```

**Resposta:**
```json
{
  "totalEmissions": 42,
  "successCount": 38,
  "failureCount": 4,
  "successRate": 90.48,
  "avgDuration": 2350,
  "p95Duration": 5200,
  "p99Duration": 8100,
  "errorsByType": {
    "INVALID_XML": 2,
    "CERT_EXPIRED": 1,
    "NETWORK_ERROR": 1
  },
  "certificateDaysUntilExpiry": 45,
  "window": "24h"
}
```

---

## 2. FLUXO DE TESTE COMPLETO

### Pré-requisitos
1. Backend rodando em `http://localhost:3333`
2. Certificado digital válido em `.env` (NFSE_CERT_PFX_BASE64 + NFSE_CERT_PFX_PASS)
3. Conexão com API Nacional de NFSe
4. Python 3.8+ instalado

### Executar Testes

```bash
# 1. Certificar que o backend está rodando
cd apps/backend
npm run dev

# 2. Em outro terminal, executar os testes
python test_nfse_polling_and_pdf.py
```

### Fluxo de Execução

```
┌─────────────────────────────────────────────────┐
│ 1. TESTE DE EMISSÃO                             │
│ POST /nfse                                      │
│ → Retorna: protocolo, status, chaveAcesso       │
└─────────────────────┬───────────────────────────┘
                      │
                      ↓
┌─────────────────────────────────────────────────┐
│ 2. POLLING DE STATUS (retry com backoff)        │
│ GET /nfse/{protocolo}                           │
│ → Aguarda: AUTORIZADA                           │
│ → Max 30 tentativas, intervalo 2s               │
└─────────────────────┬───────────────────────────┘
                      │
                      ↓
┌─────────────────────────────────────────────────┐
│ 3. DOWNLOAD DE PDF                              │
│ GET /nfse/{chaveAcesso}/pdf                     │
│ → Salva: nfse_download.pdf                      │
└─────────────────────┬───────────────────────────┘
                      │
                      ↓
┌─────────────────────────────────────────────────┐
│ 4. TESTE DE ERROS                               │
│ GET /nfse/{protocolo-invalido}                  │
│ → Verifica: tratamento de 400, 404, 500, etc.   │
└─────────────────────┬───────────────────────────┘
                      │
                      ↓
┌─────────────────────────────────────────────────┐
│ 5. MÉTRICAS DO SISTEMA                          │
│ GET /nfse/metrics                               │
│ → Valida: certificado, performance, erros       │
└─────────────────────────────────────────────────┘
```

---

## 3. TRATAMENTO DE ERROS

### 3.1 Erro HTTP 400 - Bad Request

**Causas:**
- XML DPS inválido
- Payload malformado
- Campo obrigatório faltando
- Valores fora do intervalo

**Resposta:**
```json
{
  "error": "Bad Request",
  "message": "Payload DPS invalido: [detalhes do erro XSD]",
  "code": "XML_VALIDATION_ERROR"
}
```

**Ação:**
1. Validar XML contra XSD local
2. Verificar conformidade com manual oficial
3. Chamar endpoint `/nfse/test-sim` para validação antes de emitir

---

### 3.2 Erro HTTP 401 - Unauthorized

**Causas:**
- Certificado expirado
- Certificado inválido
- Certificado não corresponde ao CPF/CNPJ

**Resposta:**
```json
{
  "error": "Unauthorized",
  "message": "Certificado invalido ou expirado",
  "code": "CERTIFICATE_ERROR",
  "details": {
    "daysUntilExpiry": -5,
    "notAfter": "2025-10-24T00:00:00Z"
  }
}
```

**Ação:**
1. Verificar data de expiração do certificado
2. Renovar certificado se necessário
3. Atualizar NFSE_CERT_PFX_BASE64 em .env
4. Reiniciar backend

---

### 3.3 Erro HTTP 422 - Unprocessable Entity

**Causas:**
- Validação de negócio falhou
- CPF/CNPJ não permitido para emissão
- Série ou número da DPS duplicados
- Valores de tributo inconsistentes

**Resposta:**
```json
{
  "error": "Unprocessable Entity",
  "message": "Validação de negócio falhou",
  "code": "BUSINESS_RULE_ERROR",
  "details": {
    "field": "numero_dps",
    "rule": "DUPLICADO",
    "message": "Número da DPS já foi utilizado"
  }
}
```

**Ação:**
1. Revisar regras de negócio no manual
2. Verificar se já existe emissão para essa DPS
3. Usar nova série ou número se necessário
4. Contactar suporte se erro persistir

---

### 3.4 Erro HTTP 500 - Internal Server Error

**Causas:**
- Erro na comunicação com API Nacional
- Erro na processamento do certificado
- Erro interno do servidor

**Resposta:**
```json
{
  "error": "Internal Server Error",
  "message": "Falha ao comunicar com a API Nacional de NFS-e",
  "code": "UPSTREAM_ERROR",
  "details": {
    "statusCode": 503,
    "message": "Serviço indisponível"
  }
}
```

**Ação:**
1. Verifique conectividade com API Nacional
2. Verifique status da API Nacional (https://www.nfse.gov.br)
3. Aguarde e tente novamente (backoff automático)
4. Se persistir, contactar suporte

---

### 3.5 Erro HTTP 503 - Service Unavailable

**Causas:**
- API Nacional em manutenção
- Servidor indisponível temporariamente
- Rate limiting atingido

**Resposta:**
```json
{
  "error": "Service Unavailable",
  "message": "API Nacional temporariamente indisponível",
  "retryAfter": 60
}
```

**Ação:**
1. Aguarde tempo indicado em `retryAfter`
2. Backend tentará automaticamente com backoff exponencial
3. Se após 3 tentativas continuar falhando, retorna erro ao cliente

---

## 4. RETRY AUTOMÁTICO COM BACKOFF EXPONENCIAL

### Estratégia

O backend implementa retry automático com backoff exponencial:

```
Tentativa 1: Imediato
Tentativa 2: Aguarda 1 segundo
Tentativa 3: Aguarda 2 segundos
Tentativa 4: Aguarda 4 segundos (máximo 3 tentativas por padrão)
```

### Erros Retentáveis

- HTTP 5xx (500, 502, 503, 504)
- Network timeout (ETIMEDOUT, ECONNREFUSED)
- DNS resolution failure (ENOTFOUND)
- HTTP 429 (Too Many Requests)

### Erros Não-Retentáveis

- HTTP 400 (Bad Request)
- HTTP 401 (Unauthorized)
- HTTP 403 (Forbidden)
- HTTP 404 (Not Found)
- HTTP 422 (Unprocessable Entity)

### Configuração

```env
# apps/backend/.env
NFSE_MAX_RETRIES=3               # Máximo de tentativas
NFSE_HTTP_TIMEOUT=30000          # Timeout em ms
NFSE_POLL_INTERVAL=2000          # Intervalo de polling em ms
NFSE_MAX_POLL_ATTEMPTS=30        # Máximo de polls
```

---

## 5. LOGS E MONITORAMENTO

### Estrutura de Logs

Todos os logs são estruturados em JSON para facilitar análise:

```json
{
  "timestamp": "2025-10-29T14:30:00.123Z",
  "level": "info",
  "scope": "nfse:emit",
  "message": "Emissão realizada com sucesso",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "protocolo": "PROTO-20251029-001",
  "duration": 2350,
  "statusCode": 202
}
```

### Eventos de Log Importantes

1. **Emissão iniciada:**
   ```
   [INFO] [NFSe] Iniciando emissão { userId, versao, attempt, maxRetries }
   ```

2. **Certificado validado:**
   ```
   [INFO] [NFSe] Certificado válido { tipo, doc, validade, daysUntilExpiry }
   ```

3. **XML assinado:**
   ```
   [INFO] [NFSe] XML assinado { userId, xmlLength }
   ```

4. **Payload enviado:**
   ```
   [INFO] [NFSe] Payload final enviado para API Nacional { userId, payload }
   ```

5. **Emissão bem-sucedida:**
   ```
   [INFO] [NFSe] Emissão realizada com sucesso { userId, protocolo, attempt, duration }
   ```

6. **Erro de emissão:**
   ```
   [ERROR] [NFSe] Emissão falhou { userId, attempt, error, stack, duration }
   ```

7. **Polling iniciado:**
   ```
   [INFO] [NFSe] Consultando status da emissão { protocolo, attempt }
   ```

8. **PDF baixado:**
   ```
   [INFO] [NFSe] DANFSe baixado com sucesso { chave, size }
   ```

---

## 6. EXEMPLO DE USO COMPLETO (cURL)

### Passo 1: Emitir NFS-e

```bash
curl -X POST http://localhost:3333/nfse \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "versao": "1.00",
    "dps_xml_gzip_b64": "H4sICNcM72YC/2Rwc0lsQ2xlYW4ueG1sAKtWSkksSVSyUkorzcnPS1WyMlKqBPEKUkoqgJRVFhcUFqUWKVkpWZkkFhUX5+eVFpUUK1kp5Bfn5ZQWlRSVFCtVAgBHEb9FfgAAAA=="
  }'
```

**Resposta:**
```json
{
  "protocolo": "PROTO-20251029-001",
  "chaveAcesso": "31062001251235800000112230000000173023019580208160",
  "status": "EM_FILA"
}
```

### Passo 2: Consultar Status (polling)

```bash
# Loop até obter AUTORIZADA
for i in {1..30}; do
  echo "Tentativa $i/30..."
  curl -X GET http://localhost:3333/nfse/PROTO-20251029-001 \
    -H "Accept: application/json"
  sleep 2
done
```

### Passo 3: Download de PDF

```bash
curl -X GET http://localhost:3333/nfse/31062001251235800000112230000000173023019580208160/pdf \
  -o nfse.pdf
```

---

## 7. VALIDAÇÃO DE CONFORMIDADE

### XSD Validation

Antes de emitir, valide localmente:

```bash
curl -X POST http://localhost:3333/nfse/test-sim \
  -H "Content-Type: application/json" \
  -d '{
    "dpsXml": "<xml>...</xml>"
  }'
```

**Resposta:**
```json
{
  "ok": true,
  "dpsXmlGzipB64": "H4sICNcM72YC/2Rwc0lsQ2xlYW4ueG1sAKtWSkksSVSyUkorzcnPS1WyMlKqBPEKUkoqgJRVFhcUFqUWKVkpWZkkFhUX5+eVFpUUK1kp5Bfn5ZQWlRSVFCtVAgBHEb9FfgAAAA==",
  "message": "XML processado e payload preparado com sucesso."
}
```

---

## 8. TROUBLESHOOTING

### Problema: Timeout ao conectar à API Nacional

**Solução:**
1. Verifique conectividade: `ping adn.producaorestrita.nfse.gov.br`
2. Verifique firewall: `telnet adn.producaorestrita.nfse.gov.br 443`
3. Aumente timeout em `.env`: `NFSE_HTTP_TIMEOUT=60000`
4. Verifique proxy/VPN se aplicável

### Problema: "Certificado inválido ou expirado"

**Solução:**
1. Verifique expiração: `openssl pkcs12 -in cert.pfx -text -noout -passin pass:{senha}`
2. Se expirado, renove o certificado com Certificadora
3. Atualize `NFSE_CERT_PFX_BASE64` em `.env`
4. Reinicie backend: `npm run dev`

### Problema: "XML inválido segundo o XSD"

**Solução:**
1. Use endpoint `/nfse/test-sim` para visualizar erro específico
2. Compare XML com exemplos no manual oficial
3. Valide campo por campo
4. Verifique ordem de elementos (XSD é sensível a ordem)

---

## 9. RECURSOS ADICIONAIS

- 📖 Manual Oficial: https://www.nfse.gov.br/EmissorNacional
- 🔧 XSD Schema: `apps/backend/src/nfse/xsd/DPS_v1.00.xsd`
- 📝 Documentação de Erros: `.env.documentation`
- 🧪 Script de Testes: `test_nfse_polling_and_pdf.py`

---

**Versão:** 1.0  
**Atualizado:** 2025-10-29  
**Autor:** Sistema GuiasMEI
