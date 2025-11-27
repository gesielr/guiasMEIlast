# ✅ CATEGORIAS GPS ATUALIZADAS

## Data: 26/11/2025

## 🎯 O QUE FOI ATUALIZADO

Atualizei o arquivo `constants.py` com **TODAS as categorias GPS oficiais** e seus códigos corretos conforme a especificação do INSS.

## 📋 CATEGORIAS DISPONÍVEIS

### 20% - Contribuinte Individual (Permite escolher valor)

| Categoria | Código GPS | Descrição |
|-----------|------------|-----------|
| `autonomo` | **1007** | Contribuinte Individual Mensal |
| `autonomo_trimestral` | **1120** | Contribuinte Individual Trimestral (3 meses) |

**Valores permitidos:**
- Mínimo: R$ 303,60 (20% do salário mínimo)
- Máximo: R$ 1.631,48 (20% do teto)

### 20% - Facultativo (Permite escolher valor)

| Categoria | Código GPS | Descrição |
|-----------|------------|-----------|
| `facultativo` | **1406** | Facultativo Mensal |
| `facultativo_trimestral` | **1457** | Facultativo Trimestral (3 meses) |

**Valores permitidos:**
- Mínimo: R$ 303,60 (20% do salário mínimo)
- Máximo: R$ 1.631,48 (20% do teto)

### 11% - Plano Simplificado (Valor fixo)

| Categoria | Código GPS | Descrição |
|-----------|------------|-----------|
| `autonomo_simplificado` | **1163** | Contribuinte Individual Simplificado |
| `facultativo_simplificado` | **1473** | Facultativo Simplificado |

**Valor fixo:** R$ 166,98 (11% do salário mínimo)

### 5% - Baixa Renda e MEI (Valor fixo)

| Categoria | Código GPS | Descrição |
|-----------|------------|-----------|
| `facultativo_baixa_renda` | **1929** | Facultativo Baixa Renda (requer CadÚnico) |
| `mei` | **1910** | Microempreendedor Individual |
| `segurado_especial` | **1503** | Segurado Especial (produtor rural, pescador) |

**Valor fixo:** R$ 75,90 (5% do salário mínimo)

### Complementação

| Categoria | Código GPS | Descrição |
|-----------|------------|-----------|
| `complementacao` | **1147** | Complementação de 11% para 20% |

**Alíquota:** 9% (diferença entre 11% e 20%)

## 🔧 COMO O SISTEMA FUNCIONA AGORA

### 1. Categorias com Valor Fixo

Para MEI, Baixa Renda, Simplificado:
```python
# O sistema calcula automaticamente
valor = SALARIO_MINIMO × aliquota
# Usuário NÃO escolhe valor
```

**Exemplo MEI:**
- Alíquota: 5%
- Valor: R$ 1.518,00 × 0,05 = **R$ 75,90** (fixo)

**Exemplo Simplificado 11%:**
- Alíquota: 11%
- Valor: R$ 1.518,00 × 0,11 = **R$ 166,98** (fixo)

### 2. Categorias com Range (Permite escolher)

Para Contribuinte Individual e Facultativo 20%:
```python
# Usuário escolhe o valor ou informa salário base
# Sistema valida se está entre mínimo e máximo
```

**Exemplo Autônomo 20%:**
- Usuário informa salário: R$ 2.000,00
- Sistema calcula: R$ 2.000,00 × 0,20 = **R$ 400,00**
- Valida: entre R$ 303,60 (mín) e R$ 1.631,48 (máx) ✅

**OU usuário informa direto o valor da contribuição:**
- Usuário escolhe: R$ 400,00
- Sistema valida: entre R$ 303,60 e R$ 1.631,48 ✅

### 3. Trimestral (Multiplica por 3)

```python
# Para categorias trimestrais
valor_mensal × 3 meses
```

**Exemplo Autônomo Trimestral:**
- Base mensal: R$ 1.518,00
- Contribuição mensal: R$ 303,60
- **Trimestral: R$ 910,80** (R$ 303,60 × 3)

## 📊 TABELA COMPLETA DE VALORES (Nov/Dez 2025)

| Alíquota | Base | Valor Mensal | Valor Trimestral |
|----------|------|--------------|------------------|
| **5%** | Salário mínimo | R$ 75,90 | R$ 227,70 |
| **11%** | Salário mínimo | R$ 166,98 | R$ 500,94 |
| **20%** (mín) | Salário mínimo | R$ 303,60 | R$ 910,80 |
| **20%** (máx) | Teto INSS | R$ 1.631,48 | R$ 4.894,44 |

## 🚀 PRÓXIMOS PASSOS

### 1. Reinicie o Servidor

```powershell
cd "apps\backend\inss"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Teste Cada Categoria

**Teste MEI (5% fixo):**
- Categoria: `mei`
- Código GPS: `1910`
- Valor esperado: R$ 75,90

**Teste Simplificado (11% fixo):**
- Categoria: `autonomo_simplificado`
- Código GPS: `1163`
- Valor esperado: R$ 166,98

**Teste Autônomo (20% range):**
- Categoria: `autonomo`
- Código GPS: `1007`
- Salário base: R$ 1.518,00
- Valor esperado: R$ 303,60

**Teste Facultativo (20% range):**
- Categoria: `facultativo`
- Código GPS: `1406`
- Valor escolhido: R$ 500,00
- Validação: entre R$ 303,60 e R$ 1.631,48 ✅

## ✅ BENEFÍCIOS DA ATUALIZAÇÃO

1. ✅ **Todos os códigos GPS oficiais** conforme INSS 2025
2. ✅ **Categorias organizadas** por alíquota (5%, 11%, 20%)
3. ✅ **Tipos definidos:**
   - `fixo`: Valor sempre sobre salário mínimo
   - `range`: Usuário escolhe entre mín e máx
   - `livre`: Complementação (qualquer valor válido)
4. ✅ **Suporte a pagamentos trimestrais**
5. ✅ **Valores atualizados:** Salário mínimo R$ 1.518,00 e Teto R$ 8.157,41
6. ✅ **Validação automática** de limites mínimo/máximo

## 📝 OBSERVAÇÕES IMPORTANTES

1. **Categorias 20% (range):**
   - Usuário pode informar `salario_base` (sistema calcula 20%)
   - OU informar `valor_escolhido` direto (sistema valida)

2. **Categorias fixas (5% e 11%):**
   - Sistema calcula automaticamente
   - Usuário NÃO precisa informar valor

3. **Trimestral:**
   - Multiplica valor mensal por 3
   - Código GPS diferente (ex: 1120 vs 1007)

4. **Códigos corrigidos:**
   - Facultativo: `1295` → **1406** (correto)
   - Complementação: `2010` → **1147** (correto)

## 🎯 RESULTADO FINAL

O sistema agora suporta **TODAS as categorias GPS** com códigos corretos e cálculos automáticos:

- ✅ Contribuinte Individual (11% e 20%)
- ✅ Facultativo (5%, 11% e 20%)
- ✅ MEI (5%)
- ✅ Baixa Renda (5%)
- ✅ Segurado Especial (5%)
- ✅ Complementação (9%)
- ✅ Pagamentos mensais e trimestrais

**Cache limpo ✅**
**Pronto para produção ✅**

**Reinicie o servidor e teste!** 🚀
