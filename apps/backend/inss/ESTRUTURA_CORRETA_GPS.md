# ✅ ESTRUTURA CORRETA GPS - BASEADA NOS PDFs OFICIAIS

## NIT: 128.00186.72-2 | Competência: 11/2025

### Código 1163 - R$ 166,98
```
Linha digitável: 85820000001-5 66980270116-2 30001280018-9 67222025113-0

Reconstruindo código de barras (removendo DVs):
Campo 1: 85820000001  (11 dígitos)
Campo 2: 66980270116  (11 dígitos)
Campo 3: 30001280018  (11 dígitos)
Campo 4: 67222025113  (11 dígitos)
TOTAL: 44 dígitos

Código de barras: 858200000016698027011630001280018672220251113
                  │││││││││││││││││││││││││││││││││││││││││││││
                  858 2 00000016698 0270 1163 0001 2800186722 2025113
                  │││ │ │││││││││││ ││││ ││││ ││││ ││││││││││ │││││││
                  │││ │ Valor       GPS  Cód  GPS  NIT        Comp
                  ││Seg │
                  │Prod DV
```

Espera! Está faltando um dígito. Vou contar novamente...

## 🔍 CONTAGEM CORRETA

### Linha Digitável (SEM hífens e DVs):
```
858200000016698027011630001280018 672220251113
└─11─┘└─11─┘└─11─┘└─11─┘
858200000016698027011630001280018 → 27 dígitos
67222025113 → 11 dígitos (FALTAM 6)

TOTAL SEM DVs: 38 dígitos???
```

Algo está errado. Deixe-me recontar os campos:

### Código 1163 - Campos Separados:
```
Campo 1: 85820000001 - DV: 5  (11 + 1 = 12)
Campo 2: 66980270116 - DV: 2  (11 + 1 = 12)
Campo 3: 30001280018 - DV: 9  (11 + 1 = 12)
Campo 4: 67222025113 - DV: 0  (11 + 1 = 12)

TOTAL Linha: 48 dígitos (11×4 + 4 DVs)
```

### Código de Barras (44 dígitos):
```
Juntando os 4 campos (SEM DVs):
85820000001 + 66980270116 + 30001280018 + 67222025113 = 44 dígitos
858200000016698027011630001280018672220251113
```

Hmm, mas o NIT é `128.00186.72-2` = `12800186722` (11 dígitos)

E na linha aparece: `...280018...`

Ah! O NIT **perdeu os primeiros 3 dígitos**: `128` foi removido!

Deixe-me analisar corretamente agora...

## ✅ ESTRUTURA REAL DESCOBERTA

### NIT Completo: 128001867222 (11 dígitos com DV)
### NIT no Código: 2800186722 (10 dígitos - removeu "1" do início)

Espera, olhando o PDF:
- Campo 3: `30001280018-9`
- Campo 4: `67222025113-0`

Se juntar: `...1280018` + `6722...` = `12800186722` ✅

**EUREKA!** O NIT está dividido entre os campos 3 e 4!

## 🎯 ESTRUTURA FINAL CORRETA

```
Pos 1-3:   858           (Produto 8, Segmento 5, ID Valor 8)
Pos 4:     2             (DV Geral)
Pos 5-15:  00000016698   (Valor em centavos, 11 dígitos)
Pos 16-19: 0270          (Campo fixo GPS)
Pos 20-23: 1163          (Código de pagamento)
Pos 24-27: 0001          (Campo fixo GPS)
Pos 28-38: 28001867     (NIT parte 1 - 7 dígitos)
Pos 39-44: 222025113     (NIT parte 2 + Competência - 6 dígitos???)

TOTAL: 44 dígitos
```

Não fecha! Deixe-me analisar campo por campo da linha digitável...
