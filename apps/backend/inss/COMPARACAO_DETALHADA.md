# 🔬 COMPARAÇÃO DETALHADA - CÓDIGO 1163 vs 1007

## Dados Idênticos:
- NIT: 128.00186.72-2
- Competência: 11/2025

## Código 1163 - R$ 166,98:
```
Linha: 85820000001-5 66980270116-2 30001280018-9 67222025113-0
Sem DVs: 85820000001 + 66980270116 + 30001280018 + 67222025113
Código: 858200000016698027011630001280018672220251113
```

## Código 1007 - R$ 303,60:
```
Linha: 85810000003-0 03600270100-7 70001280018-4 67222025113-0
Sem DVs: 85810000003 + 03600270100 + 70001280018 + 67222025113
Código: 858100000030360027010070001280018672220251113
```

## 📊 COMPARAÇÃO POSIÇÃO POR POSIÇÃO:

```
Pos  | 1163      | 1007      | Diferença
-----|-----------|-----------|------------------
1-3  | 858       | 858       | ✅ Igual
4    | 2         | 1         | ❌ Diferente (DV!)
5-15 | 00000016698 | 00000030360 | ❌ Valor diferente
16-19| 0270      | 0270      | ✅ Igual
20-23| 1163      | 1007      | ❌ Código diferente
24-27| 0001      | 0001      | ✅ Igual
28-38| 28001867222 | 28001867222 | ✅ Igual (NIT!)
39-44| 025113    | 025113    | ✅ Igual (Comp!)
```

Espera! Pos 28-38 tem 11 dígitos, mas NIT tem 11...

Deixe-me recontar:

```
858200000016698027011630001280018672220251113
123456789012345678901234567890123456789012344
         1         2         3         4

Pos 1-3:   858
Pos 4:     2
Pos 5-15:  00000016698 (11 dígitos) ✅
Pos 16-19: 0270 (4 dígitos) ✅
Pos 20-23: 1163 (4 dígitos) ✅
Pos 24-27: 0001 (4 dígitos) ✅
Pos 28-38: 28001867222 (11 dígitos!)
Pos 39-44: 025113 (6 dígitos!)

Total: 3+1+11+4+4+4+11+6 = 44 ✅
```

## 🎯 ESTRUTURA CORRETA FINAL:

```
Posição  | Tamanho | Campo              | Ex 1163      | Ex 1007
---------|---------|-------------------|--------------|-------------
1        | 1       | Produto           | 8            | 8
2        | 1       | Segmento          | 5            | 5
3        | 1       | ID Valor          | 8            | 8
4        | 1       | DV Geral (Mod 11) | 2            | 1
5-15     | 11      | Valor (centavos)  | 00000016698  | 00000030360
16-19    | 4       | Campo GPS         | 0270         | 0270
20-23    | 4       | Código Pagamento  | 1163         | 1007
24-27    | 4       | Campo GPS         | 0001         | 0001
28-38    | 11      | NIT completo!     | 28001867222  | 28001867222
39-44    | 6       | Competência       | 025113       | 025113

TOTAL: 44 dígitos
```

## ❌ ERRO NO NOSSO CÓDIGO!

Estávamos usando:
- NIT: 10 dígitos (removendo primeiro)
- Competência: 7 dígitos (AAAAMM3)
- Campo livre: 4 dígitos

**CORRETO É:**
- NIT: 11 dígitos COMPLETO (com DV!)
- Competência: 6 dígitos (parece ser MMAAAA ou AAMMDD?)

Mas `025113` = ?
- Se for MMAAAA: 02/5113 ❌
- Se for AAMMDD: 02/51/13 ❌
- Se for MMYY + algo: 02/51/13 ❌

Espera! Competência é 11/2025...

Se inverter: 2025/11 = `202511` + ?
Não, são só 6 dígitos: `025113`

Talvez seja: `0` + `25113`?
Ou: `02` + `5113`?

Vou olhar outro exemplo com valor diferente mas mesma competência...

## Código 1120 - R$ 166,98, mesma competência:
```
Código: 858000000016698027011200001280018672220251113
Pos 39-44: 025113 ← IGUAL!
```

## Código 1236 - R$ 166,98, mesma competência:
```
Linha: 85870000001-4 66980270123-5 60001280018-8 67222025113-0
                                                   ^^^^^^
Código: 858700000016698027012360001280018672220251113
Pos 39-44: 025113 ← IGUAL!
```

**TODOS têm `025113` na mesma posição!**

Então `025113` deve ser a competência codificada somehow...

Competência: 11/2025
- Invertido: 2025/11
- Sem separador: 202511
- Mas código tem: 025113

`025113` vs `202511`...

Talvez seja: `[0]` + `[25]` (ano) + `[11]` (mês) + `[3]` (fixo)?
= 0 + 25 + 11 + 3 = `025113` ✅ BINGO!

Mas posição 39-44 só tem 6 dígitos, não 7!

Vou contar de novo o código completo...

```
858200000016698027011630001280018672220251113
│││││││││││││││││││││││││││││││││││││││││││
858 2 00000016698 0270 1163 0001 28001867222 025113
└─┘ └ └─────────┘ └──┘ └──┘ └──┘ └─────────┘ └────┘
Prod/ DV  Valor   GPS  Cód  GPS  NIT (11)    Comp(6)
 Seg/ID
```

Mas se NIT é 128.00186.72-2 = 12800186722 (11 dígitos)
E no código aparece: 28001867222

`28001867222` tem 11 dígitos, mas deveria ser `12800186722`!

Primeiro dígito mudou de `1` para `2`! ❌

Ou... o NIT real seria `28001867222` e estou lendo errado do PDF?

Deixe-me verificar no PDF novamente...
