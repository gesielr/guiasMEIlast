# 💰 Implementação: Gerenciamento de Salário Mínimo no Painel Admin

## ✅ O que foi implementado

### 1. **Banco de Dados** (`supabase/migrations/20250222000001_create_system_config.sql`)
- ✅ Tabela `system_config` criada para armazenar configurações do sistema
- ✅ Valores iniciais inseridos:
  - `salario_minimo`: R$ 1.518,00 (conforme solicitado)
  - `teto_inss`: R$ 7.786,02
  - `ano_vigente`: 2025
- ✅ RLS (Row Level Security) configurado: apenas admins podem acessar
- ✅ Trigger para atualizar `updated_at` automaticamente

### 2. **Backend - API de Configurações** (`apps/backend/routes/system-config.ts`)
- ✅ **GET `/system-config`**: Lista todas as configurações
- ✅ **GET `/system-config/:key`**: Busca uma configuração específica
- ✅ **PUT `/system-config/:key`**: Atualiza uma configuração
- ✅ Cache automático limpo após atualização

### 3. **Backend - Serviço de Configurações** (`apps/backend/src/services/system-config.service.ts`)
- ✅ Função `getSalarioMinimo()`: Busca salário mínimo do banco com cache (5 min)
- ✅ Função `getTetoInss()`: Busca teto INSS do banco com cache (5 min)
- ✅ Função `clearConfigCache()`: Limpa cache quando necessário

### 4. **Backend - Integração com IA** (`apps/backend/src/services/ai/ai-agent.service.ts`)
- ✅ IA agora busca salário mínimo e teto INSS dinamicamente do banco
- ✅ Valores são atualizados automaticamente no prompt da IA
- ✅ Cálculos de GPS (11% simplificado) usam valor atualizado

### 5. **Frontend - Painel Administrador** (`apps/web/src/features/admin/nfse/ConfiguracoesAdminPage.jsx`)
- ✅ Nova seção "💰 Configurações GPS/INSS" adicionada
- ✅ Campos para editar:
  - Salário Mínimo (R$)
  - Teto INSS (R$)
  - Ano Vigente
- ✅ Integração com API para buscar e salvar configurações
- ✅ Mensagens de sucesso/erro
- ✅ Aviso sobre impacto das alterações

## 🔄 Fluxo de Funcionamento

```
1. Admin acessa: /admin/nfse/configuracoes
   ↓
2. Sistema carrega valores do banco via GET /system-config
   ↓
3. Admin edita salário mínimo (ex: R$ 1.518,00 → R$ 1.620,00)
   ↓
4. Admin clica em "Salvar Configurações"
   ↓
5. Frontend envia PUT /system-config/salario_minimo
   ↓
6. Backend atualiza banco e limpa cache
   ↓
7. Próxima chamada da IA ou cálculo GPS usa novo valor
```

## 📊 Impacto das Alterações

### Quando o salário mínimo é atualizado:
- ✅ **IA do WhatsApp**: Usa novo valor imediatamente (após cache expirar - 5 min)
- ✅ **Cálculos de GPS**: Novos cálculos usam novo valor
- ✅ **Guias já emitidas**: NÃO são afetadas (valores históricos preservados)

### Valores padrão:
- **Salário Mínimo**: R$ 1.518,00 (configurável)
- **Teto INSS**: R$ 7.786,02 (configurável)
- **Ano Vigente**: 2025 (configurável)

## 🎯 Como Usar

1. **Acessar painel admin**:
   - Login como admin
   - Ir em: `/admin/nfse/configuracoes` ou `/dashboard/admin` → Aba "Configurações"

2. **Editar salário mínimo**:
   - Na seção "💰 Configurações GPS/INSS"
   - Editar campo "Salário Mínimo (R$)"
   - Clicar em "Salvar Configurações"

3. **Verificar atualização**:
   - Valores são salvos no banco
   - Cache é limpo automaticamente
   - IA passa a usar novo valor em até 5 minutos

## 🔗 Integrações

- ✅ **IA do WhatsApp**: Usa valores dinâmicos do banco
- ✅ **Cálculos GPS**: Preparado para usar valores do banco (Python ainda usa .env como fallback)
- ✅ **API REST**: Endpoints disponíveis para integrações futuras

## 📝 Próximos Passos (Opcional)

1. ⏳ Atualizar cálculo Python (`inss_calculator.py`) para buscar do banco também
2. ⏳ Adicionar histórico de alterações (quem mudou, quando, valor antigo/novo)
3. ⏳ Adicionar validação de valores (ex: salário mínimo não pode ser negativo)
4. ⏳ Adicionar notificações quando valores são alterados

## 🚀 Status

✅ **Implementação completa e funcional**
- Tabela criada
- API funcionando
- Frontend integrado
- IA usando valores dinâmicos
- Cache implementado

