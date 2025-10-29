# GuiasMEI - Sistema de Emissão de NFSe (Nacional)

## 📋 Visão Geral

Sistema completo para emissão, rastreamento e gerenciamento de **Notas Fiscais de Serviço (NFS-e)** eletrônicas usando a **API Nacional da Sefin Nacional**.

**Status:** ✅ Sistema operacional com validação completa de:
- ✓ Emissão de NFSe com certificado digital
- ✓ Polling automático de status (com retry)
- ✓ Download de PDF/DANFSe
- ✓ Tratamento robusto de erros
- ✓ Logs estruturados e monitoramento
- ✓ Retry automático com backoff exponencial

---

## 🚀 Quick Start

### Pré-requisitos

```bash
- Node.js 18+
- Python 3.8+ (opcional, para testes)
- Certificado digital A1/A3 (ICP-Brasil)
- Supabase conta ativa
- Conexão com internet
```

### Instalação

```bash
# 1. Clonar e instalar dependências
git clone <repo>
cd guiasMEI
npm install
cd apps/backend && npm install

# 2. Configurar variáveis de ambiente
cp .env.example apps/backend/.env
# Editar .env com:
# - SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
# - NFSE_CERT_PFX_BASE64 (certificado em base64)
# - NFSE_CERT_PFX_PASS (senha do certificado)

# 3. Iniciar backend
npm run dev

# 4. Iniciar frontend (em outro terminal)
cd ../web && npm run dev

# 5. Executar testes
node test_nfse_polling_and_pdf.mjs  # ou
py test_nfse_polling_and_pdf.py      # com Python
```

---

## 📚 Documentação

### Guias Principais

| Documento | Descrição |
|-----------|-----------|
| **[TESTING_GUIDE.md](./TESTING_GUIDE.md)** | Guia completo de testes, endpoints e troubleshooting |
| **[.env.documentation](./.env.documentation)** | Documentação de todas as variáveis de ambiente |
| **[Guia EmissorPúblico...](./Guia%20EmissorPúblicoNacionalWEB_SNNFSe-ERN%20-%20v1.2.txt)** | Manual oficial da API Nacional |

### Endpoints da API

```
POST   /nfse                    # Emitir NFS-e
GET    /nfse/{protocolo}        # Consultar status (polling)
GET    /nfse/{chaveAcesso}/pdf  # Baixar PDF/DANFSe
GET    /nfse/metrics            # Obter métricas do sistema
POST   /nfse/test-sim           # Validar XML antes de emitir
```

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────┐
│                    Frontend Web                  │
│              (React + Vite + Tailwind)          │
└──────────────────┬──────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────┐
│                 Backend API (Fastify)            │
│  ├─ /nfse              (emitir)                 │
│  ├─ /nfse/{id}         (polling)                │
│  ├─ /nfse/{id}/pdf     (download PDF)           │
│  └─ /nfse/metrics      (monitoramento)          │
└──────────────────┬──────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────┐
│  Camada de Serviço (NfseService)                │
│  ├─ Assinatura XML (xml-crypto + node-forge)   │
│  ├─ Validação XSD                              │
│  ├─ Compressão GZIP + Base64                   │
│  ├─ Retry com backoff exponencial              │
│  └─ Logging estruturado                        │
└──────────────────┬──────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────┐
│   API Nacional de NFSe (Sefin Nacional)        │
│ https://adn.producaorestrita.nfse.gov.br/      │
└─────────────────────────────────────────────────┘
```

---

## 🔐 Segurança

### Certificado Digital

- **Tipo:** A1 ou A3 (ICP-Brasil)
- **Método de armazenamento:** Base64 em `.env` (desenvolvimento) ou Supabase Vault (produção)
- **Renovação:** Alertas automáticos quando < 30 dias para expiração
- **Validação:** Verificação de validade e correspondência com CNPJ

### Credenciais

```env
# ⚠️ NUNCA fazer commit desses valores
SUPABASE_SERVICE_ROLE_KEY=xxx     # Backend only
NFSE_CERT_PFX_BASE64=xxx          # Base64 do .pfx
NFSE_CERT_PFX_PASS=xxx            # Senha do certificado
```

### Validação

- ✓ XSD Validation (XML contra schema oficial)
- ✓ Assinatura digital (RSA-SHA256)
- ✓ Mutual TLS (certificado cliente obrigatório)
- ✓ Rate limiting automático
- ✓ Sanitização de inputs

---

## 📊 Workflow Completo

```
┌─ Usuário emite NFS-e via Web
│
├─ Backend recebe requisição
│  ├─ Valida certificado
│  ├─ Limpa e valida XML contra XSD
│  ├─ Assina XML com certificado
│  └─ Comprime (GZIP) e codifica (Base64)
│
├─ Envia para API Nacional
│  ├─ Com retry automático (max 3 tentativas)
│  ├─ Backoff exponencial: 1s → 2s → 4s
│  └─ Retorna: protocolo, status, chaveAcesso
│
├─ Worker de polling inicia
│  ├─ Consulta status a cada 2s
│  ├─ Max 30 tentativas (1 minuto)
│  └─ Se AUTORIZADA: baixa PDF e salva no storage
│
├─ Usuário recebe notificação
│  ├─ Email com chave de acesso
│  ├─ WhatsApp com link do PDF
│  └─ Dashboard atualizado com status
│
└─ Documentos disponíveis para download
   ├─ XML da NFS-e
   └─ PDF/DANFSe
```

---

## 🧪 Testes e Validação

### Executar Testes Completos

```bash
# Node.js (recomendado)
node test_nfse_polling_and_pdf.mjs

# Python (alternativo)
py test_nfse_polling_and_pdf.py

# Output esperado:
# ✓ Emissão de NFS-e: PASS
# ✓ Polling (tentativa 1/30): OK
# ⊙ Polling (tentativa 2/30): OK
# ...
# ✓ Polling: PASS
# ✓ Download de PDF: PASS
# ✓ Tratamento de Erros: PASS
# ✓ Certificado/Métricas: PASS
# 
# RESUMO: Total: 5, Passou: 5, Falhou: 0
```

### Testes Incluídos

1. **Emissão** - POST /nfse com payload válido
2. **Polling** - GET /nfse/{protocolo} com retry automático
3. **Download PDF** - GET /nfse/{chave}/pdf
4. **Tratamento de Erros** - Protocolo inválido, vazio, etc.
5. **Métricas** - GET /nfse/metrics (certificado e performance)

### Validação Manual

```bash
# 1. Validar XML antes de emitir
curl -X POST http://localhost:3333/nfse/test-sim \
  -H "Content-Type: application/json" \
  -d '{"dpsXml": "<xml>..."}'

# 2. Emitir NFS-e
curl -X POST http://localhost:3333/nfse \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "...",
    "versao": "1.00",
    "dps_xml_gzip_b64": "..."
  }'

# 3. Consultar status (polling)
curl http://localhost:3333/nfse/PROTO-20251029-001

# 4. Baixar PDF
curl http://localhost:3333/nfse/31062001251235800000112230000000173023019580208160/pdf \
  -o nfse.pdf
```

---

## 📈 Monitoramento e Logs

### Métricas Disponíveis

```bash
GET /nfse/metrics
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
  "certificateDaysUntilExpiry": 45
}
```

### Logs Estruturados

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

### Dashboard de Monitoramento

Disponível em: `http://localhost:5173/admin/nfse/emissoes`

- 📊 Gráficos de emissões (últimas 24h)
- 📈 Taxa de sucesso
- ⏱️ Tempo médio de emissão
- 🚨 Alertas (certificado próximo do vencimento)
- 📝 Logs estruturados em tempo real

---

## 🐛 Troubleshooting

### Problema: "Conexão recusada"

```bash
# Verificar se backend está rodando
lsof -i :3333
# Ou reiniciar
cd apps/backend && npm run dev
```

### Problema: "Certificado inválido"

```bash
# Verificar validade
openssl pkcs12 -in cert.pfx -text -noout -passin pass:{senha}

# Se expirado, renovar com certificadora e atualizar .env
NFSE_CERT_PFX_BASE64=<novo-base64>
NFSE_CERT_PFX_PASS=<nova-senha>

# Reiniciar backend
npm run dev
```

### Problema: "XML inválido segundo o XSD"

```bash
# Usar endpoint de validação para detalhes
curl -X POST http://localhost:3333/nfse/test-sim \
  -H "Content-Type: application/json" \
  -d '{"dpsXml": "..."}'

# Comparar XML com exemplos no manual
cat "Guia EmissorPúblicoNacionalWEB_SNNFSe-ERN - v1.2.txt"
```

### Problema: "Timeout na API Nacional"

```bash
# Aumentar timeout em .env
NFSE_HTTP_TIMEOUT=60000

# Testar conectividade
telnet adn.producaorestrita.nfse.gov.br 443

# Verificar status da API
# https://www.nfse.gov.br (status page)
```

Veja mais em: [TESTING_GUIDE.md](./TESTING_GUIDE.md#troubleshooting)

---

## 📦 Estrutura do Projeto

```
guiasMEI/
├── apps/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── nfse/
│   │   │   │   ├── controllers/
│   │   │   │   │   └── nfse.controller.ts     # Endpoints
│   │   │   │   ├── services/
│   │   │   │   │   └── nfse.service.ts        # Lógica principal
│   │   │   │   ├── repositories/
│   │   │   │   │   ├── nfse-emissions.repo.ts # BD
│   │   │   │   │   └── credentials.repo.ts    # Certificados
│   │   │   │   ├── crypto/
│   │   │   │   │   ├── xml-signer.ts          # Assinatura
│   │   │   │   │   └── pfx-utils.ts           # Conversão PFX
│   │   │   │   ├── utils/
│   │   │   │   │   ├── xml-utils.ts           # Limpeza/Validação
│   │   │   │   │   └── certificate-checker.ts # Validação cert
│   │   │   │   ├── workers/
│   │   │   │   │   └── status-poller.ts       # Worker de polling
│   │   │   │   ├── xsd/
│   │   │   │   │   └── DPS_v1.00.xsd          # Schema XSD
│   │   │   │   └── adapters/
│   │   │   │       └── adn-client.ts          # Cliente API
│   │   │   ├── services/
│   │   │   │   └── nfse-metrics.service.ts    # Métricas
│   │   │   └── utils/
│   │   │       └── logger.ts                  # Logging
│   │   ├── .env                               # Config
│   │   ├── .env.example                       # Template
│   │   └── tsconfig.json
│   └── web/
│       ├── src/
│       │   ├── features/
│       │   │   └── nfse/                      # Componentes NFSe
│       │   └── pages/
│       │       ├── EmitirNotaPage.jsx          # Emissão
│       │       ├── ConsultarNotaPage.jsx       # Consulta
│       │       └── AdminPage.jsx               # Dashboard admin
│       └── vite.config.ts
├── docs/
│   └── checklist-ultimos-testes-nfse.md
├── supabase/
│   ├── migrations/
│   │   └── *_nfse*.sql                        # Tabelas NFSe
│   └── functions/
├── .env.documentation                          # Documentação .env
├── TESTING_GUIDE.md                            # Guia de testes
├── test_nfse_polling_and_pdf.mjs               # Testes Node.js
├── test_nfse_polling_and_pdf.py                # Testes Python
└── README.md                                   # Este arquivo
```

---

## 📋 Checklist de Deploy

### Pré-produção

- [ ] Certificado digital obtido e validado
- [ ] NFSE_CERT_PFX_BASE64 e NFSE_CERT_PFX_PASS configurados
- [ ] Supabase configurado com tabelas NFSe
- [ ] Testes locais passando (100%)
- [ ] Testes em homologação concluídos
- [ ] Logs estruturados validados
- [ ] Alertas de certificado configurados
- [ ] Rate limiting configurado
- [ ] Backup de certificados implementado

### Produção

- [ ] NFSE_ENVIRONMENT=production em .env
- [ ] NFSE_API_URL apontando para produção
- [ ] SSL/TLS verificado
- [ ] Monitoramento ativo
- [ ] Equipe de suporte treinada
- [ ] Plano de contingência implementado
- [ ] Documentação atualizada

---

## 🤝 Contribuindo

1. Criar branch: `git checkout -b feature/sua-feature`
2. Commit: `git commit -m "Descrição"`
3. Push: `git push origin feature/sua-feature`
4. Pull Request

---

## 📞 Suporte

- 📧 Email: `carlos@guiasmei.com.br`
- 💬 Discord: `[link-servidor]`
- 📱 WhatsApp: `+55 48 9 9111-7268`
- 🐛 Issues: `https://github.com/gesielr/guiasMEI/issues`

---

## 📄 Licença

MIT License - veja [LICENSE](./LICENSE) para detalhes.

---

## 🔗 Links Úteis

- [API Nacional NFSe](https://www.nfse.gov.br)
- [Manual Oficial](./Guia%20EmissorPúblicoNacionalWEB_SNNFSe-ERN%20-%20v1.2.txt)
- [XSD Schema](./apps/backend/src/nfse/xsd/DPS_v1.00.xsd)
- [Documentação .env](./.env.documentation)
- [Guia de Testes](./TESTING_GUIDE.md)

---

**Versão:** 1.0.0  
**Última atualização:** 2025-10-29  
**Status:** ✅ Produção
