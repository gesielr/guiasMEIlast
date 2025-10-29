# 🗺️ MAPA MENTAL - Sistema NFSe GuiasMEI

## 📍 VISÃO GERAL DO PROJETO

```
                     SISTEMA NFSE GUIASMEI
                              │
                ┌─────────────┼─────────────┐
                │             │             │
            BACKEND       FRONTEND       SUPABASE
            (Fastify)    (React/Vite)    (Storage)
                │             │             │
                └─────────────┴─────────────┘
                              │
                      API NACIONAL
                     (Sefin/Gov.br)
```

---

## 📋 FLUXO PRINCIPAL

```
USUÁRIO
  │
  ├─→ Acessa Web (React)
  │
  ├─→ Clica "Emitir NFS-e"
  │
  ├─→ Backend recebe POST /nfse
  │   ├─ Valida certificado
  │   ├─ Limpa XML
  │   ├─ Valida XSD
  │   ├─ Assina (RSA-SHA256)
  │   ├─ Comprime (GZIP)
  │   └─ Envia p/ API (com retry)
  │
  ├─→ Recebe protocolo
  │   └─ Inicia polling
  │
  ├─→ GET /nfse/{protocolo}
  │   └─ Loop até AUTORIZADA (max 30x)
  │
  ├─→ GET /nfse/{chaveAcesso}/pdf
  │   └─ Baixa PDF quando autorizado
  │
  ├─→ Persiste em Supabase Storage
  │
  └─→ Usuario notificado
      ├─ Email
      ├─ WhatsApp
      └─ Dashboard atualizado
```

---

## 🏗️ ARQUITETURA EM CAMADAS

```
┌─────────────────────────────────────────┐
│         FRONTEND (React/Vite)           │
│  ├─ EmitirNotaPage                      │
│  ├─ ConsultarNotaPage                   │
│  └─ Dashboard Admin                     │
└──────────────────┬──────────────────────┘
                   │
                   ↓ HTTP/REST
┌─────────────────────────────────────────┐
│       API (Fastify/Node.js)             │
│  ├─ nfse-controller.ts                  │
│  │  └─ POST /nfse, GET /nfse/...        │
│  └─ Router                              │
└──────────────────┬──────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────┐
│     CAMADA DE SERVIÇO                   │
│  ├─ NfseService                         │
│  │  ├─ emit() com retry                 │
│  │  ├─ pollStatus()                     │
│  │  └─ downloadDanfe()                  │
│  ├─ NfseMetricsService                  │
│  └─ StatusPollerWorker                  │
└──────────────────┬──────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────┐
│  CAMADA DE REPOSITÓRIO                  │
│  ├─ NfseEmissionsRepository             │
│  │  ├─ saveEmission()                   │
│  │  ├─ updateEmissionStatus()           │
│  │  └─ attachPdf()                      │
│  └─ CredentialsRepository               │
└──────────────────┬──────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────┐
│     BANCO DE DADOS (Supabase)           │
│  ├─ Tabelas NFSe                        │
│  ├─ PDF Storage (bucket)                │
│  └─ Credenciais (encrypted)             │
└─────────────────────────────────────────┘
```

---

## 🧪 ESTRATÉGIA DE TESTES

```
                    TESTES
                      │
        ┌─────────────┼─────────────┐
        │             │             │
      NODE.JS      PYTHON       POWERSHELL
   (400 linhas)   (300 linhas)  (150 linhas)
        │             │             │
        ├─────────────┼─────────────┤
        │
        ↓
    5 CATEGORIAS:
    1. Emissão (POST /nfse)
    2. Polling (GET /nfse/{protocolo})
    3. PDF (GET /nfse/{chaveAcesso}/pdf)
    4. Erros (4 cenários)
    5. Métricas (GET /nfse/metrics)
```

---

## 📁 ESTRUTURA DE ARQUIVOS CRIADOS

```
RAIZ/
│
├─ 📄 DOCUMENTAÇÃO
│  ├─ INDEX.md                       ← Comece aqui!
│  ├─ README_NFSE.md                ← Visão geral
│  ├─ SOLUCAO_COMPLETA.md           ← O que foi feito
│  ├─ TESTING_GUIDE.md              ← Testes técnicos
│  ├─ QUICK_REFERENCE.md            ← Consulta rápida (IMPRIMA!)
│  ├─ .env.documentation            ← Configuração
│  ├─ CHECKLIST_IMPLEMENTACAO.md    ← Status
│  ├─ MANIFESTO_ENTREGAS.md         ← Manifesto oficial
│  ├─ STATUS_FINAL.md               ← Status final
│  ├─ RELATORIO_EXECUTIVO.md        ← Relatório formal
│  └─ MAPA_MENTAL.md                ← Este arquivo
│
├─ 🧪 TESTES
│  ├─ test_nfse_polling_and_pdf.mjs  ← Node.js (axios)
│  ├─ test_nfse_polling_and_pdf.py   ← Python (requests)
│  └─ run-tests.ps1                  ← Script automático
│
└─ 📁 apps/backend/
   └─ src/nfse/
      ├─ services/nfse.service.ts    ← Lógica principal ✅
      ├─ controllers/nfse-controller.ts ← Endpoints ✅
      ├─ repositories/              ← Dados ✅
      ├─ workers/status-poller.ts   ← Background job ✅
      └─ xsd/DPS_v1.00.xsd          ← Validação ✅
```

---

## 🔄 CICLO DE VIDA DA EMISSÃO

```
ESTADO 1: AGUARDANDO_PROCESSAMENTO
    │
    ├─→ API Nacional processando
    │   ├─ Valida certificado
    │   ├─ Valida XML
    │   └─ Gera chaveAcesso
    │
    ↓
ESTADO 2: AUTORIZADA
    │
    ├─→ NFS-e emitida
    │   ├─ PDF gerado
    │   └─ Pronta para uso
    │
    ↓ (opcional)
ESTADO 3: CANCELADA
    │
    ├─→ Usuario cancelou
    │   └─ Data de cancelamento registrada

OUTROS ESTADOS:
├─ REJEITADA (validação falhou)
└─ SUBSTITUÍDA (substituída por outra)
```

---

## 🔄 STRATEGY DE RETRY

```
TENTATIVA 1
    │
    ├─ Falha? (5xx, timeout)
    │
    ↓
AGUARDA 1 SEGUNDO
    │
    ↓
TENTATIVA 2
    │
    ├─ Falha? (5xx, timeout)
    │
    ↓
AGUARDA 2 SEGUNDOS
    │
    ↓
TENTATIVA 3
    │
    ├─ Falha? (5xx, timeout)
    │
    ↓
AGUARDA 4 SEGUNDOS
    │
    ↓
FINAL: Sucesso ou falha definitiva
```

---

## 📊 MAPA DE ERROS

```
ERRO HTTP
    │
    ├─ 400 Bad Request
    │  └─ Causa: XML inválido
    │  └─ Retry: NÃO
    │
    ├─ 401 Unauthorized
    │  └─ Causa: Certificado inválido
    │  └─ Retry: NÃO
    │
    ├─ 422 Unprocessable Entity
    │  └─ Causa: Dados inválidos
    │  └─ Retry: NÃO
    │
    ├─ 429 Too Many Requests
    │  └─ Causa: Rate limit
    │  └─ Retry: SIM (backoff)
    │
    ├─ 500 Internal Server Error
    │  └─ Causa: Erro servidor
    │  └─ Retry: SIM
    │
    ├─ 503 Service Unavailable
    │  └─ Causa: API indisponível
    │  └─ Retry: SIM
    │
    └─ Timeout
       └─ Causa: Conexão lenta
       └─ Retry: SIM
```

---

## 📈 MAPA DE MONITORAMENTO

```
MÉTRICAS COLETADAS
    │
    ├─ totalEmissions        ← Total de emissões
    ├─ successCount          ← Sucessos
    ├─ failureCount          ← Falhas
    │
    ├─ successRate           ← Taxa de sucesso (%)
    ├─ avgDuration           ← Duração média
    ├─ p95Duration           ← P95 de duração
    ├─ p99Duration           ← P99 de duração
    │
    ├─ errorsByType          ← Erros por tipo
    │  ├─ INVALID_XML
    │  ├─ CERT_EXPIRED
    │  ├─ NETWORK_ERROR
    │  └─ ...
    │
    └─ certificateDaysUntilExpiry ← Dias até vencimento
       └─ Alerta: < 30 dias
```

---

## 🔐 MAPA DE SEGURANÇA

```
CERTIFICADO DIGITAL
    │
    ├─ Obtenção
    │  ├─ ICP-Brasil
    │  ├─ A1 ou A3
    │  └─ 1 ou 3 anos
    │
    ├─ Armazenamento
    │  ├─ Dev: Base64 em .env
    │  ├─ Prod: Supabase Vault
    │  └─ Backup: Seguro local
    │
    ├─ Validação
    │  ├─ XSD schema
    │  ├─ Assinatura (RSA-SHA256)
    │  └─ Data de validade
    │
    └─ Monitoramento
       ├─ Dias até vencimento
       ├─ Alertas (< 30 dias)
       └─ Renovação proativa
```

---

## 🗂️ MAPA DE DOCUMENTAÇÃO

```
PARA COMEÇAR (5 min)
    ├─ INDEX.md
    └─ QUICK_REFERENCE.md

ENTENDER (20 min)
    ├─ README_NFSE.md
    ├─ SOLUCAO_COMPLETA.md
    └─ STATUS_FINAL.md

CONFIGURAR (20 min)
    ├─ .env.documentation
    └─ README_NFSE.md (instalação)

TESTAR (15 min)
    ├─ TESTING_GUIDE.md
    ├─ run-tests.ps1
    └─ QUICK_REFERENCE.md

TROUBLESHOOT
    ├─ TESTING_GUIDE.md (erros)
    ├─ QUICK_REFERENCE.md (troubleshoot)
    └─ README_NFSE.md (FAQ)

DETALHES
    ├─ CHECKLIST_IMPLEMENTACAO.md
    ├─ MANIFESTO_ENTREGAS.md
    └─ RELATORIO_EXECUTIVO.md
```

---

## ⏱️ MAPA DE TEMPOS

```
ATIVIDADE                 TEMPO
═════════════════════════════════════

Ler índice                2 min
Ler README                10 min
Ler guia de testes        15 min
Configurar .env           20 min
Executar testes           10 min
Revisar resultados        5 min
─────────────────────────────────
Total aprendizado         62 min

Teste manual (cURL)       10 min
Teste em staging          1 hora
Deploy produção           2 horas
```

---

## 🎯 MAPA DE DECISÃO

```
SITUAÇÃO
    │
    ├─ "Quero começar rápido"
    │  ├─ Execute: ./run-tests.ps1
    │  └─ Tempo: 15 min
    │
    ├─ "Quero entender tudo"
    │  ├─ Leia: README + GUIDE
    │  └─ Tempo: 45 min
    │
    ├─ "Preciso configurar"
    │  ├─ Consulte: .env.documentation
    │  └─ Tempo: 20 min
    │
    ├─ "Tem erro, como fix?"
    │  ├─ Consulte: TESTING_GUIDE.md
    │  └─ Tempo: 10 min
    │
    └─ "Quero deploy produção"
       ├─ Leia: README (Deploy seção)
       └─ Tempo: 30 min
```

---

## 📡 MAPA DE ENDPOINTS

```
EMISSÃO
    ├─ POST /nfse
    │  ├─ Input: dpsXml, userId, versao
    │  ├─ Output: protocolo, chaveAcesso
    │  └─ Retry: Sim (3x)

POLLING
    ├─ GET /nfse/{protocolo}
    │  ├─ Output: status, timestamp, chaveAcesso
    │  └─ Loop: Automático (30x max)

PDF
    ├─ GET /nfse/{chaveAcesso}/pdf
    │  ├─ Output: PDF (arraybuffer)
    │  └─ Condição: AUTORIZADA

MÉTRICAS
    ├─ GET /nfse/metrics
    │  └─ Output: Todas as métricas

VALIDAÇÃO
    ├─ POST /nfse/test-sim
    │  ├─ Input: dpsXml
    │  └─ Output: valid, errors
```

---

## 🎨 MAPA DE CORES (Testes)

```
🟢 Verde        → Sucesso
🔴 Vermelho     → Falha
🟡 Amarelo      → Aviso
🔵 Azul         → Informação
⚪ Branco       → Neutro
```

---

## 📱 MAPA DE NOTIFICAÇÕES

```
NFS-e AUTORIZADA
    │
    ├─ 📧 Email
    │  └─ "Sua NFS-e foi emitida!"
    │
    ├─ 💬 WhatsApp
    │  └─ "Clique aqui para acessar"
    │
    ├─ 🔔 Push Notification
    │  └─ Enviada ao usuário
    │
    └─ 📊 Dashboard
       └─ Status atualizado em tempo real
```

---

## 🏆 MAPA DE SUCESSO

```
CRITÉRIOS DE SUCESSO
    │
    ├─ ✅ Todos os 5 testes passam
    ├─ ✅ test_results.json gerado
    ├─ ✅ PDF baixado com sucesso
    ├─ ✅ Logs estruturados
    ├─ ✅ Métricas coletadas
    ├─ ✅ Certificado monitorado
    ├─ ✅ Erros tratados
    └─ ✅ Pronto para produção!
```

---

**Mapa Mental Criado**: 29/10/2025  
**Versão**: 1.0.0  
**Status**: ✅ Completo

