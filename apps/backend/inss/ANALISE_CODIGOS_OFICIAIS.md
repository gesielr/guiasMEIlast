# 🔍 ANÁLISE DOS CÓDIGOS GPS OFICIAIS DA RECEITA FEDERAL

## Dados Extraídos dos PDFs Oficiais

Todos os códigos são para:
- **NIT:** 128.00186.72-2
- **Competência:** 11/2025
- **Vencimento:** 15/12/2025

### Código 1163 - R$ 166,98:
```
Linha: 85820000001-5 66980270116-2 30001280018-9 67222025113-0
       858 2 0000001669802701163000128001867222025113
```

### Código 1007 - R$ 303,60:
```
Linha: 85810000003-0 03600270100-7 70001280018-4 67222025113-0
       858 1 0000003036002701007000128001867222025113
```

### Código 1120 - R$ 166,98:
```
Linha: 85800000001-1 66980270112-0 00001280018-0 67222025113-0
       858 0 0000001669802701120000128001867222025113
```

### Código 1236 - R$ 166,98:
```
Linha: 85870000001-4 66980270123-5 60001280018-8 67222025113-0
       858 7 0000001669802701236000128001867222025113
```

### Código 1287 - R$ 303,60:
```
Linha: 85870000003-0 03600270128-7 70001280018-4 67222025113-0
       858 7 0000003036002701287000128001867222025113
```

### Código 1805 - R$ 166,98:
```
Linha: 85860000001-2 66980270180-4 50001280018-1 67222025113-0
       858 6 0000001669802701805000128001867222025113
```

## ❌ ERRO NA LÓGICA ATUAL

Nossa lógica atual usa ID Valor baseado apenas na **faixa do valor**:
```python
if valor_centavos < 1000:
    id_valor = "6"
elif valor_centavos < 10000:
    id_valor = "7"
elif valor_centavos < 100000:
    id_valor = "8"
else:
    id_valor = "9"
```

## ✅ PADRÃO CORRETO DESCOBERTO

O ID Valor (posição 3) é calculado com base no **CÓDIGO DE PAGAMENTO**!

### Fórmula Descoberta:

```python
# Soma dos dígitos do código de pagamento % 10
id_valor = str(sum(int(d) for d in codigo_pagamento) % 10)
```

### Verificação:

| Código | Soma | % 10 | ID | ✓ |
|--------|------|------|-------|---|
| 1007 | 1+0+0+7 = 8 | 8 % 10 = **8** | Mas é **1**! | ❌ |
| 1120 | 1+1+2+0 = 4 | 4 % 10 = **4** | Mas é **0**! | ❌ |

**Não é soma simples!**

### Segunda Tentativa - Módulo 10 do código:

| Código | % 10 | ID Real |
|--------|------|---------|
| 1007 | 7 | 1 |
| 1120 | 0 | 0 | ✅ |
| 1163 | 3 | 2 |
| 1236 | 6 | 7 |
| 1287 | 7 | 7 | ✅ |
| 1805 | 5 | 6 |

**Não é módulo simples!**

### Terceira Tentativa - Dígito Verificador Módulo 10:

Vou calcular o DV do código de pagamento:

**Código 1007:**
- Da direita: 7, 0, 0, 1
- Multiplicadores: 2, 1, 2, 1
- 7×2=14 → 1+4=5
- 0×1=0
- 0×2=0
- 1×1=1
- Soma: 5+0+0+1 = 6
- DV: 10-6 = 4... Mas ID é **1**! ❌

## 🔍 PADRÃO REAL - ANÁLISE VISUAL

Observando os terceiros campos da linha digitável:

| Código | Campo 3 | Primeiro dígito do Campo 3 |
|--------|---------|----------------------------|
| 1007 | 70001280018 | **7** |
| 1120 | 00001280018 | **0** |
| 1163 | 30001280018 | **3** |
| 1236 | 60001280018 | **6** |
| 1287 | 70001280018 | **7** |
| 1805 | 50001280018 | **5** |

E comparando com posição 3:

| Código | Pos 3 | Campo 3[0] | Relação |
|--------|-------|------------|---------|
| 1007 | 1 | 7 | |
| 1120 | 0 | 0 | ✅ IGUAL! |
| 1163 | 2 | 3 | |
| 1236 | 7 | 6 | |
| 1287 | 7 | 7 | ✅ IGUAL! |
| 1805 | 6 | 5 | |

**NÃO é o mesmo dígito sempre!**

## 💡 DESCOBERTA FINAL!

Olhando a estrutura completa do código de barras reconstruído:

```
858[ID]VVVVVVVVVVV0270CCCC0001NNNNNNNNNN20251113
   └── Este dígito!
```

O Campo 3 da linha digitável é formado por parte do código:

Campo 3 começa na posição 22 do código de barras (após DV):
- Posição 22-32: últimos dígitos do valor + início do NIT

**EUREKA!** O ID na posição 3 é o **DV GERAL** calculado com Módulo 11!

Vou verificar recalculando o DV para cada código sem o DV...
