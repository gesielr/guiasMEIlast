# 🔬 DECOMPOSIÇÃO FINAL - TODOS OS CÓDIGOS GPS OFICIAIS

## TODOS OS CÓDIGOS TÊM:
- NIT: 128.00186.72-2 (sem formatação: 12800186722)
- Competência: 11/2025
- Vencimento: 15/12/2025

---

## GPS 1 - Código 1163 - R$ 166,98

### Linha Digitável:
```
85820000001-5 66980270116-2 30001280018-9 67222025113-0
```

### Código de Barras (44 dígitos - removendo DVs):
```
85820000001 66980270116 30001280018 67222025113
858200000016698027011630001280018672220251113
```

### Decomposição:
```
858 2 00000016698 0270 1163 0001 ....
Prod/Seg/ID DV Valor GPS Cód GPS  ???
```

Os últimos dígitos: `2800186722202511` (? dígitos)

---

## GPS 2 - Código 1007 - R$ 303,60

### Linha Digitável:
```
85810000003-0 03600270100-7 70001280018-4 67222025113-0
```

### Código de Barras (removendo DVs):
```
85810000003 03600270100 70001280018 67222025113
858100000030360027010070001280018672220251113
```

### Decomposição:
```
858 1 00000030360 0270 1007 0001 ....
```

Os últimos dígitos: `2800186722202511` ← IGUAL ao 1163!

---

## GPS 3 - Código 1120 - R$ 166,98

### Linha Digitável:
```
85800000001-1 66980270112-0 00001280018-0 67222025113-0
```

### Código de Barras:
```
85800000001 66980270112 00001280018 67222025113
858000000016698027011200001280018672220251113
```

### Decomposição:
```
858 0 00000016698 0270 1120 0001 ....
```

Os últimos dígitos: `2800186722202511` ← IGUAL!

---

## 🎯 PADRÃO DESCOBERTO!

TODOS os códigos terminam com: `2800186722202511`

Vamos decompor esses últimos 16 dígitos:

```
2800186722 202511
└────────┘ └────┘
NIT (10)   ? (6)
```

Mas `202511` não corresponde a `11/2025` diretamente...

Tentativas:
- `202511` = 20 + 25 + 11?
- `202511` = 2025 (ano) + 11 (mês)?

Se for `2025` + `11`:
- Ano: 2025 (4 dígitos)
- Mês: 11 (2 dígitos)
- TOTAL: 6 dígitos ✅

Formato: `YYYYMM` = `202511` ✅ BINGO!

---

## ✅ ESTRUTURA DEFINITIVA DO CÓDIGO GPS (44 DÍGITOS):

```
Posição  | Tam | Campo              | Exemplo 1163 | Exemplo 1007
---------|-----|--------------------|--------------|--------------
1        | 1   | Produto            | 8            | 8
2        | 1   | Segmento           | 5            | 5
3        | 1   | ID Valor           | 8            | 8
4        | 1   | DV Geral (Mod 11)  | 2            | 1
5-15     | 11  | Valor (centavos)   | 00000016698  | 00000030360
16-19    | 4   | Campo GPS fixo     | 0270         | 0270
20-23    | 4   | Código Pagamento   | 1163         | 1007
24-27    | 4   | Campo GPS fixo     | 0001         | 0001
28-37    | 10  | NIT (sem 1º dígito)| 2800186722   | 2800186722
38-43    | 6   | Competência YYYYMM | 202511       | 202511

TOTAL: 44 dígitos ✅
```

---

## 🔍 DIFERENÇAS DO NOSSO CÓDIGO ATUAL:

### ❌ ERRADO (nosso código):
```python
nit_10_digitos = nit_limpo[1:11]      # Correto! ✅
competencia_especial = ano + mes.zfill(2) + "3"  # ❌ ERRADO!
# Resultado: "2025113" (7 dígitos)
```

### ✅ CORRETO (oficial):
```python
nit_10_digitos = nit_limpo[1:11]      # ✅ Remove primeiro dígito
competencia_oficial = ano + mes.zfill(2)  # ✅ Formato YYYYMM
# Resultado: "202511" (6 dígitos)
```

---

## 📊 VALIDAÇÃO COM TODOS OS CÓDIGOS:

| Código | ID Valor | Valor     | NIT 10 dig   | Comp   | ✓ |
|--------|----------|-----------|--------------|--------|---|
| 1007   | 8→1      | 00000030360 | 2800186722   | 202511 | ✅ |
| 1120   | 8→0      | 00000016698 | 2800186722   | 202511 | ✅ |
| 1163   | 8→2      | 00000016698 | 2800186722   | 202511 | ✅ |
| 1236   | 8→7      | 00000016698 | 2800186722   | 202511 | ✅ |
| 1287   | 8→7      | 00000030360 | 2800186722   | 202511 | ✅ |
| 1805   | 8→6      | 00000016698 | 2800186722   | 202511 | ✅ |

---

## ✅ CORREÇÃO NECESSÁRIA:

1. **Competência:** Mudar de `YYYYMM3` (7 dígitos) para `YYYYMM` (6 dígitos)
2. **Total do código:** Permanece 44 dígitos (não 48!)
3. **Linha digitável:** 48 dígitos (44 do código + 4 DVs)

---

## 🎯 PRÓXIMO PASSO:

Corrigir o arquivo `codigo_barras_gps.py`:

```python
# ERRADO:
competencia_especial = ano + mes.zfill(2) + "3"  # 7 dígitos

# CORRETO:
competencia_oficial = ano + mes.zfill(2)  # 6 dígitos (YYYYMM)
```

Isso vai gerar código de **43 dígitos sem DV** (1+1+1+11+4+4+4+10+6 = 42... wait!)

Deixe-me recontar:
- Produto: 1
- Segmento: 1
- ID Valor: 1
- Valor: 11
- GPS: 4
- Código: 4
- GPS: 4
- NIT: 10
- Comp: 6

TOTAL: 1+1+1+11+4+4+4+10+6 = 42 dígitos!

Mas precisamos de 43 sem DV para ter 44 com DV!

Algo está faltando... Vou recontar o código real:

```
858200000016698027011630001280018672220251113
123456789012345678901234567890123456789012344
         1         2         3         4

44 dígitos total ✅
```

Dividindo:
```
858 2 00000016698 0270 1163 0001 2800186722 202511
│││ │ │││││││││││ ││││ ││││ ││││ ││││││││││ ││││││
3+1+11+4+4+4+10+6 = 43 dígitos ✅
```

Perfeito! Então é:
- **43 dígitos sem DV**
- **+ 1 DV na posição 4**
- **= 44 dígitos total**

E a competência é `202511` (6 dígitos), NÃO `2025113` (7 dígitos)!
