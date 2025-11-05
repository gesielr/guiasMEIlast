# DEBUG: Erro 500 nos Endpoints POST - INSS

**Data:** 29 de outubro de 2025, 16:45 (UTC-3)  
**Status:** 🔴 CRÍTICO - Em investigação  
**Afeta:** Endpoints POST `/api/v1/guias/emitir` e `/api/v1/guias/complementacao`

---

## 📋 Resumo do Problema

Endpoints POST retornam HTTP 500 com mensagem genérica "Internal Server Error", enquanto:
- ✅ GET / funciona perfeitamente (200 OK)
- ✅ Todos os testes unitários passam (30+ casos)
- ✅ Validação de modelos Pydantic funciona fora do servidor
- ✅ Lógica de negócio (cálculos, PDF) funcionam corretamente

---

## 🔍 O Que Já Foi Validado e Funciona

### 1. Modelos Pydantic ✅
```python
# Modelo valida corretamente fora do servidor
payload = {
    "whatsapp": "5511987654321",
    "tipo_contribuinte": "autonomo",
    "valor_base": 1000.0,
    "plano": "normal",
    "competencia": "02/2025"
}

request_obj = EmitirGuiaRequest(**payload)
# ✅ Validação passa
# ✅ model_dump() retorna dados corretamente
```

**Resultado:** Modelo valida sem problemas

### 2. Lógica de Cálculo de GPS ✅
- Teste unitário: `test_01_calculadora.py` - ✅ PASS
- Suporta: Autônomo, Doméstico, Produtor Rural, Facultativo, Complementação
- Todos os tipos calculam corretamente

### 3. Geração de PDF ✅
- Teste unitário: `test_02_pdf_generator.py` - ✅ PASS
- ReportLab 4.0.9 gera PDFs com sucesso
- Barras de código simplificadas para texto (evita erro str+bytes)

### 4. Integração Supabase (com fallback) ✅
- Teste unitário: `test_03_supabase_service.py` - ✅ PASS
- Métodos implementados: `obter_usuario_por_whatsapp()`, `criar_usuario()`, `salvar_guia()`, `subir_pdf()`
- Funciona sem credenciais (retorna mock)

### 5. Integração WhatsApp/Twilio (com fallback) ✅
- Teste unitário: `test_04_whatsapp_service.py` - ✅ PASS
- TwilioClient lazy-loaded
- Funciona sem credenciais (retorna mock)

### 6. Configuração Pydantic V2 ✅
- Teste unitário: `test_05_config.py` - ✅ PASS
- Carrega .env corretamente
- Variáveis externas opcionais

### 7. GET / Endpoint ✅
- Teste HTTP: GET / - ✅ 200 OK
- Middleware HTTP funciona para GET
- Server inicializa corretamente

### 8. Corrigir .dict() → .model_dump() ✅
- Pydantic V2 usa `model_dump()`, não `dict()`
- Correção aplicada nos handlers POST
- Validado que modelo retorna dados com `model_dump()`

---

## ❌ O Que NÃO Funciona

### 1. POST /api/v1/guias/emitir
```
Status Code: 500
Response: "Internal Server Error" (texto genérico)
```

### 2. POST /api/v1/guias/complementacao
```
Status Code: 500
Response: "Internal Server Error" (texto genérico)
```

### 3. Comportamento Estranho do Erro
- **Não aparece no middleware:** Requisição POST não é logada pelo middleware HTTP
- **Não aparece no handler:** Nenhum print do início da função aparece
- **Não aparece no exception handler:** Global exception handler não é acionado
- **Resposta é texto puro:** Não é JSON, é "Internal Server Error" (Starlette default)

---

## 🧪 Testes Realizados

### Terminal 1: Servidor
```powershell
cd "c:\Users\carlo\OneDrive\Área de Trabalho\Curso\Projetos Pessoais\Inss - Guias\guiasMEI\apps\backend\inss"
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --log-level debug
```

**Resultado:**
```
[OK] WhatsAppService inicializado (cliente lazy-loaded)
[DEBUG] Logging configured
[DEBUG] Adding middleware...
INFO:     Started server process [38732]
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

✅ Server inicia corretamente

### Terminal 2: Teste HTTP
```powershell
cd "c:\Users\carlo\OneDrive\Área de Trabalho\Curso\Projetos Pessoais\Inss - Guias\guiasMEI"
.\.venv\Scripts\python.exe test_post_fix.py
```

**Resultado:**
```
✅ PASS - GET /                               (200 OK)
❌ FAIL - POST /api/v1/guias/emitir           (500 Internal Server Error)
❌ FAIL - POST /api/v1/guias/complementacao  (500 Internal Server Error)
```

### Testes Unitários
```powershell
cd "c:\Users\carlo\OneDrive\Área de Trabalho\Curso\Projetos Pessoais\Inss - Guias\guiasMEI\apps\backend\inss"
.\.venv\Scripts\python.exe test_00_sumario_final.py
```

**Resultado:**
```
✅ test_01_calculadora.py - PASS
✅ test_02_pdf_generator.py - PASS
✅ test_03_supabase_service.py - PASS
✅ test_04_whatsapp_service.py - PASS
✅ test_05_config.py - PASS
✅ test_06_validators.py - PASS
✅ test_00_sumario_final.py - PASS

Total: 30+ test cases - TODOS PASSANDO
```

---

## 🎯 Hipóteses sobre o erro

### Hipótese 1: Erro antes do middleware ⚠️
**Sintoma:** Middleware não loga POST  
**Causa possível:** Erro durante inicialização de rota ou parsing de request body  
**Testes necessários:** Ver stack trace completo

### Hipótese 2: Erro na inicialização global de rotas ⚠️
**Sintoma:** Nenhuma função de handler executa  
**Causa possível:** Erro ao incluir router ou configurar rotas  
**Status:** Pouco provável (GET funciona)

### Hipótese 3: Erro silencioso no handler ⚠️
**Sintoma:** Logs não aparecem, resposta é 500  
**Causa possível:** Exception handler não está funcionando  
**Status:** Pouco provável (global exception handler deveria capturar)

### Hipótese 4: Erro assíncrono não capturado ⚠️
**Sintoma:** await em função async falhando silenciosamente  
**Causa possível:** `_obter_ou_criar_usuario()` ou outro await  
**Status:** Possível

---

## 📝 Arquivos Chave

### Servidor FastAPI
- **`app/main.py`** - Aplicação FastAPI, middleware, exception handler global
- **`app/routes/inss.py`** - Endpoints POST /emitir e /complementacao
- **`app/models/guia_inss.py`** - Modelos Pydantic (EmitirGuiaRequest, ComplementacaoRequest)

### Serviços
- **`app/services/inss_calculator.py`** - Cálculo de GPS
- **`app/services/pdf_generator.py`** - Geração de PDF
- **`app/services/supabase_service.py`** - Integração Supabase
- **`app/services/whatsapp_service.py`** - Integração WhatsApp

### Testes
- **`test_post_fix.py`** - Testes HTTP (GET e POST) - RAIZ do projeto
- **`test_00_sumario_final.py`** até **`test_06_validators.py`** - Testes unitários - INSS

---

## 🚀 Próximos Passos

### 1. Capturar Stack Trace Completo
- [ ] Rodar servidor com logging detalhado
- [ ] Enviar POST e capturar erro no console
- [ ] Documentar stack trace completo

### 2. Adicionar Logging em Pontos Críticos
- [ ] Log antes da validação Pydantic
- [ ] Log após validação Pydantic
- [ ] Log no início do handler
- [ ] Log em cada await

### 3. Testar Payload Simplificado
- [ ] Testar com payload mínimo (apenas campos obrigatórios)
- [ ] Testar com payload complexo
- [ ] Testar com valores diferentes

### 4. Investigar Async/Await
- [ ] Verificar se funções async estão executando
- [ ] Verificar se awaits estão sendo aguardados
- [ ] Adicionar logging em `_obter_ou_criar_usuario()`

### 5. Revisar Imports e Inicializações
- [ ] Verificar se todas as importações funcionam
- [ ] Verificar se serviços inicializam sem erro
- [ ] Verificar se dependências estão instaladas

---

## 📊 Checklist de Debugging

```markdown
### Validações Completadas
- [x] Modelo Pydantic valida corretamente
- [x] Lógica de cálculo funciona (testes passam)
- [x] Geração de PDF funciona (testes passam)
- [x] Integração Supabase funciona com fallback (testes passam)
- [x] Integração WhatsApp funciona com fallback (testes passam)
- [x] Configuração Pydantic V2 carrega corretamente (testes passam)
- [x] GET / endpoint funciona (200 OK)
- [x] Middleware HTTP funciona para GET
- [x] Server inicializa sem erro
- [x] Corrigido .dict() → .model_dump()

### Investigações Necessárias
- [ ] Capturar stack trace completo do POST
- [ ] Ver logs do servidor enquanto POST é enviado
- [ ] Verificar se erro é antes ou dentro do handler
- [ ] Testar com ferramentas diferentes (curl, Postman, etc)

### Possíveis Soluções (Para testar)
- [ ] Simplificar handler POST para apenas retornar JSON
- [ ] Remover async/await temporariamente
- [ ] Testar com request body vazio
- [ ] Verificar se há conflito de importações
- [ ] Investigar se há erro circular de imports
```

---

## 💾 Como Usar este Documento em Nova Conversa

1. Copie este arquivo inteiro
2. Ao iniciar nova conversa, cole-o como contexto
3. Diga: "Continuar do erro 500 nos endpoints POST"
4. Refira-se aos testes já validados como ✅
5. Foque na investigação de stack trace e logging

---

## 📞 Referências Rápidas

**Arquivo de teste HTTP:**  
`c:\Users\carlo\OneDrive\Área de Trabalho\Curso\Projetos Pessoais\Inss - Guias\guiasMEI\test_post_fix.py`

**Servidor:**  
`c:\Users\carlo\OneDrive\Área de Trabalho\Curso\Projetos Pessoais\Inss - Guias\guiasMEI\apps\backend\inss\app\main.py`

**Handlers POST:**  
`c:\Users\carlo\OneDrive\Área de Trabalho\Curso\Projetos Pessoais\Inss - Guias\guiasMEI\apps\backend\inss\app\routes\inss.py`

**Modelos:**  
`c:\Users\carlo\OneDrive\Área de Trabalho\Curso\Projetos Pessoais\Inss - Guias\guiasMEI\apps\backend\inss\app\models\guia_inss.py`

---

**Última atualização:** 29 de outubro de 2025, 16:45 (UTC-3)  
**Criado para:** Retomada de conversa com contexto completo  
**Status:** 🔴 Crítico - Aguardando captura de stack trace
