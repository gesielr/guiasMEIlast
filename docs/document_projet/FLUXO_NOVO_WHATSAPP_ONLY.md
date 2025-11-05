# 🔄 Novo Fluxo: WhatsApp-Only para MEI e Autônomo

## 📋 Resumo das Mudanças

### ✅ O que MUDOU:

1. **MEI e Autônomo**: Atendimento **SOMENTE via WhatsApp** (sem acesso a dashboard web)
2. **Parceiro e Administrador**: Mantêm acesso completo a **dashboards e relatórios no frontend**
3. **MEI/Autônomo podem solicitar relatórios via WhatsApp**: Ver notas/guias emitidas por data
4. **Reimpressão via WhatsApp**: Podem solicitar PDF de nota ou guia específica

---

## 🚀 Fluxo 1: Usuário MEI (Microempreendedor Individual) - WhatsApp Only

### 1.1 Entrada no Sistema
```
HomePage (/) 
  ↓ Clica em "Começar agora" ou "Entrar"
  ↓
Página de Seleção (/cadastro)
  ↓ Escolhe "Sou MEI"
  ↓
Cadastro MEI (/cadastro/mei)
  ↓
Cadastro completo → Redirecionado para WhatsApp
  ↓
[NÃO há acesso a /dashboard/usuario]
```

### 1.2 Atendimento WhatsApp-IA

**Após Cadastro:**
- IA identifica usuário pelo telefone cadastrado
- IA chama pelo nome do cadastro
- Mensagem de boas-vindas personalizada
- Fluxo de pagamento e certificado via WhatsApp

### 1.3 Emissão de NFS-e via WhatsApp

```
Usuário envia: "Emitir nota" ou áudio "Emitir nota"
  ↓
IA solicita dados:
  ├─ CNPJ/CPF do tomador (sem pontos/traços)
  ├─ Descrição do serviço
  ├─ Valor do serviço
  └─ Data (automática do backend)
  ↓
Validação dos dados
  ↓
Envio para API NFSe
  ↓
NFS-e Emitida
  ↓
Registro na tabela 'nfse_emissions'
  ↓
Cobrança: QR Code PIX R$ 3,00
  ↓
Após pagamento: PDF da nota enviado via WhatsApp
```

### 1.4 Consulta de Relatório via WhatsApp

**Usuário solicita:**
```
"Ver minhas notas"
"Ver notas de janeiro"
"Relatório de notas"
"Ver notas de 01/01/2025 a 31/01/2025"
```

**Sistema responde:**
```
*Relatório de NFS-e Emitidas*

📅 Período: 01/01/2025 a 31/01/2025

📄 Nota #001
   Data: 15/01/2025
   Valor: R$ 500,00
   Tomador: Empresa XYZ Ltda
   Status: ✅ Emitida

📄 Nota #002
   Data: 20/01/2025
   Valor: R$ 750,00
   Tomador: Cliente ABC
   Status: ✅ Emitida

Total: 2 notas | R$ 1.250,00

Para ver o PDF de uma nota específica, digite:
"Ver nota 001" ou "PDF nota 001"
```

### 1.5 Reimpressão de Nota via WhatsApp

**Usuário solicita:**
```
"Ver nota 001"
"PDF nota 001"
"Imprimir nota 001"
"Enviar nota 001"
```

**Sistema responde:**
```
*NFS-e #001*

📄 Nota Fiscal de Serviço
📅 Data: 15/01/2025
💰 Valor: R$ 500,00
👤 Tomador: Empresa XYZ Ltda
📋 CNPJ: 12.345.678/0001-90

[PDF anexado - download automático]

Para emitir nova nota, digite "Emitir nota"
```

---

## 🏃 Fluxo 2: Usuário Autônomo - WhatsApp Only

### 2.1 Entrada no Sistema
```
HomePage (/)
  ↓
Página de Seleção (/cadastro)
  ↓ Escolhe "Sou Autônomo"
  ↓
Cadastro Autônomo (/cadastro/autonomo)
  ↓
Cadastro completo → Redirecionado para WhatsApp
  ↓
[NÃO há acesso a /dashboard/usuario]
```

### 2.2 Emissão de GPS via WhatsApp

```
Usuário envia: "Emitir GPS" ou "Emitir guia"
  ↓
IA pergunta categoria:
  1 - Contribuinte Individual
  2 - Facultativo
  3 - Empregado Doméstico
  4 - Segurado Especial
  5 - Complementação – MEI
  6 - Produção Rural
  ↓
IA pergunta quantidade de salários
  ↓
IA pergunta mês/competência (até 6 meses atrás)
  ↓
Cálculo automático de juros/multas (se atrasado)
  ↓
Geração da Guia GPS
  ↓
Registro na tabela 'gps_emissions'
  ↓
Cobrança: 6% sobre o valor da guia
  ↓
Após pagamento: PDF da guia enviado via WhatsApp
```

### 2.3 Consulta de Relatório GPS via WhatsApp

**Usuário solicita:**
```
"Ver minhas guias"
"Ver guias de janeiro"
"Relatório de GPS"
"Ver guias de 01/01/2025 a 31/01/2025"
```

**Sistema responde:**
```
*Relatório de Guias GPS Emitidas*

📅 Período: 01/01/2025 a 31/01/2025

📄 Guia #GPS001
   Competência: 01/2025
   Valor: R$ 303,60
   Tipo: Contribuinte Individual (20%)
   Status: ✅ Emitida

📄 Guia #GPS002
   Competência: 02/2025
   Valor: R$ 303,60
   Tipo: Contribuinte Individual (20%)
   Status: ✅ Emitida

Total: 2 guias | R$ 607,20

Para ver o PDF de uma guia específica, digite:
"Ver guia GPS001" ou "PDF guia GPS001"
```

### 2.4 Reimpressão de Guia GPS via WhatsApp

**Usuário solicita:**
```
"Ver guia GPS001"
"PDF guia GPS001"
"Imprimir guia GPS001"
"Enviar guia GPS001"
```

**Sistema responde:**
```
*Guia GPS #GPS001*

📄 Guia de Previdência Social
📅 Competência: Janeiro/2025
💰 Valor: R$ 303,60
📋 Tipo: Contribuinte Individual (20%)
📊 Código: 1007

[PDF anexado - download automático]

Para emitir nova guia, digite "Emitir GPS"
```

---

## 🤝 Fluxo 3: Parceiro (Contabilidade) - Dashboard Web

### 3.1 Acesso ao Sistema
```
HomePage (/)
  ↓
Login (/login)
  ↓
Verificação: user_type === 'partner'
  ↓
Dashboard Parceiro (/dashboard/parceiro) ✅ ACESSO WEB
```

### 3.2 Dashboard Parceiro (Frontend)

**Funcionalidades Disponíveis:**
- ✅ Visualizar estatísticas (clientes, emissões, comissões)
- ✅ Gerenciar clientes (adicionar, listar, vincular)
- ✅ Gerar links de convite
- ✅ Visualizar relatórios de comissões
- ✅ Exportar relatórios (Excel, PDF)
- ✅ Acompanhar emissões de clientes em tempo real

**Tela Principal:**
```
┌─────────────────────────────────────┐
│  Dashboard Parceiro                 │
├─────────────────────────────────────┤
│  📊 Estatísticas                    │
│  ├─ Total de Clientes: 45          │
│  ├─ NFS-e Emitidas: 320            │
│  ├─ GPS Emitidas: 180              │
│  └─ Comissões: R$ 2.040,00         │
├─────────────────────────────────────┤
│  👥 Meus Clientes                   │
│  ├─ Adicionar novo cliente         │
│  ├─ Gerar link de convite          │
│  └─ Lista de clientes              │
├─────────────────────────────────────┤
│  💰 Minhas Comissões                │
│  └─ Histórico de comissões         │
├─────────────────────────────────────┤
│  📈 Relatórios                      │
│  ├─ Relatório por período          │
│  ├─ Relatório por cliente           │
│  └─ Exportar para Excel/PDF        │
└─────────────────────────────────────┘
```

---

## 👨‍💼 Fluxo 4: Administrador - Dashboard Web

### 4.1 Acesso Administrativo
```
HomePage (/)
  ↓ Clica "Acesso Restrito Admin"
  ↓
Admin Login (/admin/login)
  ↓
Verificação: user_type === 'admin'
  ↓
Admin Dashboard (/dashboard/admin) ✅ ACESSO WEB
```

### 4.2 Dashboard Administrativo (Frontend)

**Funcionalidades Disponíveis:**
- ✅ Estatísticas globais (usuários, parceiros, emissões, receita)
- ✅ Gestão de usuários (aprovar, editar, desativar)
- ✅ Gestão de parceiros (aprovar, comissões)
- ✅ Gestão de certificados digitais
- ✅ Monitoramento de emissões NFS-e e GPS
- ✅ Relatórios gerenciais completos
- ✅ Exportar dados (Excel, PDF, CSV)
- ✅ Logs e auditoria

**Tela Principal:**
```
┌─────────────────────────────────────┐
│  Admin Dashboard                    │
├─────────────────────────────────────┤
│  📊 Estatísticas Globais            │
│  ├─ Total Usuários: 128            │
│  ├─ Total Parceiros: 12            │
│  ├─ NFS-e Emitidas: 420            │
│  ├─ GPS Emitidas: 315              │
│  └─ Receita Total: R$ 5.985,00     │
├─────────────────────────────────────┤
│  👥 Gestão de Usuários              │
│  ├─ Aprovar onboarding             │
│  ├─ Editar perfis                  │
│  └─ Desativar contas               │
├─────────────────────────────────────┤
│  📜 Gestão NFS-e                    │
│  ├─ Certificados Digitais          │
│  ├─ Emissões                       │
│  ├─ Relatórios                     │
│  └─ Exportar dados                 │
└─────────────────────────────────────┘
```

---

## 🔄 Sistema de Autenticação (Modificado)

### Fluxo de Login
```
Login Page (/login)
  ↓
Supabase Auth
  ↓
Verificação de credenciais
  ↓
Session criada
  ↓
Busca profile na tabela 'profiles'
  ↓
Redirecionamento baseado em user_type:
  ├─ 'mei' → Redireciona para WhatsApp (link direto)
  ├─ 'autonomo' → Redireciona para WhatsApp (link direto)
  ├─ 'partner' → /dashboard/parceiro ✅ WEB
  └─ 'admin' → /dashboard/admin ✅ WEB
```

### Proteção de Rotas

**MEI e Autônomo:**
- ❌ Bloqueio de acesso a `/dashboard/usuario`
- ✅ Redirecionamento automático para WhatsApp
- ✅ Mensagem: "Acesse seu atendimento via WhatsApp"

**Parceiro e Admin:**
- ✅ Acesso completo a dashboards web
- ✅ Autenticação via Supabase Auth
- ✅ Sessões seguras

---

## 📱 Funcionalidades WhatsApp para MEI/Autônomo

### Comandos Disponíveis via WhatsApp

1. **Emissões:**
   - "Emitir nota" → Fluxo de emissão NFS-e
   - "Emitir GPS" → Fluxo de emissão GPS
   - "Emitir guia" → Alias para GPS

2. **Consultas:**
   - "Ver minhas notas" → Lista todas as notas
   - "Ver notas de [data]" → Filtro por data
   - "Ver minhas guias" → Lista todas as guias GPS
   - "Ver guias de [mês]" → Filtro por mês/competência
   - "Relatório de notas" → Relatório completo
   - "Relatório de GPS" → Relatório completo

3. **Reimpressões:**
   - "Ver nota [número]" → PDF da nota específica
   - "PDF nota [número]" → PDF da nota específica
   - "Ver guia [número]" → PDF da guia específica
   - "PDF guia [número]" → PDF da guia específica

4. **Outros:**
   - "Status certificado" → Status do certificado digital
   - "Ajuda" → Menu de ajuda
   - "Suporte" → Encaminhar para humano

---

## 📊 Estrutura de Dados (Mantida)

### Tabelas Principais (sem alterações)

#### 1. profiles
- `user_type`: 'mei' | 'autonomo' | 'partner' | 'admin'
- `phone`: usado para identificar usuário no WhatsApp

#### 2. nfse_emissions
- `user_id`: ID do usuário MEI
- `numero_nota`: Número da nota (para consulta)
- `valor`: Valor da nota
- `data_emissao`: Data de emissão
- `pdf_url`: URL do PDF (para reimpressão)

#### 3. gps_emissions
- `user_id`: ID do usuário autônomo
- `competencia`: Mês/ano da competência
- `valor`: Valor da guia
- `pdf_url`: URL do PDF (para reimpressão)

---

## 🔧 Implementação Técnica Necessária

### 1. Backend - Novos Endpoints WhatsApp

#### A) Consulta de Relatórios
```
POST /whatsapp/webhook
  ↓
Detecta intenção: "ver notas" | "ver guias" | "relatório"
  ↓
Busca no banco:
  - nfse_emissions (MEI)
  - gps_emissions (Autônomo)
  ↓
Filtra por data (se solicitado)
  ↓
Formata resposta em texto WhatsApp
  ↓
Envia via Z-API
```

#### B) Reimpressão de PDF
```
POST /whatsapp/webhook
  ↓
Detecta intenção: "ver nota [número]" | "PDF nota [número]"
  ↓
Busca no banco:
  - nfse_emissions WHERE numero_nota = [número]
  - gps_emissions WHERE id = [número]
  ↓
Recupera PDF do Supabase Storage
  ↓
Envia PDF via WhatsApp (mídia)
```

### 2. Frontend - Bloqueio de Acesso

#### A) Middleware de Roteamento
```typescript
// Se user_type === 'mei' ou 'autonomo'
if (user.user_type === 'mei' || user.user_type === 'autonomo') {
  // Bloquear acesso a /dashboard/usuario
  // Redirecionar para WhatsApp
  window.location.href = `https://wa.me/${WHATSAPP_NUMBER}`;
}
```

#### B) Rotas Protegidas
```typescript
// /dashboard/usuario → Apenas se não for MEI/Autônomo
// /dashboard/parceiro → Apenas se user_type === 'partner'
// /dashboard/admin → Apenas se user_type === 'admin'
```

### 3. IA - Processamento de Intenções

#### A) Detecção de Intenções
- "ver notas" → Consulta relatório NFS-e
- "ver guias" → Consulta relatório GPS
- "ver nota [número]" → Reimpressão NFS-e
- "ver guia [número]" → Reimpressão GPS

#### B) Extração de Parâmetros
- Data: "janeiro", "01/2025", "01/01/2025 a 31/01/2025"
- Número: "nota 001", "guia GPS001"

---

## 📝 Exemplos de Conversação WhatsApp

### Exemplo 1: Consulta de Relatório
```
Usuário: Ver minhas notas de janeiro

IA: *Relatório de NFS-e Emitidas*

📅 Período: Janeiro/2025

📄 Nota #001
   Data: 15/01/2025
   Valor: R$ 500,00
   Tomador: Empresa XYZ Ltda
   Status: ✅ Emitida

📄 Nota #002
   Data: 20/01/2025
   Valor: R$ 750,00
   Tomador: Cliente ABC
   Status: ✅ Emitida

Total: 2 notas | R$ 1.250,00

Para ver o PDF de uma nota específica, digite:
"Ver nota 001" ou "PDF nota 001"
```

### Exemplo 2: Reimpressão
```
Usuário: Ver nota 001

IA: *NFS-e #001*

📄 Nota Fiscal de Serviço
📅 Data: 15/01/2025
💰 Valor: R$ 500,00
👤 Tomador: Empresa XYZ Ltda
📋 CNPJ: 12.345.678/0001-90

[PDF anexado]

Para emitir nova nota, digite "Emitir nota"
```

---

## ✅ Checklist de Implementação

### Backend
- [ ] Criar função para buscar notas/guias por usuário e data
- [ ] Criar função para formatar relatório em texto WhatsApp
- [ ] Criar função para recuperar PDF do Supabase Storage
- [ ] Integrar envio de PDF via WhatsApp (mídia)
- [ ] Adicionar detecção de intenções no IA Agent
- [ ] Adicionar extração de parâmetros (data, número)

### Frontend
- [ ] Adicionar middleware para bloquear MEI/Autônomo em /dashboard/usuario
- [ ] Redirecionar MEI/Autônomo para WhatsApp após login
- [ ] Manter acesso completo para Parceiro e Admin

### IA
- [ ] Adicionar intenções de consulta de relatórios
- [ ] Adicionar intenções de reimpressão
- [ ] Melhorar detecção de datas e números

---

Este documento descreve o novo fluxo onde MEI e Autônomo usam SOMENTE WhatsApp, enquanto Parceiro e Administrador mantêm acesso completo aos dashboards web.

