# 🚀 Quick Reference - NFSe GuiasMEI

## ⚡ Comandos Rápidos

```powershell
# Executar testes
./run-tests.ps1 -TestType both

# Teste Node.js apenas
node test_nfse_polling_and_pdf.mjs

# Teste Python apenas
py test_nfse_polling_and_pdf.py

# Iniciar backend
cd apps/backend && npm run dev

# Iniciar frontend
cd apps/web && npm run dev
```

---

## 📋 Endpoints da API

```
POST   /nfse                          → Emitir NFS-e
GET    /nfse/{protocolo}              → Consultar status
GET    /nfse/{chaveAcesso}/pdf        → Baixar PDF
GET    /nfse/metrics                  → Métricas do sistema
POST   /nfse/test-sim                 → Validar XML
```

---

## 🔄 Estados da NFS-e

```
AGUARDANDO_PROCESSAMENTO  → Emissão sendo processada
AUTORIZADA                → Pronta (pode baixar PDF)
REJEITADA                 → Validação falhou
CANCELADA                 → Cancelada pelo usuário
SUBSTITUÍDA               → Substituída por outra
```

---

## 📊 Código de Retorno HTTP

```
200 OK                    → Sucesso
202 Accepted              → Processando
400 Bad Request           → XML inválido (NÃO RETRY)
401 Unauthorized          → Certificado inválido (NÃO RETRY)
422 Unprocessable Entity  → Dados inválidos (NÃO RETRY)
429 Too Many Requests     → Rate limit (RETRY)
500 Internal Server Error → Erro servidor (RETRY)
503 Service Unavailable   → API indisponível (RETRY)
```

---

## 🔐 Variáveis de Ambiente (NFSe)

```bash
# API
NFSE_API_URL=https://adn.producaorestrita.nfse.gov.br
NFSE_ENVIRONMENT=development  # ou production

# Certificado
NFSE_CERT_PFX_BASE64=<base64-do-certificado>
NFSE_CERT_PFX_PASS=<senha-do-certificado>

# Retry e Timeout
NFSE_MAX_RETRIES=3
NFSE_HTTP_TIMEOUT=30000      # 30 segundos
NFSE_POLL_INTERVAL=2000      # 2 segundos entre tentativas
NFSE_MAX_POLL_ATTEMPTS=30

# Supabase
NFSE_PDF_STORAGE_BUCKET=nfse-pdfs
```

---

## 📈 Retry Strategy

```
Tentativa 1  → Aguarda 1 segundo
Tentativa 2  → Aguarda 2 segundos
Tentativa 3  → Aguarda 4 segundos
Total: até 7 segundos de espera + tempo de processamento
```

---

## 🧪 Testes Rápidos (cURL)

```bash
# 1. Emitir
curl -X POST http://localhost:3333/nfse \
  -H "Content-Type: application/json" \
  -d '{"dpsXml": "..."}'

# 2. Consultar status
curl http://localhost:3333/nfse/PROTO-20251029-001

# 3. Baixar PDF
curl http://localhost:3333/nfse/31062001251235800000112230000000173023019580208160/pdf \
  -o nfse.pdf

# 4. Métricas
curl http://localhost:3333/nfse/metrics
```

---

## 📁 Arquivos Importantes

```
README_NFSE.md                      → Documentação completa
TESTING_GUIDE.md                    → Guia de testes
.env.documentation                  → Todas as variáveis
CHECKLIST_IMPLEMENTACAO.md          → Checklist completo
test_nfse_polling_and_pdf.mjs       → Testes Node.js
test_nfse_polling_and_pdf.py        → Testes Python
run-tests.ps1                       → Script de execução
SOLUCAO_COMPLETA.md                 → Resumo da solução
```

---

## 🐛 Troubleshooting Rápido

| Problema | Solução |
|----------|---------|
| Conexão recusada | `npm run dev` em apps/backend |
| Certificado inválido | Verificar NFSE_CERT_PFX_BASE64 em .env |
| XML inválido | Usar POST /nfse/test-sim para detalhes |
| Timeout | Aumentar NFSE_HTTP_TIMEOUT |
| Polling não avança | Verificar logs em apps/backend/logs/ |
| PDF não baixa | Aguardar status AUTORIZADA |

---

## 📊 Estrutura de Resposta

### Emissão (POST /nfse)

```json
{
  "protocolo": "PROTO-20251029-001",
  "chaveAcesso": "31062001251235800000112230000000173023019580208160",
  "status": "AGUARDANDO_PROCESSAMENTO",
  "timestamp": "2025-10-29T14:30:00.123Z"
}
```

### Polling (GET /nfse/{protocolo})

```json
{
  "status": "AUTORIZADA",
  "timestamp": "2025-10-29T14:31:00.123Z",
  "chaveAcesso": "31062001251235800000112230000000173023019580208160"
}
```

### Métricas (GET /nfse/metrics)

```json
{
  "totalEmissions": 42,
  "successRate": 90.48,
  "avgDuration": 2350,
  "certificateDaysUntilExpiry": 45,
  "errorsByType": {
    "INVALID_XML": 2,
    "CERT_EXPIRED": 1
  }
}
```

---

## 🎯 Fluxo Típico

```
1. Usuario clica em "Emitir NFS-e"
   ↓
2. Backend: POST /nfse (com retry automático)
   ↓
3. Recebe protocolo e inicia polling
   ↓
4. GET /nfse/{protocolo} a cada 2 segundos (max 30x)
   ↓
5. Quando status = AUTORIZADA
   ↓
6. GET /nfse/{chaveAcesso}/pdf
   ↓
7. Salva PDF e notifica usuario
```

---

## 📈 Monitoramento

```
Dashboard: http://localhost:5173/admin/nfse/emissoes

Logs: apps/backend/logs/

Métricas: GET /nfse/metrics

Status: curl http://localhost:3333/health
```

---

## ✅ Validação Pré-Produção

- [ ] Backend rodando
- [ ] Testes passando (`./run-tests.ps1 -TestType both`)
- [ ] Certificado válido
- [ ] .env configurado
- [ ] Logs funcionando
- [ ] Dashboard acessível
- [ ] Supabase conectado

---

## 🔗 Links Úteis

- Manual: `Guia EmissorPúblicoNacionalWEB_SNNFSe-ERN - v1.2.txt`
- API Nacional: https://www.nfse.gov.br
- Documentação: Ver README_NFSE.md
- Testes: Ver TESTING_GUIDE.md
- Variáveis: Ver .env.documentation

---

**Salve este arquivo! Imprima para sua mesa! 📌**

