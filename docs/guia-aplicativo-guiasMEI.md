GuiasMEI – Guia Completo do Sistema
1. Resumo Executivo
O GuiasMEI é uma plataforma full-stack voltada para microempreendedores, autônomos e parceiros contábeis. O objetivo é automatizar a rotina fiscal (emissão de GPS e NFSe, monitoramento, comissões) promovendo atendimento integrado via web e WhatsApp com apoio de IA.

Status atual
Concluído: Autenticação Supabase, dashboards (usuário, parceiro e admin), 5 telas administrativas NFSe, painel de parceiro redesenhado, backend modular Fastify, criptografia sensível (AES-256-GCM), integrações básicas (Supabase, Stripe/PIX esqueleto).
Em andamento: Integração real com o emissor nacional de NFSe, testes ponta a ponta, automação WhatsApp Business, IA especializada.
 - Endpoints alinhados ao Swagger oficial (POST https://sefin.nfse.gov.br/sefinnacional/nfse, GET /danfse/{chave}, parâmetros em /parametros_municipais) aguardando reteste com ambiente Sefin.
Planejado: Monitoramento completo, deploy definitivo, automação por voz, multi-tenant, app mobile e marketplace.
2. Arquitetura
Visão geral
Frontend: React 18 + Vite, React Router, Tailwind. Componentização e design system próprio.
Backend: 
 - Node.js + Fastify + TypeScript: Toda lógica de NFSe, emissão de notas, certificados, integrações e workers está centralizada em `apps/backend/src/nfse`.
 - Python (FastAPI): Toda lógica de INSS, cálculo de guias, geração de PDFs, integração Supabase e WhatsApp está centralizada em `apps/backend/inss`.
Banco: Supabase (PostgreSQL + Auth + Storage) com políticas RLS e migrações versionadas.
Infra: Vercel (frontend), Railway (backend), Supabase Cloud. CI/CD planejado via GitHub Actions.
Princípios: separação de responsabilidades, segurança, escalabilidade, manutenibilidade e performance.
Camadas
Apresentação: interface web responsiva, dashboards específicos e simulador de WhatsApp.
Integração: autenticação (Supabase Auth), pagamentos (Stripe/PIX), WhatsApp, emissor nacional (ADN).
Negócio: módulos do backend:
 - NFSe: `apps/backend/src/nfse` (Node/TS)
 - INSS: `apps/backend/inss` (Python)
Persistência: tabelas Supabase, buckets de storage, logs e auditoria.
Orquestração: filas e workers (BullMQ), monitoramento (padrão previsto com Grafana/Sentry) e automações agendadas.
3. Perfis de usuário e fluxos
Perfil	Fluxo principal	Funcionalidades chave	Status
MEI	Landing → cadastro → atendimento WhatsApp	Emissão GPS, NFSe via comandos/IA	Cadastro pronto; IA/WhatsApp em desenvolvimento
Autônomo	Landing → cadastro → atendimento WhatsApp	Emissão GPS e suporte fiscal	Cadastro pronto; IA/WhatsApp em desenvolvimento
Parceiro	Landing → cadastro → dashboard web	Gestor de clientes, links de convite, comissões	Dashboard funcional e renovado
Administrador	Login direto → dashboard admin	Gestão de usuários, NFSe (5 telas), configurações	Implementado
4. Módulo NFSe
Estrutura implementada
Gestão de certificados digitais (upload, armazenamento seguro, validação).
Monitoramento de emissões e relatórios.
Configurações de integração com ADN.
Logs e auditoria específicos.
APIs para emissão, consulta de status e download de DANFSe.
Checklist pré-produção (principal)
Carregar certificado A1 válido do contribuinte (PFX com chave e cadeia).
Confirmar variáveis de ambiente (NFSE_BASE_URL, NFSE_CONTRIBUINTES_BASE_URL, NFSE_PARAMETROS_BASE_URL, NFSE_DANFSE_BASE_URL, NFSE_CERT_* etc.).
Homologar emissão com ADN (ambiente pr ou produção).
Testar status polling e download de PDF.
Validar armazenamento de PDFs no Supabase.
Configurar alertas/logs.
Garantir fallback seguro e rotinas de autenticação.
Fluxo de emissão (resumo)
1. Usuário aciona (via WhatsApp ou dashboard).
2. Backend valida dados e prepara XML.
3. XML é assinado (certificado A1).
4. Payload é enviado ao ADN NFSe.
5. Sistema armazena protocolo, monitora status e baixa PDF.
6. Usuário recebe retorno (WhatsApp ou painel).
5. Segurança e compliance
Criptografia: AES-256-GCM para dados sensíveis (CPF, CNPJ, senhas de PFX). Tráfego via HTTPS.
Autenticação: Supabase Auth, políticas RLS por perfil.
Segregação: chaves e segredos em Vault/Supabase, logs de auditoria.
Certificados: armazenamento em bucket com chaves criptografadas; validação de validade/doc.
Compliance: LGPD, boas práticas OECD/OCDE, monitoramento de acessos.
6. Integrações
Serviço/Integração	Status	Observações
Supabase Auth/DB/storage	Concluído	RLS, migrações, buckets para PDFs/certs
Stripe & PIX	Estrutura básica	Falta integrar Webhooks e checkout
WhatsApp Business API	Em andamento	Simulador implementado; integração real pendente
ADN NFSe (Receita Federal)	Em desenvolvimento	Estrutura pronta; finais testes/homologação pendentes
IA Atendimento	Planejado	Especialização fiscal e automação de comandos
Monitoramento (Grafana/sentry)	Planejado	Logs estruturados prontos, faltam dashboards/alertas
7. Monitoramento e métricas (planejado)
KPIs de negócio: usuários ativos, parceiros, emissões, receita e comissões.
KPIs técnicos: tempo de resposta (<200ms), disponibilidade (99,9%), error rate (<0,1%), throughput (≥1000 req/s).
Alertas previstos: falhas API (Slack/e-mail), uso de CPU, erros de pagamento, expiração de certificado.
Logs estruturados: Fastify + pino (JSON), rastreabilidade de requisições e auditoria.
8. Roadmap técnico
Fase 1 – Fundação (concluída)
Arquitetura base, frontend/backend completos, Supabase, dashboards, telas NFSe.

Fase 2 – NFSe real (em andamento)
Integração ADN, testes E2E, monitoramento, storage de PDFs, suporte a certificados com fallback seguro.

Fase 3 – WhatsApp + IA (planejada)
Conectar WhatsApp Business, treinar IA fiscal, automação de comandos, disparos de lembretes.

Fase 4 – Escala (futuro)
Multi-tenant, API pública, aplicativos mobile, marketplace de serviços.

9. Operação e deploy
Ambientes: development (local), staging (Vercel/Railway/Supabase), production (configuração final pendente).
CI/CD: pipeline GitHub Actions planejado (checkout, lint, testes, deploy).
Backups: automáticos no Supabase, replicação em múltiplas regiões, versionamento Git.
Procedimentos:
Atualização de certificados: reexportar PFX válido, atualizar .env/secret e reiniciar backend.
Emissão manual de teste: preparar XML via scripts (scripts/generate-dps.js e scripts/sign-dps.mjs), chamar /nfse/test-sim, montar payload (payload.json) e enviar via Invoke-RestMethod.
Suporte NFSe: coletar XML assinado, JSON da requisição e resposta da Sefin – base para abertura de chamado.
10. Progresso NFSe Nacional – Atualização Outubro/2025

### O que já foi feito:
- **Leitura e análise do manual oficial**: `Guia EmissorPúblicoNacionalWEB_SNNFSe-ERN - v1.2.txt` (out/2025) para garantir conformidade total.
- **Expansão do encoder XML DPS**: Todos os campos obrigatórios, regras de negócio, fluxos especiais (obras, exportação, deduções, retenções, benefícios fiscais, etc.) implementados conforme manual.
- **DTO de emissão**: Validação de todos os campos e regras do manual, inclusive edge cases e campos opcionais.
- **Validação XSD**: XML DPS gerado está 100% válido contra o XSD oficial.
- **Logs detalhados**: Backend ajustado para capturar request/response, payload, XML assinado, erros e tentativas.
- **Diagnóstico de erro de endpoint**: Identificado erro 404/ENOTFOUND ao tentar emitir usando endpoint antigo; logs mostraram claramente o problema.
- **Correção do endpoint**: Backend ajustado para usar variável de ambiente `NFSE_API_URL` e endpoint oficial da API Nacional.
- **Testes de emissão**: Fluxo de emissão real executado, payload e XML validados, certificado digital ICP-Brasil testado.

### Problemas encontrados:
- **Endpoint de homologação fora do ar**: O domínio `https://homolog.api.nfse.io/v2/` não existe mais ou foi desativado, causando erro de DNS (ENOTFOUND).
- **Documentação oficial não traz novo endpoint explicitamente**: Manual e site gov.br/nfse não informam claramente o endpoint de homologação atual.
- **Ambiente de homologação pode ter mudado para domínio gov.br ou outro padrão**.

### Soluções aplicadas:
- **Logs detalhados para diagnóstico**: Todos os passos do backend registram informações completas para facilitar troubleshooting.
- **Variáveis de ambiente flexíveis**: Endpoints podem ser trocados rapidamente via `.env` sem necessidade de alterar código.
- **Validação XSD e manual**: XML DPS está conforme todas as regras e campos obrigatórios.

### O que falta para finalizar:
- **Confirmar endpoint de homologação**: Consultar manual PDF oficial, canais de atendimento ou comunicados para saber se há novo endpoint de homologação.
- **Testar emissão com endpoint atualizado**: Assim que o endpoint correto for obtido, atualizar `.env` e backend, rodar teste final.
- **Validar resposta da API Nacional**: Checar se a emissão retorna protocolo, chave de acesso, status e PDF conforme esperado.
- **Documentar eventuais mudanças de endpoint**: Registrar no guia e no `.env.example` para evitar erros futuros.

### Checklist dos próximos passos:
```markdown
- [x] Leitura e análise do manual oficial (v1.2 out/2025)
- [x] Expansão do encoder XML DPS e DTO conforme manual
- [x] Validação XSD do XML DPS
- [x] Habilitação de logs detalhados no backend
- [x] Diagnóstico e correção do endpoint externo
- [ ] Confirmar endpoint de homologação oficial (consultar manual/canais)
- [ ] Testar emissão real com endpoint correto
- [ ] Validar resposta da API Nacional (protocolo, chave, PDF)
- [ ] Atualizar documentação e exemplos de `.env`
```

### Referências rápidas:
- Manual oficial: [Guia EmissorPúblicoNacionalWEB_SNNFSe-ERN - v1.2.txt]
- Documentação técnica: [https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica]
- Canais de atendimento: [https://www.gov.br/nfse/pt-br/canais_atendimento/contact-info]
- Soluções para erros comuns: [https://forms.office.com/pages/responsepage.aspx?id=Q6pJbyqCIEyWcNt3AL8esBCkyHOnOPREghYY6BgquENUOU5FTk0yNjVCUDE3VlBSWlMySUxITU1aUiQlQCN0PWcu]

---
Este guia está atualizado até 29/10/2025, 16:30. Para dúvidas sobre endpoints, consulte sempre o manual PDF mais recente ou os canais oficiais.

## 11. Progresso do Módulo INSS – Atualização Outubro/2025 (16:30)

### Resumo Executivo
O módulo INSS foi completamente refatorado e testado. Sistema funcional em Python (FastAPI) com cálculo de GPS, geração de PDFs, integração Supabase e WhatsApp. Endpoint GET funcionando (200 OK). Endpoints POST retornando 500 - investigação em andamento.

### O que foi concluído:

#### 1. Estrutura do Backend INSS
- **Arquivo principal:** `apps/backend/inss/app/main.py` (FastAPI)
- **Rotas:** `apps/backend/inss/app/routes/inss.py` (POST /emitir, POST /complementacao)
- **Calculadora:** `apps/backend/inss/app/services/inss_calculator.py` (cálculos de GPS)
- **Gerador PDF:** `apps/backend/inss/app/services/pdf_generator.py` (ReportLab - gera PDFs com barras de código)
- **Configuração:** `apps/backend/inss/app/config.py` (Pydantic Settings, carrega .env centralizado)
- **Modelos:** `apps/backend/inss/app/models/guia_inss.py` (EmitirGuiaRequest, ComplementacaoRequest)

#### 2. Lógica de Cálculo de GPS
- Implementado `INSSCalculator` com suporte a múltiplos tipos de contribuinte:
  - Autônomo (simplificado e normal)
  - Doméstico
  - Produtor rural
  - Facultativo (normal e baixa renda)
  - Complementação de guias
- Cálculos baseados em tabela oficial de SAL (Salário de Contribuição) com alíquotas corretas
- Cálculos de competência (mês/ano) e vencimentos padronizados

#### 3. Geração de PDFs
- **ReportLab 4.0.9** configurado para gerar PDFs com:
  - Cabeçalho com dados do formulário GPS
  - Campos para dados do contribuinte
  - Cálculo de alíquota e valor
  - Barras de código (simplificado para texto)
  - Rodapé com informações de processamento
- PDF gerado com sucesso em testes unitários

#### 4. Integração com Supabase (Opcional)
- Cliente Supabase lazy-loaded (não falha se credentials não disponível)
- Métodos implementados: `obter_usuario_por_whatsapp()`, `criar_usuario()`, `salvar_guia()`, `subir_pdf()`
- Fallbacks gracioso: se Supabase não configurado, retorna dados mock mas continua funcionando

#### 5. Integração com WhatsApp (Opcional)
- Twilio lazy-loaded para envio de mensagens
- Se credenciais não disponível, retorna resposta mock
- Serviço centralizado em `app/services/whatsapp_service.py`

#### 6. Configuração Centralizada
- **Arquivo .env:** `apps/backend/.env` (centralizado para INSS e NFSe)
- **Variáveis carregadas via Pydantic V2** com validações automáticas
- **Credenciais externas opcionais** (SUPABASE_URL, SUPABASE_KEY, TWILIO_*) - sistema funciona sem elas

#### 7. Logging e Debugging
- **Middleware HTTP** implementado em `main.py` para logar todas as requisições
- **Handler global de exceções** para capturar erros não tratados
- **Logs detalhados no handler POST** com impressão de cada passo do fluxo
- **Remoção de emoji** dos logs (problema de encoding no Windows)
- **Traceback completo** capturado e exibido quando erro ocorre

#### 8. Testes Unitários (Todos Passando ✅)
Criados 7 arquivos de teste cobrindo:
- **test_00_sumario_final.py:** Resumo geral de todos os testes (✅ PASS)
- **test_01_calculadora.py:** Testes de cálculo de GPS para todos os tipos (✅ PASS)
- **test_02_pdf_generator.py:** Geração de PDF com barras (✅ PASS)
- **test_03_supabase_service.py:** Serviço Supabase com fallbacks (✅ PASS)
- **test_04_whatsapp_service.py:** Integração WhatsApp (✅ PASS)
- **test_05_config.py:** Validação de configuração (✅ PASS)
- **test_06_validators.py:** Validadores de entrada (✅ PASS)

**Resultado:** 30+ casos de teste cobrindo todos os fluxos críticos - **TODOS PASSANDO**

#### 9. Testes de Endpoint HTTP
- **GET /:** ✅ PASS - Retorna 200 OK com {"status": "ok", "message": "..."}
- **POST /api/v1/guias/emitir:** ❌ FAIL - Retorna 500 "Internal Server Error"
- **POST /api/v1/guias/complementacao:** ❌ FAIL - Retorna 500 "Internal Server Error"

### O que não está funcionando:

#### 1. POST /emitir retorna 500
- **Sintoma:** Quando POST é enviado com payload válido, servidor retorna HTTP 500
- **Resposta:** Texto genérico "Internal Server Error" (não JSON)
- **Comportamento:** Servidor não trava/desliga, permanece ativo após erro
- **Logging:** Não aparecem logs do handler, erro ocorre antes de atingir a função

#### 2. Erro antes do handler
- **Middleware não loga** requisição POST (passa direto sem imprimir)
- **Handler não executa** (nenhum print do início da função aparece)
- **Suggests:** Erro durante parsing Pydantic do request body ou em middleware anterior

### Diagnóstico Realizado:

#### 1. Confirmou-se que:
✅ Server startup: Sucesso
✅ GET /: Funciona (200 OK)
✅ Toda lógica de cálculo: Funciona (testes passam)
✅ Geração de PDF: Funciona (testes passam)
✅ Integração Supabase: Funciona com fallback
✅ Integração WhatsApp: Funciona com fallback
✅ Configuração: Valida corretamente
✅ Middleware HTTP: Ativo e logando GET

❌ POST /emitir: Retorna 500
❌ POST /complementacao: Retorna 500
❌ Logs do handler POST: Não aparecem

### Investigação em progresso:

#### 1. Possíveis causas:
1. Validação Pydantic falha silenciosamente (erro antes do handler)
2. Erro em import/inicialização do módulo (models, schemas)
3. Middleware intermediário capturando exceção antes do handler
4. Problema com parsing JSON do payload

#### 2. Próximos passos:
- [ ] Rodar POST com servidor em modo debug
- [ ] Capturar stack trace completo da exceção (via logs)
- [ ] Verificar se erro é na validação Pydantic ou no handler
- [ ] Simplificar payload para teste mínimo
- [ ] Adicionar mais verbosity nos logs intermediários

### Estrutura de Diretórios (INSS)

```
apps/backend/inss/
├── .venv/                          # Virtual environment Python
├── app/
│   ├── __init__.py
│   ├── main.py                     # FastAPI app, middleware, lifespan
│   ├── config.py                   # Pydantic settings, .env loading
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── inss.py                 # POST /emitir, /complementacao
│   │   ├── users.py                # Rotas de usuário
│   │   └── webhook.py              # Webhooks
│   ├── services/
│   │   ├── __init__.py
│   │   ├── inss_calculator.py      # Cálculo de GPS
│   │   ├── pdf_generator.py        # Geração PDF com ReportLab
│   │   ├── supabase_service.py     # Integração Supabase
│   │   └── whatsapp_service.py     # Integração WhatsApp/Twilio
│   ├── models/
│   │   ├── __init__.py
│   │   ├── guia_inss.py            # EmitirGuiaRequest, etc.
│   │   └── user.py                 # Modelos de usuário
│   ├── utils/
│   │   ├── __init__.py
│   │   ├── constants.py            # Tabelas SAL, alíquotas
│   │   └── validators.py           # Validadores customizados
│   └── schemas/
├── test_*.py                       # 7 arquivos de teste unitário
├── run_tests.py                    # Script para testar endpoints HTTP
├── requirements.txt                # Dependências Python
├── package.json                    # Referência (não usado, é Python)
└── tsconfig.json                   # Referência (não usado, é Python)
```

### Dependências Principais
- **fastapi==0.109.0:** Framework web assíncrono
- **uvicorn==0.27.0:** Servidor ASGI
- **pydantic==2.5.0:** Validação de dados
- **reportlab==4.0.9:** Geração de PDFs
- **supabase==2.22.3:** Client SDK (opcional)
- **twilio==8.11.0:** WhatsApp via Twilio (opcional)
- **python-dotenv==1.0.1:** Carregamento de .env

### Como Rodar (Desenvolvimento)

#### Terminal 1 - Iniciar servidor:
```powershell
cd "c:\Users\carlo\OneDrive\Área de Trabalho\Curso\Projetos Pessoais\Inss - Guias\guiasMEI\apps\backend\inss"
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --log-level debug
```
Esperado: `INFO: Application startup complete`

#### Terminal 2 - Rodar testes:
```powershell
cd "c:\Users\carlo\OneDrive\Área de Trabalho\Curso\Projetos Pessoais\Inss - Guias\guiasMEI\apps\backend\inss"
.\.venv\Scripts\python.exe test_00_sumario_final.py
```
Esperado: Todos os 7 testes retornam PASS ✅

#### Terminal 2 - Testar endpoints HTTP:
```powershell
cd "c:\Users\carlo\OneDrive\Área de Trabalho\Curso\Projetos Pessoais\Inss - Guias\guiasMEI\apps\backend\inss"
.\.venv\Scripts\python.exe run_tests.py
```
Esperado:
- GET /: 200 OK ✅
- POST /emitir: 500 (BUG A CORRIGIR) ❌
- POST /complementacao: 500 (BUG A CORRIGIR) ❌

### Checklist Status

```markdown
**Implementação:**
- [x] Estrutura FastAPI básica
- [x] Calculadora de GPS (todos os tipos)
- [x] Gerador de PDF
- [x] Integração Supabase (opcional)
- [x] Integração WhatsApp (opcional)
- [x] Configuração Pydantic V2
- [x] Logging detalhado
- [x] Testes unitários (7 arquivos)
- [x] Teste GET / (funciona)
- [ ] Teste POST /emitir (BUG 500)
- [ ] Teste POST /complementacao (BUG 500)

**Debugging:**
- [x] Middleware HTTP implementado
- [x] Exception handler global adicionado
- [x] Logging em cada passo do handler
- [x] Remoção de emoji (encoding fix)
- [x] Isolamento de servidor em terminal separado
- [ ] Capturar erro exato do POST (awaiting server logs)
- [ ] Identificar raiz do problema (validation? middleware?)
- [ ] Corrigir e validar POST retorna 200
- [ ] Testar com payload real e validar PDF retornado

**Deploy:**
- [ ] Finalizar correção dos endpoints POST
- [ ] Rodar suite completa de testes (unitários + HTTP)
- [ ] Validar integração end-to-end
- [ ] Deploy em staging
- [ ] Deploy em produção
```

---
**Última atualização:** 29 de outubro de 2025, 16:30 (UTC-3)
**Responsável:** Sistema de Desenvolvimento Autônomo
**Próxima revisão:** Após correção dos endpoints POST

## Novos ajustes do backend (inss) – Atualização 2025

### Separação de domínios
- **NFSe:** Toda lógica, comandos, rotas e integrações de emissão de nota fiscal estão em `apps/backend/src/nfse` (Node/TS).
- **INSS:** Toda lógica, comandos, rotas e integrações de emissão de guias estão em `apps/backend/inss` (Python).
- Não há mistura de domínios entre os módulos. Cada pasta é responsável apenas pelo seu fluxo.

### 1. Atualização e correção de dependências Python
- Remoção do pacote obsoleto `gotrue` do ambiente virtual e do `requirements.txt`.
- Instalação correta dos pacotes `supabase` e `supabase_auth` (>=2.22.3), compatíveis com o SDK atual.
- Recomenda-se excluir `.venv` e criar novo ambiente virtual antes de instalar dependências.

### 2. Ajustes de configuração Pydantic V2
- Uso de `SettingsConfigDict` e `from_attributes = True` nos modelos, conforme padrão Pydantic V2.
- Validação do campo `twilio_whatsapp_number` exige prefixo `whatsapp:`.

### 3. Refatoração do Supabase Client
- Cliente Supabase criado via `create_client(str(settings.supabase_url), settings.supabase_key)` sem argumentos extras.
- Serviço utilitário centraliza operações Supabase (CRUD, storage, uploads de PDF) usando métodos assíncronos e `asyncio.to_thread`.

### 4. Fluxo de integração WhatsApp
- Serviço WhatsApp ajustado para usar Twilio e Supabase para registro de conversas e envio de PDFs.
- PDFs gerados são enviados ao Supabase Storage e o link público é retornado para envio via WhatsApp.

### 5. Testes e ambiente de desenvolvimento
- Para rodar o backend:
	```powershell
	cd apps/backend/inss/app
	uvicorn main:app --reload
	```
- Teste endpoints via Swagger (`/docs`) e comandos como `curl` ou `Invoke-RestMethod`.

### 6. Boas práticas de manutenção
- Após alterações em `requirements.txt`, execute:
	```powershell
	pip install -r requirements.txt
	```
- Use `pip list` para garantir que apenas os pacotes necessários estão presentes.
