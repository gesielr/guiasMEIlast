# RELATÓRIO TÉCNICO - SISTEMA DE EMISSÃO DE GUIAS INSS

**Data**: 29 de outubro de 2025  
**Localização**: `apps/backend/inss/`  
**Tecnologia**: Python 3.11+ com FastAPI  
**Status de Maturidade**: 7/10 - Pronto para Testes

---

## 1. VISÃO GERAL DO SISTEMA

O sistema INSS é uma aplicação **FastAPI em Python** que permite:
- Emissão de guias GPS (Guia da Previdência Social)
- Cálculo automático de contribuições INSS
- Geração de PDFs com código de barras
- Envio via WhatsApp
- Armazenamento em Supabase

### Arquitetura

```
Frontend (React)
       ↓
API FastAPI (Python)
  ├─ /api/v1/guias/emitir
  ├─ /api/v1/guias/complementacao
  ├─ /api/v1/usuarios/historico
  └─ /webhook/whatsapp
       ↓
Serviços
  ├─ INSSCalculator (cálculos)
  ├─ PDFGenerator (geração de PDF)
  ├─ SupabaseService (BD)
  └─ WhatsAppService (envio)
       ↓
Supabase (PostgreSQL + Storage)
```

---

## 2. COMPONENTES IMPLEMENTADOS

### 2.1 FastAPI Main (`app/main.py`)

**Status**: ✅ PRONTO

```python
✅ Aplicação FastAPI criada
✅ CORS configurado
✅ 3 rotas registradas (inss, users, webhook)
✅ Endpoint raiz "/" funcionando
✅ Lifespan configurado
```

**Endpoints Base**:
- GET `/` - Health check
- POST `/api/v1/guias/emitir` - Emitir guia
- POST `/api/v1/guias/complementacao` - Complementação
- GET `/api/v1/usuarios/{whatsapp}/historico` - Histórico
- POST `/webhook/whatsapp` - Webhook WhatsApp

### 2.2 Calculadora INSS (`app/services/inss_calculator.py`)

**Status**: ✅ PRONTO

**Funcionalidades**:

```python
✅ calcular_contribuinte_individual(valor_base, plano)
   - Tipos: "normal" (20%) e "simplificado" (11%)
   - Validação de teto INSS
   - Retorna código GPS correto

✅ calcular_complementacao(competencias, valor_base)
   - Complementação de 11% → 20%
   - Cálculo de juros SELIC (0,5% a.m.)
   - Suporte a múltiplas competências

✅ calcular_produtor_rural(receita_bruta, segurado_especial)
   - Alíquota: 1,3% (especial) ou 1,5% (normal)
   - Baseado em receita bruta

✅ calcular_domestico(salario)
   - Tabela progressiva (7,5% a 14%)
   - Múltiplas faixas de cálculo
```

**Constantes Configuradas**:
```
✅ Salário mínimo 2025: $1.518,00
✅ Teto INSS 2025: $7.786,02
✅ Códigos GPS por categoria
✅ Tabelas de alíquotas
```

**Testes Existentes**:
- `test_calculo_autonomo_normal()` ✅
- `test_calculo_simplificado()` ✅

### 2.3 Gerador de PDF (`app/services/pdf_generator.py`)

**Status**: ✅ PRONTO

```python
✅ Classe GPSGenerator implementada
✅ Gera PDF da guia GPS
✅ Inclui dados do contribuinte
✅ Código de barras Code128
✅ Retorna bytes (enviável via WhatsApp)
```

**Funcionalidades**:
- Cabeçalho com "GUIA DA PREVIDÊNCIA SOCIAL"
- Campos: Nome, CPF, NIT, Código GPS, Competência, Valor, Vencimento
- Código de barras Code128
- Instrução de pagamento
- Usa ReportLab para gerar PDF

**Dependências**:
- `reportlab` ✅
- `python-barcode` ✅
- `Pillow` ✅

### 2.4 Supabase Service (`app/services/supabase_service.py`)

**Status**: ⚠️ PARCIALMENTE PRONTO

**Métodos Esperados**:
```python
✅ obter_usuario_por_whatsapp(whatsapp)
✅ criar_usuario(dados)
✅ salvar_guia(user_id, guia_data)

Não revisado:
⚠️ Conexão com Supabase
⚠️ Esquema de tabelas
⚠️ Tratamento de erros
```

### 2.5 WhatsApp Service (`app/services/whatsapp_service.py`)

**Status**: ⚠️ PARCIALMENTE PRONTO

**Métodos Esperados**:
```python
✅ enviar_pdf_whatsapp(whatsapp, pdf_bytes, mensagem)

Não revisado:
⚠️ Integração com Twilio
⚠️ Tratamento de erros
⚠️ Retry logic
```

### 2.6 Routes - INSS (`app/routes/inss.py`)

**Status**: ✅ PRONTO

```python
✅ POST /api/v1/guias/emitir
   - Valida WhatsApp
   - Calcula guia por tipo
   - Gera PDF
   - Salva em Supabase
   - Envia via WhatsApp
   - Retorna resposta completa

✅ POST /api/v1/guias/complementacao
   - Similar ao anterior
   - Específico para complementação
   - Calcula juros SELIC

Lógica:
✅ Validação de entrada
✅ Cálculo de guia
✅ Normalizacao de competência
✅ Criação de usuário se não existir
✅ Geração de PDF
✅ Persistência em BD
✅ Envio via WhatsApp
✅ Resposta estruturada
```

### 2.7 Banco de Dados (`supabase_schema.sql`)

**Status**: ✅ PRONTO (arquivo existe)

**Tabelas Esperadas**:
```sql
✅ users
   - id (UUID)
   - whatsapp
   - nome
   - cpf
   - nit
   - tipo_contribuinte

✅ guias
   - id (UUID)
   - user_id (FK)
   - codigo_gps
   - competencia
   - valor
   - status
   - data_vencimento
   - pdf_url
   - created_at

✅ config_inss
   - salario_minimo
   - teto_inss
   - ultima_atualizacao
```

### 2.8 Configuração (`app/config.py`)

**Status**: ✅ PRONTO

**Variáveis Esperadas**:
```python
✅ SUPABASE_URL
✅ SUPABASE_KEY
✅ TWILIO_ACCOUNT_SID
✅ TWILIO_AUTH_TOKEN
✅ TWILIO_WHATSAPP_NUMBER
✅ OPENAI_API_KEY
✅ Salário mínimo 2025
✅ Teto INSS 2025
```

---

## 3. TIPOS DE GUIAS SUPORTADAS

### 3.1 Autônomo Normal (GPS 1007)

```
Tipo: "autonomo"
Plano: "normal"
Alíquota: 20%
Cálculo: max(SM, valor_base) * 0.20

Exemplo:
  valor_base: R$ 2.000,00
  resultado: R$ 400,00
```

### 3.2 Autônomo Simplificado (GPS 1163)

```
Tipo: "autonomo_simplificado"
Alíquota: 11% sobre salário mínimo
Cálculo: SM_2025 * 0.11

Exemplo:
  valor_base: (ignorado)
  resultado: R$ 166,98 (11% de R$1.518)
```

### 3.3 Complementação (GPS 2010)

```
Tipo: "complementacao"
Objetivo: Completar contribuição de 11% para 20%
Cálculo: (valor_base * 9%) + juros_selic

Exemplo:
  valor_base: R$ 1.000,00
  competências: ["01/2024", "02/2024", "03/2024"]
  diferença: R$ 90,00
  juros: R$ X,XX
  resultado: R$ 90,XX + juros
```

### 3.4 Doméstico (GPS 1503)

```
Tipo: "domestico"
Tabela Progressiva:
  - Até R$1.100: 7,5%
  - De R$1.100 a R$2.200: 8,5%
  - De R$2.200 a R$3.300: 9,5%
  - Acima de R$3.300: 10,5%

Exemplo:
  salário: R$ 1.500,00
  faixa 1: R$1.100 * 7,5% = R$82,50
  faixa 2: R$400 * 8,5% = R$34,00
  resultado: R$116,50
```

### 3.5 Produtor Rural (GPS 1120 ou 1180)

```
Tipo: "produtor_rural"
Alíquota: 1,5% (normal) ou 1,3% (especial)
Cálculo: receita_bruta * aliquota

Exemplo:
  receita_bruta: R$ 100.000,00
  resultado: R$ 1.500,00
```

### 3.6 Facultativo (GPS 1295)

```
Tipo: "facultativo"
Alíquota: 20% sobre salário mínimo

Exemplo:
  valor_base: (ignorado)
  resultado: R$ 303,60 (20% de R$1.518)
```

---

## 4. FLUXO DE EMISSÃO

```
1. Cliente envia requisição
   POST /api/v1/guias/emitir
   {
     "whatsapp": "+5511999999999",
     "tipo_contribuinte": "autonomo",
     "valor_base": 2000.0,
     "plano": "normal",
     "competencia": "10/2025"
   }

2. Backend valida entrada
   ✓ WhatsApp formato válido
   ✓ Tipo de contribuinte suportado
   ✓ Competência normalizada

3. Cria/obtém usuário
   - Busca por WhatsApp em BD
   - Se não existe, cria novo usuário

4. Calcula guia
   - Utiliza INSSCalculator
   - Retorna: código GPS, valor, detalhes

5. Gera PDF
   - Usa GPSGenerator
   - Inclui código de barras
   - Retorna bytes

6. Persiste em BD
   - Salva em tabela `guias`
   - Status: "pendente"
   - URL do PDF

7. Envia via WhatsApp
   - Integra com Twilio
   - Envia PDF + mensagem
   - Retorna SID de envio

8. Retorna resposta
   {
     "guia": { id, codigo_gps, valor, ... },
     "whatsapp": { sid, status, media_url },
     "detalhes_calculo": { ... }
   }
```

---

## 5. ESTADO DA IMPLEMENTAÇÃO

### O Que Está Pronto ✅

```
✅ Calculadora INSS (100%)
   - Todos os tipos implementados
   - Lógica correta
   - Testes básicos passando

✅ Gerador de PDF (100%)
   - PDF válido gerado
   - Código de barras incluído
   - Retorna bytes

✅ Rotas FastAPI (100%)
   - /emitir implementado
   - /complementacao implementado
   - /historico implementado
   - /webhook/whatsapp implementado

✅ Configuração (90%)
   - Settings file pronto
   - Variáveis de ambiente definidas

✅ Banco de Dados (90%)
   - Schema SQL pronto
   - Migrations prontas
```

### O Que Precisa Validação ⚠️

```
⚠️ Integração Supabase
   - Conexão não testada
   - Queries não validadas
   - Storage não testado

⚠️ Integração WhatsApp/Twilio
   - Webhook não testado
   - Envio de PDF não validado
   - Retry logic não testado

⚠️ Tratamento de Erros
   - Faltam cases de erro
   - Sem fallback para falhas
   - Sem rate limiting

⚠️ Autenticação
   - Sem validação de origem
   - Sem rate limiting
   - Sem CORS restritivo
```

### O Que Está Faltando ❌

```
❌ Testes unitários completos
   - Apenas 2 testes básicos

❌ Testes de integração
   - Supabase nunca testado
   - WhatsApp nunca testado

❌ Monitoramento
   - Sem logs estruturados
   - Sem métricas
   - Sem alertas

❌ Documentação de API
   - Faltam exemplos
   - Faltam documentos de erro
   - Swagger/OpenAPI não customizado

❌ CI/CD
   - Sem pipeline de testes
   - Sem deploy automático
```

---

## 6. STACK TECNOLÓGICO

### Backend

```
✅ FastAPI 0.109.0         - Web framework
✅ Uvicorn 0.27.0          - ASGI server
✅ Pydantic (auto)         - Validação
✅ Python-dotenv 1.0.0     - Config
```

### Database & Storage

```
✅ Supabase 2.22.3         - PostgreSQL + Auth
✅ Supabase-auth           - Autenticação
```

### Geração de Documentos

```
✅ ReportLab 4.0.9         - PDF
✅ Python-barcode 0.15.1   - Código de barras
✅ Pillow 10.2.0           - Imagens
```

### Mensageria

```
✅ Twilio 8.11.0           - WhatsApp
```

### IA

```
✅ LangChain 0.1.6         - Orchestration
✅ LangChain-OpenAI 0.0.5  - GPT-4
```

### Testes

```
✅ Pytest 7.4.4            - Framework
```

---

## 7. CHECKLIST DE VALIDAÇÃO

### Fase 1: Estrutura (✅ Completa)

```
✅ FastAPI app criado
✅ Rotas definidas
✅ Modelos Pydantic
✅ Dependências instaladas
✅ Config preparado
```

### Fase 2: Lógica (✅ Completa)

```
✅ Calculadora INSS
✅ Gerador de PDF
✅ Normalizadores de dados
✅ Validadores
```

### Fase 3: Integração (⚠️ Não Testada)

```
❌ Conectar Supabase
❌ Validar queries
❌ Testar WhatsApp
❌ Validar envio de PDF
```

### Fase 4: Testes (❌ Mínimo)

```
❌ Testes unitários completos
❌ Testes de integração
❌ Testes de carga
❌ Testes de segurança
```

---

## 8. PRÓXIMOS PASSOS PARA TESTES

### Passo 1: Setup Local (30 min)

```bash
# 1. Entrar no diretório
cd apps/backend/inss

# 2. Criar ambiente virtual
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# 3. Instalar dependências
pip install -r requirements.txt

# 4. Configurar .env
cp .env.example .env
# Preencher com credenciais reais

# 5. Executar testes básicos
pytest tests/
```

### Passo 2: Teste de Calculadora (15 min)

```python
# Executar cálculos isolados
python -c "
from app.services.inss_calculator import INSSCalculator

calc = INSSCalculator()

# Teste 1: Autônomo normal
print('Autônomo Normal:')
resultado = calc.calcular_contribuinte_individual(2000, 'normal')
print(f'  Valor: R$ {resultado.valor}')
print(f'  Código: {resultado.codigo_gps}')

# Teste 2: Simplificado
print('Simplificado:')
resultado = calc.calcular_contribuinte_individual(5000, 'simplificado')
print(f'  Valor: R$ {resultado.valor}')
print(f'  Código: {resultado.codigo_gps}')

# Teste 3: Complementação
print('Complementação:')
resultado = calc.calcular_complementacao(['01/2024', '02/2024'], 1000)
print(f'  Valor: R$ {resultado.valor}')
print(f'  Código: {resultado.codigo_gps}')
"
```

### Passo 3: Teste de PDF (15 min)

```python
# Gerar PDF isolado
python -c "
from app.services.pdf_generator import GPSGenerator

gen = GPSGenerator()
dados = {
    'nome': 'João Silva',
    'cpf': '123.456.789-00',
    'nit': '12345678901',
    'whatsapp': '+5511999999999'
}

pdf_bytes = gen.gerar_guia(dados, 400.0, '1007', '10/2025')
with open('/tmp/teste.pdf', 'wb') as f:
    f.write(pdf_bytes)

print(f'PDF gerado: {len(pdf_bytes)} bytes')
print(f'Arquivo salvo em: /tmp/teste.pdf')
"
```

### Passo 4: Teste de API (30 min)

```bash
# 1. Iniciar servidor
uvicorn app.main:app --reload

# 2. Em outro terminal, fazer requisição
curl -X POST http://localhost:8000/api/v1/guias/emitir \
  -H "Content-Type: application/json" \
  -d '{
    "whatsapp": "+5511999999999",
    "tipo_contribuinte": "autonomo",
    "valor_base": 2000.0,
    "plano": "normal",
    "competencia": "10/2025"
  }'

# Resposta esperada:
# {
#   "guia": { "id": "...", "codigo_gps": "1007", "valor": 400.0, ... },
#   "whatsapp": { "sid": "...", "status": "sent", ... },
#   "detalhes_calculo": { "plano": "normal", ... }
# }
```

### Passo 5: Teste de Supabase (30 min)

```python
# Validar conexão e queries
python -c "
from app.services.supabase_service import SupabaseService
import asyncio

async def teste():
    svc = SupabaseService()
    
    # Teste 1: Criar usuário
    usuario = await svc.criar_usuario({
        'whatsapp': '+5511999999999',
        'nome': 'Teste',
        'cpf': '123.456.789-00',
        'tipo_contribuinte': 'autonomo'
    })
    print(f'Usuário criado: {usuario[\"id\"]}')
    
    # Teste 2: Obter usuário
    usuario_obtido = await svc.obter_usuario_por_whatsapp('+5511999999999')
    print(f'Usuário obtido: {usuario_obtido[\"whatsapp\"]}')
    
    # Teste 3: Salvar guia
    guia = await svc.salvar_guia(usuario['id'], {
        'codigo_gps': '1007',
        'competencia': '10/2025',
        'valor': 400.0,
        'status': 'pendente'
    })
    print(f'Guia salva: {guia[\"id\"]}')

asyncio.run(teste())
"
```

### Passo 6: Teste de WhatsApp (30 min)

```python
# Validar envio de PDF
python -c "
from app.services.whatsapp_service import WhatsAppService
from app.services.supabase_service import SupabaseService
import asyncio

async def teste():
    svc_wa = WhatsAppService(supabase_service=SupabaseService())
    
    # Gerar PDF
    from app.services.pdf_generator import GPSGenerator
    gen = GPSGenerator()
    pdf_bytes = gen.gerar_guia(
        {'nome': 'Teste', 'cpf': '123', 'nit': '456', 'whatsapp': '+5511999999999'},
        400.0, '1007', '10/2025'
    )
    
    # Enviar via WhatsApp
    resultado = await svc_wa.enviar_pdf_whatsapp(
        '+5511999999999',
        pdf_bytes,
        'Sua guia INSS está pronta!'
    )
    print(f'Enviado: {resultado.sid}')
    print(f'Status: {resultado.status}')

asyncio.run(teste())
"
```

---

## 9. POSSÍVEIS PROBLEMAS E SOLUÇÕES

### Problema 1: "ModuleNotFoundError"

```
Erro: ModuleNotFoundError: No module named 'app'

Solução:
- Garantir que está no diretório `/inss`
- Adicionar ao PYTHONPATH: export PYTHONPATH=/path/to/inss
- Executar com: python -m pytest tests/
```

### Problema 2: "Supabase authentication failed"

```
Erro: 401 Unauthorized

Solução:
- Validar SUPABASE_URL em .env
- Validar SUPABASE_KEY em .env
- Confirmar que tabelas foram criadas
- Executar schema SQL no editor Supabase
```

### Problema 3: "PDF não gera código de barras"

```
Erro: "[Instale python-barcode...]"

Solução:
- Executar: pip install python-barcode Pillow
- Validar import no python:
  import barcode
```

### Problema 4: "Twilio auth failed"

```
Erro: 401 Unauthorized

Solução:
- Validar TWILIO_ACCOUNT_SID em .env
- Validar TWILIO_AUTH_TOKEN em .env
- Validar TWILIO_WHATSAPP_NUMBER em .env
- Confirmar que número está vinculado
```

---

## 10. ESTIMATIVA DE ESFORÇO

| Fase | Tarefa | Tempo | Status |
|------|--------|-------|--------|
| 1 | Setup local | 30 min | ⏳ |
| 2 | Testes calculadora | 15 min | ⏳ |
| 3 | Testes PDF | 15 min | ⏳ |
| 4 | Testes API | 30 min | ⏳ |
| 5 | Integração Supabase | 1-2h | ⏳ |
| 6 | Integração WhatsApp | 1-2h | ⏳ |
| 7 | Testes end-to-end | 1h | ⏳ |
| **Total** | | **4-6h** | |

---

## 11. CONCLUSÃO

O sistema INSS está **75% pronto** para testes:

### Pronto ✅
- Lógica de cálculo (100%)
- Gerador de PDF (100%)
- Rotas FastAPI (100%)
- Modelos Pydantic (100%)

### Requer Validação ⚠️
- Integração Supabase (não testada)
- Integração WhatsApp (não testada)
- Tratamento de erros (incompleto)
- Logging (não estruturado)

### Próximos Passos
1. Executar testes locais conforme seção 8
2. Validar integração com Supabase
3. Validar envio via WhatsApp
4. Corrigir erros encontrados
5. Implementar testes mais completos
6. Deploy em staging

---

**Relatório preparado**: 29/10/2025  
**Próxima revisão**: Após testes de integração
