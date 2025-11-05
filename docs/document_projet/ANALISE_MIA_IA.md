# 📋 Análise do MIA (Mapear, Implementar, Aperfeiçoar) da IA

## 🔍 Arquivos Encontrados

### 1. **Python - INSS Agent** (`apps/backend/inss/app/services/ai_agent.py`)
- ✅ Tem conhecimento básico sobre SAL
- ❌ **ERROS ENCONTRADOS**:
  - Código 1163: Informa R$166,98 (ERRADO) → Deveria ser R$155,32 (11% de R$1.412)
  - Código 1007: Informa "R$1.518 e R$8.157,41" (ERRADO) → Deveria ser "R$1.412,00 a R$7.786,02"
  - Falta informação sobre código 1120 (11% mensal) e 1147 (11% trimestral)

### 2. **Python - System Prompts** (`apps/backend/inss/app/agents/prompts/system_prompts.py`)
- ✅ Tem prompts detalhados e completos
- ✅ Tem regras fundamentais sobre o que a IA pode/não pode fazer
- ✅ Tem conhecimento sobre GPS e INSS
- ⚠️ **FALTA**: Conhecimento específico sobre SAL (Sistema de Acréscimos Legais) detalhado
- ⚠️ **FALTA**: Informação sobre limite de retrocesso (6 meses) mencionado no FLUXO_APLICATIVO.md

### 3. **TypeScript - WhatsApp Agent** (`apps/backend/src/services/ai/ai-agent.service.ts`)
- ✅ Usado no webhook do WhatsApp atual
- ❌ **FALTA COMPLETAMENTE**:
  - Conhecimento sobre SAL (Sistema de Acréscimos Legais)
  - Regras detalhadas sobre GPS e códigos
  - Informações sobre complementação
  - Regras sobre o que a IA pode ou não fazer
  - Limite de retrocesso de 6 meses

## 📊 Comparação: O que está faltando

| Conhecimento | Python (INSS) | Python (Prompts) | TypeScript (WhatsApp) |
|--------------|---------------|------------------|----------------------|
| SAL básico | ✅ (com erros) | ❌ | ❌ |
| SAL detalhado | ❌ | ❌ | ❌ |
| Regras IA (pode/não pode) | ❌ | ✅ | ❌ |
| Códigos GPS completos | ❌ | ✅ | ⚠️ (parcial) |
| Limite retrocesso 6 meses | ❌ | ❌ | ❌ |
| Complementação detalhada | ⚠️ (básico) | ⚠️ (básico) | ❌ |

## 🔧 Correções Necessárias

### 1. **Corrigir erros no Python** (`ai_agent.py`)

**Código atual (ERRADO):**
```python
- Código 1163: 11% sobre salário mínimo (R$166,98 em 2025)
- Código 1007: 20% sobre valor entre R$1.518 e R$8.157,41
```

**Código correto:**
```python
- Código 1163: 11% sobre salário mínimo = R$155,32 (R$1.412 × 11%)
- Código 1007: 20% sobre valor entre R$1.412,00 e R$7.786,02
```

### 2. **Adicionar conhecimento SAL completo no TypeScript**

O serviço TypeScript usado no WhatsApp precisa incluir:

```typescript
SISTEMA SAL (Sistema de Acréscimos Legais):

1. CONTRIBUINTE INDIVIDUAL (Autônomo):
   - Código 1007: 20% sobre valor entre R$1.412,00 e R$7.786,02 (mensal)
   - Código 1104: 20% sobre valor entre R$1.412,00 e R$7.786,02 (trimestral)
   - Código 1120: 11% sobre salário mínimo = R$155,32 (mensal)
   - Código 1147: 11% sobre salário mínimo = R$155,32 (trimestral)
   - Código 1163: Alternativo para 11% (consultar normativa)
   - Plano 11% NÃO dá direito a aposentadoria por tempo de contribuição
   - Plano 20% dá direito a TODOS os benefícios (incluindo aposentadoria por tempo)

2. PRODUTOR RURAL:
   - Código 1503: 20% sobre valor declarado
   - Segurado especial: 1,3% sobre receita bruta

3. EMPREGADO DOMÉSTICO:
   - Tabela progressiva de 7,5% a 14%
   - Empregador também contribui

4. FACULTATIVO:
   - Código 1406: Mensal
   - Código 1457: Trimestral
   - Código 1473: Mensal (11%)

5. COMPLEMENTAÇÃO:
   - Código 1295: Para quem pagou 11% e quer complementar para 20%
   - Incide juros SELIC sobre valores em atraso
   - Permite retroceder até 6 meses (conforme FLUXO_APLICATIVO.md)

REGRAS IMPORTANTES:
- Valor base NUNCA pode ser inferior ao salário mínimo (R$1.412,00)
- Retrocesso máximo permitido: 6 meses
- Pagamentos atrasados: multa + juros SELIC
- Mensal: vencimento dia 15 do mês seguinte
- Trimestral: vencimento dia 15 do mês seguinte ao trimestre
```

### 3. **Adicionar regras sobre o que a IA pode/não pode fazer**

```typescript
REGRAS FUNDAMENTAIS - O QUE A IA PODE FAZER:

✅ PODE:
- Orientar sobre processos e fluxos
- Calcular valores de GPS e taxas
- Explicar diferenças entre planos (11% vs 20%)
- Informar sobre prazos e vencimentos
- Consultar histórico do usuário (se autorizado)
- Gerar relatórios de notas/guias
- Enviar PDFs de documentos já emitidos
- Responder perguntas sobre certificado digital
- Orientar sobre complementação

❌ NÃO PODE:
- Emitir documentos sem confirmação explícita do usuário
- Processar pagamentos sem validação
- Acessar dados de outros usuários
- Modificar valores de guias/documentos já emitidos
- Inventar informações não verificadas
- Prometer funcionalidades não implementadas
- Armazenar senhas ou dados bancários
- Fazer alterações em cadastros sem confirmação
```

## 📝 Plano de Correção

1. ✅ Corrigir valores errados no `ai_agent.py` (Python)
2. ✅ Adicionar conhecimento SAL completo no `ai-agent.service.ts` (TypeScript)
3. ✅ Adicionar regras sobre o que a IA pode/não pode fazer
4. ✅ Adicionar limite de retrocesso de 6 meses
5. ✅ Sincronizar informações entre Python e TypeScript
6. ✅ Adicionar informações sobre todos os códigos GPS

## ✅ Correções Realizadas

### 1. ✅ Corrigido `apps/backend/inss/app/services/ai_agent.py`
- Corrigido valor do código 1163: R$166,98 → R$155,32
- Corrigido valores do código 1007: R$1.518-8.157 → R$1.412,00-7.786,02
- Adicionados códigos 1104, 1120, 1147, 1406, 1457, 1473
- Adicionada informação sobre limite de retrocesso (6 meses)
- Adicionadas regras gerais (vencimentos, juros, etc)

### 2. ✅ Atualizado `apps/backend/src/services/ai/ai-agent.service.ts`
- Adicionado conhecimento completo sobre SAL
- Adicionados todos os códigos GPS disponíveis
- Adicionadas regras sobre o que a IA pode/não pode fazer
- Adicionado limite de retrocesso de 6 meses
- Adicionadas informações sobre planos (11% vs 20%)
- Adicionadas regras sobre vencimentos e juros

## 🎯 Próximos Passos

1. ✅ ~~Corrigir `apps/backend/inss/app/services/ai_agent.py`~~ **CONCLUÍDO**
2. ✅ ~~Atualizar `apps/backend/src/services/ai/ai-agent.service.ts` com conhecimento completo~~ **CONCLUÍDO**
3. ⏳ Testar se a IA está respondendo corretamente sobre SAL
4. ⏳ Validar se as regras estão sendo seguidas

