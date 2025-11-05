# 🔄 Fluxo Completo do Aplicativo GuiasMEI

## 📋 Visão Geral

O GuiasMEI é uma plataforma para emissão de Notas Fiscais de Serviço (NFS-e) e Guias de INSS (GPS) com integração via WhatsApp e IA. O sistema possui 4 tipos de usuários com fluxos distintos.

---

## 👥 Tipos de Usuários

1. **MEI (Microempreendedor Individual)** - Emite NFS-e
2. **Autônomo** - Emite Guias GPS (INSS)
3. **Parceiro (Contabilidade)** - Gerencia clientes MEI/Autônomos
4. **Administrador** - Gerencia toda a plataforma

---

## 🚀 Fluxo 1: Usuário MEI (Microempreendedor Individual)

### 1.1 Entrada no Sistema
```
HomePage (/) 
  ↓ Clica em "Começar agora" ou "Entrar"
  ↓
Página de Seleção (/cadastro)
  ↓ Escolhe "Sou MEI"
  ↓
Cadastro MEI (/cadastro/mei)
```

### 1.2 Processo de Cadastro MEI
**Dados Solicitados:**
- Email e senha
- CNPJ (busca automática na Receita Federal via IA)
- Nome completo
- Telefone
- Endereço completo
- PIS/NIT (criptografado)
- Aceite do contrato

**Após Cadastro:**
- Usuário é criado no Supabase Auth
- Profile criado na tabela `profiles` com `user_type: 'mei'`
- Dados sensíveis (CNPJ, PIS) são criptografados
- Status inicial: `onboarding_completed: false`

### 1.3 Atendimento WhatsApp-IA /Pagamento de Adesão
```
Cadastro Completo
  ↓
Redirecionado para WhatsApp-IA 
  ↓
A IA ja deve saber pelo cadastro o nome e que é MEI, chamar pelo nome do Cadastro
  ↓
A IA da uma mensagem de boas vindas  "Diz que falta pouco para ele emitir notas fiscais pelo whatsapp sem mensalidades, voce só vai pagar 150 reais uma unica vez por ano e depois não paga mais nada, vai pagar somente 3 reais por nota, se não emitir nota não paga nada, e para ter 100% de segurança sera na validade e segurança vai ser emitido um certificado digital para emissão de todas as notas. Estamos gerando o QR com o copia e cola para ativar o sistema e agendar a data do certificado digital.
  ↓
Registro na tabela 'payments'
  ↓
Após o pagamento a IA diz "Seu pagemtno foi efetuado", estamos marcando a data para emissão do seu certificado digital ..... (Ela vai consultar através da integração com a certising e trazer o dia e a hora que será feito o certificado). Após isso nosso backend deve enviar dois dias antes um aviso, um dia antes um aviso, e 3 hora antes um aviso, e 1 hora antes um aviso, e 15 min antes um aviso, o link da reunião com pessoal da certsing será enviado pelo whatsApp. 
```

### 1.4 Após a efetivação do Certificado

Após a efetivação do certificado o nosso backend recebe um e-mail com os dados do certificado
o certificado vai ficar na nuvem da certising, e token no celular do usuário. 

Acessamos as credenciais do certificado e guardamos no bakend para associar a aquele usuário para
futuras emissões de notas fiscais. 

**Fluxo do Certificado:**

**Estados do Certificado:**
- **Pendente**: Aguardando solicitação
- **Em Processo**: Documentação em análise
- **Ativo**: Certificado válido e funcional
- **Expirado**: Necessita renovação salvar para enviar para o usuário fazer a renovação.

Após tudo feito a IA envia uma mensagem para o usuário dizendo "Pronto voce ja pode emitir suas notas fiscais, para emitir é só digitar "Emitir nota", ou enviar um audio falando"Emitir nota"

Após o pedido a IA vai mostrar nesta ordem: 

Digite o CNPJ ou CPF para quem voce prestou o serviço:(não deixar digitar mais que 14 digitos exemplo 00000000000000 digitar sem pontos ou traços)
(Se for CNPJ nosso backend vai na API da receita federal e ja busca todos os dados e salva para emissão, o codigo tributário do MEI que esta enviado deve ser sempre o CNAE principal do cartão CNPJ dele que temos que salvar também no cadastro dele na hora que é feito o cadastro de MEI)

Se for CPF ele deve digitar o CPF (não deixar digitar mais que 11 ditgitos exemplo:00000000000 de CPF digitar sem pontos ou traços)

### 1.5 Emissão de NFS-e (/emitir-nota)

**Fluxo de Emissão:**

Formulário de Emissão
  ├─ Dados do Tomador (cliente)
  ├─ Descrição do serviço
  ├─ Valor do serviço
  ├─ Data de emissão "deve ser automatica da data da hora e dia do backend" 
  └─ Código de serviço (Deve ser pego no CNAE do cartão cnpj pela API da receita federal)
  ↓
Validação dos dados
  ↓
Envio para API que nosso Backend esta integrado (Emissor Nacional de Notas Fiscais de Serviços)
  ↓
NFS-e Emitida
  ↓
Registro na tabela 'nfse_emissions'
  ↓
Cobrança: é gerado um QR e pix copia e cola de R$ 3,00 por nota após confirmação do pagamento a nota fiscal ja emitida e enviada em pdf para o whatsapp do usuário.
```

## 🏃 Fluxo 2: Usuário Autônomo (Contribuinte Individual)

### 2.1 Entrada no Sistema
```
HomePage (/)
  ↓
Página de Seleção (/cadastro)
  ↓ Escolhe "Sou Autônomo"
  ↓
Cadastro Autônomo (/cadastro/autonomo)
```

### 2.2 Processo de Cadastro Autônomo
**Dados Solicitados:**
- Email e senha
- CPF
- Nome completo
- Telefone
- Endereço
- PIS/NIT (criptografado)

Enviado 



### 2.3 Enviado para o WhatsApp-IA 

A IA da as boas vindas e elogia o usuário e lembra ele o quanto é importante contribuir para o INSS para estar segurado e mais tarde poder se aposentar. 

A IA pergunta qual categoria o susuário é: 

1 - Contribuinte Individual (Autônomo)
2 - Facultativo
3 - Empregado Doméstico
4 - Segurado Especial
5 - Complementação – MEI
6 - Produção Rural

Após escolher a IA vai perguntar sobre quantos salarios o usuários vai contribuir segundo as normas do SAL somente, sempe partindo de um salário.
Após escolher a IA vai perguntar qual mês que ele quer pagar, pois é possivel retroceder 6 meses atrás para pagamento(fixar esta data maxima que usuário possa escolher, mostrar o mes e ele vai escolher, se for para trás o aplicativo calcula os juros e multas)
  ↓
Cálculo automático de juros/multas (se atrasado)
  ↓
Geração da Guia GPS
  ↓
Registro na tabela 'gps_emissions'
  ↓
Cobrança: 6% sobre o valor da guia
```

**Exemplo de Cobrança:**
- Guia de R$ 100,00 → Taxa de R$ 6,00
- Guia de R$ 200,00 → Taxa de R$ 12,00

---

## 🤝 Fluxo 3: Parceiro (Contabilidade)

### 3.1 Entrada no Sistema
```
HomePage (/)
  ↓
Página de Seleção (/cadastro)
  ↓ Escolhe "Sou Parceiro"
  ↓
Cadastro Parceiro (/cadastro/parceiro)
```

### 3.2 Processo de Cadastro Parceiro
**Dados Solicitados:**
- Email e senha
- CNPJ da contabilidade
- Razão social
- Nome fantasia
- Telefone comercial
- Endereço comercial
- CRC (Conselho Regional de Contabilidade)
- Responsável técnico

**Após Cadastro:**
- Profile criado com `user_type: 'partner'`
- Registro na tabela `partners`
- Sem taxa de adesão (modelo B2B)

### 3.3 Dashboard Parceiro (/dashboard/parceiro)

**Visão Geral:**
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
└─────────────────────────────────────┘
```

### 3.4 Gestão de Clientes

**A) Adicionar Cliente Manualmente:**
```
Dashboard → "Adicionar Cliente"
  ↓
Formulário
  ├─ CPF/CNPJ do cliente
  ├─ Nome
  └─ Tipo (MEI ou Autônomo)
  ↓
Cliente vinculado ao parceiro
  ↓
Registro na tabela 'partner_clients'
```

**B) Link de Convite:**
```
Dashboard → "Gerar Link de Convite"
  ↓
Sistema gera URL única
  ↓
Exemplo: /cadastro/mei?ref=PARCEIRO123
  ↓
Cliente se cadastra pelo link
  ↓
Vinculação automática ao parceiro
```

### 3.5 Sistema de Comissões

**Modelo de Comissão:**
- **NFS-e**: R$ 3,00 por nota → Parceiro recebe 30% = R$ 0,90
- **GPS**: 6% do valor → Parceiro recebe 30% = 1,8% do valor

**Exemplo:**
```
Cliente emite 10 NFS-e no mês
  → Receita: R$ 30,00
  → Comissão Parceiro: R$ 9,00

Cliente emite GPS de R$ 500,00
  → Receita: R$ 30,00 (6%)
  → Comissão Parceiro: R$ 9,00 (30% de R$ 30,00)
```

**Visualização:**
```
Tabela de Comissões
┌──────────────┬─────────────┬──────────┬──────────┐
│ Cliente      │ Serviço     │ Valor    │ Status   │
├──────────────┼─────────────┼──────────┼──────────┤
│ João Silva   │ NFS-e       │ R$ 0,90  │ Pago     │
│ Maria Santos │ GPS         │ R$ 9,00  │ Pendente │
│ Pedro Costa  │ NFS-e       │ R$ 0,90  │ Pago     │
└──────────────┴─────────────┴──────────┴──────────┘
```

---

## 👨‍💼 Fluxo 4: Administrador

### 4.1 Acesso Administrativo
```
HomePage (/)
  ↓ Clica "Acesso Restrito Admin"
  ↓
Admin Login (/admin/login)
  ↓ Credenciais especiais
  ↓
Verificação: user_type === 'admin'
  ↓
Admin Dashboard (/dashboard/admin)
```

### 4.2 Dashboard Administrativo

**Visão Geral:**
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
│  🤝 Gestão de Parceiros             │
│  ├─ Aprovar contabilidades         │
│  └─ Gerenciar comissões            │
├─────────────────────────────────────┤
│  📜 Gestão NFS-e                    │
│  ├─ Certificados Digitais          │
│  ├─ Emissões                       │
│  ├─ Relatórios                     │
│  ├─ Configurações                  │
│  └─ Logs                           │
└─────────────────────────────────────┘
```

### 4.3 Funcionalidades Administrativas

#### A) Gestão de Usuários
```
Admin Dashboard → "Usuários"
  ↓
Lista de todos os usuários
  ├─ Filtrar por tipo (MEI/Autônomo)
  ├─ Filtrar por status (ativo/pendente)
  └─ Buscar por nome/documento
  ↓
Ações disponíveis:
  ├─ Aprovar onboarding
  ├─ Editar dados
  ├─ Resetar senha
  └─ Desativar conta
```

#### B) Gestão de Certificados (/admin/nfse/certificados)
```
Painel de Certificados
  ├─ Listar todos os certificados
  ├─ Status: Pendente/Ativo/Expirado
  ├─ Filtrar por vencimento
  ├─ Renovar certificados
  └─ Histórico de emissões
```

#### C) Gestão de Emissões (/admin/nfse/emissoes)
```
Painel de Emissões
  ├─ Todas as NFS-e emitidas
  ├─ Filtros:
  │   ├─ Por período
  │   ├─ Por usuário
  │   ├─ Por status
  │   └─ Por valor
  ├─ Cancelar emissões
  └─ Reemitir notas
```

#### D) Relatórios (/admin/nfse/relatorios)
```
Relatórios Gerenciais
  ├─ Receita por período
  ├─ Emissões por tipo
  ├─ Performance de parceiros
  ├─ Taxa de conversão
  └─ Exportar para Excel/PDF
```

#### E) Configurações (/admin/nfse/configuracoes)
```
Configurações do Sistema
  ├─ Parâmetros de emissão
  ├─ Valores de taxas
  ├─ Integrações (APIs)
  ├─ Certificados SSL
  └─ Backup automático
```

#### F) Logs (/admin/nfse/logs)
```
Sistema de Logs
  ├─ Logs de acesso
  ├─ Logs de emissão
  ├─ Logs de erro
  ├─ Filtrar por:
  │   ├─ Tipo de evento
  │   ├─ Usuário
  │   ├─ Data/hora
  │   └─ Nível (info/warning/error)
  └─ Exportar logs
```

---

## 🔐 Sistema de Autenticação

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
  ├─ 'mei' → /dashboard/usuario
  ├─ 'autonomo' → /dashboard/usuario
  ├─ 'partner' → /dashboard/parceiro
  └─ 'admin' → /dashboard/admin
```

### Proteção de Rotas
```
AuthProvider (Context)
  ├─ Monitora sessão do Supabase
  ├─ Armazena dados do usuário
  ├─ Fornece funções:
  │   ├─ login()
  │   ├─ register()
  │   ├─ logout()
  │   └─ verify2fa()
  └─ Redireciona se não autenticado
```

---

## 💳 Sistema de Pagamentos

### Integração Sicoob

**Fluxo de Pagamento:**
```
Usuário completa cadastro
  ↓
Redirecionado para /pagamentos
  ↓
PaymentPage carrega Sicoob Checkout
  ↓
Usuário paga R$ 150,00
  ↓
Sicoob processa pagamento
  ↓
Webhook notifica backend
  ↓
Registro na tabela 'payments':
  ├─ user_id
  ├─ amount: 150.00
  ├─ status: 'completed'
  ├─ Sicoob_session_id
  └─ created_at
  ↓
Usuário redirecionado para dashboard
  ↓
Mensagem: "🎉 Pagamento confirmado!"
```

### Modelo de Cobrança

**Taxa de Adesão:**
- R$ 150,00 (pagamento único)
- Sem mensalidades

**Taxas por Uso:**
- **NFS-e**: R$ 3,00 por nota emitida
- **GPS**: 6% sobre o valor da guia

**Comissões para Parceiros:**
- 30% das taxas dos clientes vinculados

---

## 📊 Estrutura de Dados

### Tabelas Principais

#### 1. profiles
```sql
- id (UUID, PK)
- email (string)
- name (string)
- document (encrypted) -- CPF/CNPJ
- document_type (enum: 'cpf', 'cnpj')
- user_type (enum: 'mei', 'autonomo', 'partner', 'admin')
- pis (encrypted)
- phone (string)
- address (jsonb)
- contract_accepted (boolean)
- onboarding_completed (boolean)
- partner_id (UUID, FK) -- se vinculado a parceiro
- created_at (timestamp)
```

#### 2. payments
```sql
- id (UUID, PK)
- user_id (UUID, FK)
- amount (decimal)
- status (enum: 'pending', 'completed', 'failed')
- sicoob_session_id (string)
- payment_type (enum: 'adhesion', 'nfse', 'gps')
- created_at (timestamp)
```

#### 3. nfse_emissions
```sql
- id (UUID, PK)
- user_id (UUID, FK)
- numero_nota (string)
- valor (decimal)
- tomador_nome (string)
- tomador_documento (string)
- descricao (text)
- codigo_servico (string)
- status (enum: 'issued', 'cancelled')
- data_emissao (date)
- created_at (timestamp)
```

#### 4. gps_emissions
```sql
- id (UUID, PK)
- user_id (UUID, FK)
- competencia (string) -- MM/YYYY
- valor (decimal)
- codigo_pagamento (string)
- tipo_contribuinte (string)
- status (enum: 'issued', 'paid', 'cancelled')
- data_vencimento (date)
- created_at (timestamp)
```

#### 5. certificates
```sql
- id (UUID, PK)
- user_id (UUID, FK)
- enrollment (string) -- matrícula
- status (enum: 'pending', 'active', 'expired')
- valid_from (date)
- valid_until (date)
- certificate_data (encrypted)
- created_at (timestamp)
```

#### 6. partners
```sql
- id (UUID, PK)
- user_id (UUID, FK)
- company_name (string)
- cnpj (string)
- crc (string)
- responsible_name (string)
- commission_rate (decimal) -- padrão 0.30 (30%)
- created_at (timestamp)
```

#### 7. partner_clients
```sql
- id (UUID, PK)
- partner_id (UUID, FK)
- client_id (UUID, FK)
- created_at (timestamp)
```

---

## 🔄 Integrações

### 1. WhatsApp + IA
```
Usuário envia mensagem
  ↓
Webhook recebe mensagem
  ↓
IA processa intenção
  ├─ Emitir nota
  ├─ Emitir GPS
  ├─ Consultar status
  └─ Suporte
  ↓
Sistema executa ação
  ↓
Resposta via WhatsApp
```

### 2. Receita Federal (CNPJ)
```
Usuário informa CNPJ
  ↓
API consulta Receita Federal
  ↓
Retorna dados da empresa:
  ├─ Razão social
  ├─ Nome fantasia
  ├─ Endereço
  ├─ CNAE
  └─ Situação cadastral
  ↓
Preenche formulário automaticamente
```

### 3. Prefeitura (NFS-e)
```
Usuário solicita emissão
  ↓
Sistema valida dados
  ↓
Envia para API da Prefeitura
  ↓
Prefeitura processa
  ↓
Retorna número da nota
  ↓
Sistema armazena e notifica usuário
```

---

## 🎯 Jornadas Completas

### Jornada MEI Completa
```
1. Acessa homepage
2. Clica "Começar agora"
3. Escolhe "Sou MEI"
4. Preenche cadastro (CNPJ busca automática)
5. Aceita contrato
6. Paga R$ 150,00 via Stripe
7. Aguarda aprovação do onboarding
8. Recebe notificação de aprovação
9. Acessa dashboard
10. Solicita certificado digital
11. Aguarda emissão do certificado
12. Emite primeira NFS-e (paga R$ 3,00)
13. Cliente recebe nota por email
14. Visualiza histórico no dashboard
```

### Jornada Autônomo Completa
```
1. Acessa homepage
2. Clica "Começar agora"
3. Escolhe "Sou Autônomo"
4. Preenche cadastro com CPF
5. Aceita contrato
6. Paga R$ 150,00 via Stripe
7. Aguarda aprovação do onboarding
8. Acessa dashboard
9. Emite primeira GPS (paga 6% do valor)
10. Recebe guia para pagamento
11. Visualiza histórico no dashboard
```

### Jornada Parceiro Completa
```
1. Acessa homepage
2. Clica "Começar agora"
3. Escolhe "Sou Parceiro"
4. Preenche cadastro da contabilidade
5. Aguarda aprovação administrativa
6. Recebe aprovação
7. Acessa dashboard parceiro
8. Gera link de convite
9. Compartilha com clientes
10. Clientes se cadastram pelo link
11. Clientes emitem notas/guias
12. Parceiro recebe comissões (30%)
13. Visualiza relatório de comissões
```

### Jornada Admin Completa
```
1. Acessa /admin/login
2. Faz login com credenciais admin
3. Visualiza dashboard global
4. Aprova novos cadastros (onboarding)
5. Gerencia certificados digitais
6. Monitora emissões de NFS-e e GPS
7. Aprova novos parceiros
8. Gera relatórios gerenciais
9. Configura parâmetros do sistema
10. Monitora logs de atividade
```

---

## 🔒 Segurança

### Criptografia
- **Dados sensíveis criptografados:**
  - CPF/CNPJ
  - PIS/NIT
  - Certificados digitais
  - Senhas (hash bcrypt)

### Autenticação
- Supabase Auth (JWT)
- Sessões seguras
- 2FA opcional
- Rate limiting

### Autorização
- Role-based access control (RBAC)
- Verificação de user_type em cada rota
- Políticas RLS no Supabase

---

## 📱 Responsividade

Todos os dashboards são responsivos:
- **Desktop**: Layout completo com sidebar
- **Tablet**: Layout adaptado
- **Mobile**: Menu hambúrguer, cards empilhados

---

## 🎨 Tecnologias Utilizadas

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Pagamentos**: Stripe
- **IA**: OpenAI GPT (via WhatsApp)
- **Mensageria**: WhatsApp Business API
- **Certificados**: Integração com AC (Autoridade Certificadora)
- **NFS-e**: API da Prefeitura Municipal

---

## 📈 Métricas e KPIs

### Para Usuários
- Tempo médio de emissão: 3 minutos
- Taxa de sucesso: 99.5%
- Economia de tempo: 80% vs processo manual

### Para Parceiros
- Comissão média por cliente: R$ 15/mês
- Taxa de conversão de convites: 65%
- Retenção de clientes: 92%

### Para Admin
- Total de usuários ativos
- Receita mensal recorrente (MRR)
- Custo de aquisição de cliente (CAC)
- Lifetime value (LTV)
- Churn rate

---

## 🚦 Estados e Status

### Status de Usuário
- **Cadastrado**: Registro criado
- **Pagamento Pendente**: Aguardando pagamento
- **Onboarding Pendente**: Aguardando aprovação
- **Ativo**: Pode usar todas as funcionalidades
- **Suspenso**: Acesso temporariamente bloqueado
- **Inativo**: Conta desativada

### Status de Certificado
- **Pendente**: Solicitação não iniciada
- **Em Processo**: Documentação em análise
- **Ativo**: Certificado válido
- **Expirando**: Menos de 30 dias para vencer
- **Expirado**: Necessita renovação

### Status de Emissão
- **Rascunho**: Não enviada
- **Processando**: Enviada para API
- **Emitida**: Sucesso
- **Cancelada**: Cancelada pelo usuário
- **Erro**: Falha na emissão

---

Este documento descreve o fluxo completo do aplicativo GuiasMEI, desde a entrada do usuário até as funcionalidades avançadas de cada tipo de perfil.
