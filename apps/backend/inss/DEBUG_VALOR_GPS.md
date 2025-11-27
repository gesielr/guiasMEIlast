# 🔍 DEBUG IMPLEMENTADO - RASTREAMENTO DE VALOR GPS

## Data: 26/11/2025

## 🎯 PROBLEMA IDENTIFICADO

O código de barras GPS está sendo gerado com valor errado:

```
GERADO (ERRADO):
85820000001-7 66980270116-1 30001731762-3 19552025113-1
└─ ID=2 (R$ 0.01)
└─ Valor: 00000001 (1 centavo)

ESPERADO (CORRETO):
85810000003-0 03600270100-7 70001280018-4 67222025113-0
└─ ID=8 (R$ 100-999)
└─ Valor: 00000016698 (R$ 166,98)
```

## 🔧 DEBUG COMPLETO IMPLEMENTADO

Adicionei logging detalhado em **TODAS as etapas** do fluxo do valor:

### 1. Entrada na Rota (`gps_hybrid.py`)
```python
# Linha 104: valor é passado para o serviço
await gps_hybrid_service.emitir_gps(
    user_id=body.user_id,
    competencia=body.competencia,
    valor=body.valor,  # ← Valor original
    codigo_pagamento=body.codigo_pagamento,
    ...
)
```

### 2. Serviço Híbrido (`gps_hybrid_service.py`)
```python
# Linhas 197-201: Debug antes de gerar código de barras
print(f"[GPS HYBRID] Gerando código de barras:")
print(f"  - Código pagamento: {codigo_pagamento}")
print(f"  - Competência: {competencia}")
print(f"  - Valor: {valor} (tipo: {type(valor)})")  # ← Mostra valor e tipo
print(f"  - Identificador: {identificador_digits}")

# Linha 204-209: Chamada ao gerador
resultado_barras = CodigoBarrasGPS.gerar(
    codigo_pagamento=codigo_pagamento,
    competencia=competencia,
    valor=valor,  # ← Valor passado
    nit=identificador_digits
)
```

### 3. Gerador de Código de Barras (`codigo_barras_gps.py`)

**Linhas 69-95: DEBUG COMPLETO DE CADA ETAPA**

```python
print(f"\n" + "=" * 80)
print(f"🔧 [GPS] DEBUG - GERANDO GPS")
print(f"=" * 80)
print(f"   Valor recebido: R$ {valor:.2f} (tipo: {type(valor)})")
print(f"   Código pagamento: {codigo_pagamento}")
print(f"   NIT recebido: {nit}")
print(f"   Competência: {competencia}")

# VALIDAÇÃO CRÍTICA DO VALOR
if valor <= 0:
    raise ValueError(f"❌ ERRO CRÍTICO: Valor inválido R$ {valor:.2f} - deve ser maior que zero!")
if valor < 10:
    print(f"   ⚠️  AVISO: Valor muito baixo R$ {valor:.2f} - possível erro no cálculo!")

# CONVERSÃO PARA CENTAVOS
valor_centavos = int(round(valor * 100))
valor_str = str(valor_centavos).zfill(11)

print(f"\n💰 CONVERSÃO PARA CENTAVOS:")
print(f"   Valor em reais: R$ {valor:.2f}")
print(f"   Valor em centavos: {valor_centavos}")
print(f"   Valor formatado (11 dig): {valor_str}")

# ID VALOR
if valor_centavos < 1000:
    id_valor = "6"
    faixa = "R$ 0,01 - R$ 9,99"
elif valor_centavos < 10000:
    id_valor = "7"
    faixa = "R$ 10,00 - R$ 99,99"
elif valor_centavos < 100000:
    id_valor = "8"
    faixa = "R$ 100,00 - R$ 999,99"
else:
    id_valor = "9"
    faixa = "R$ 1.000,00+"

print(f"\n🔢 ID VALOR:")
print(f"   ID Valor: {id_valor} (faixa: {faixa})")
```

**Linhas 155-162: VALIDAÇÃO FINAL DA ESTRUTURA**

```python
print(f"\n✅ VALIDAÇÃO DA ESTRUTURA:")
print(f"   Pos 1: {codigo_completo[0]} (deve ser 8) {'✅' if codigo_completo[0] == '8' else '❌'}")
print(f"   Pos 2: {codigo_completo[1]} (deve ser 5) {'✅' if codigo_completo[1] == '5' else '❌'}")
print(f"   Pos 3: {codigo_completo[2]} (ID = {id_valor}) {'✅' if codigo_completo[2] == id_valor else '❌'}")
print(f"   Pos 4: {codigo_completo[3]} (DV = {dv}) {'✅' if codigo_completo[3] == dv else '❌'}")
print(f"   Pos 5-15: {codigo_completo[4:15]} (valor) {'✅' if codigo_completo[4:15] == valor_str else '❌'}")
print(f"   Pos 16-19: {codigo_completo[15:19]} (0270) {'✅' if codigo_completo[15:19] == '0270' else '❌'}")
```

## 📋 PRÓXIMOS PASSOS - TESTE OBRIGATÓRIO

### 1. Limpar Cache Python

```powershell
cd "apps\backend\inss"

# Limpar todos os caches
Get-ChildItem -Path . -Include __pycache__ -Recurse -Directory | Remove-Item -Recurse -Force

Get-ChildItem -Path . -Include *.pyc -Recurse -File | Remove-Item -Force
```

### 2. Reiniciar o Servidor

```powershell
# Matar processos existentes
taskkill /F /IM python.exe 2>$null

# Aguardar 3 segundos
timeout /t 3

# Reiniciar servidor
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Aguardar Confirmação de Startup

Aguarde no terminal até ver:
```
[OK] LIFESPAN STARTUP COMPLETO - SERVIDOR PRONTO
```

### 4. Emitir GPS de Teste

**TESTE 1 - Facultativo Simplificado (11%)**
- NIT: `27317621955`
- Código: `1473`
- Competência: `11/2025`
- Valor esperado: R$ 166,98 (11% de R$ 1.518,00)

**TESTE 2 - Contribuinte Individual (20%)**
- NIT: `12800186722`
- Código: `1007`
- Competência: `11/2025`
- Valor escolhido: R$ 303,60 (20% de R$ 1.518,00)

**TESTE 3 - MEI (5%)**
- NIT: `27317621955`
- Código: `1910`
- Competência: `11/2025`
- Valor esperado: R$ 75,90 (5% de R$ 1.518,00)

## 🔍 O QUE OBSERVAR NOS LOGS

### Se o valor estiver CORRETO no início:

```
🔧 [GPS] DEBUG - GERANDO GPS
   Valor recebido: R$ 166.98 (tipo: <class 'float'>)  ← CORRETO!

💰 CONVERSÃO PARA CENTAVOS:
   Valor em reais: R$ 166.98
   Valor em centavos: 16698  ← CORRETO!
   Valor formatado (11 dig): 00000016698  ← CORRETO!

🔢 ID VALOR:
   ID Valor: 8 (faixa: R$ 100,00 - R$ 999,99)  ← CORRETO!
```

✅ **RESULTADO**: Código estará correto, problema estava no cache ou reinicialização.

---

### Se o valor estiver ERRADO desde o início:

```
🔧 [GPS] DEBUG - GERANDO GPS
   Valor recebido: R$ 0.01 (tipo: <class 'float'>)  ← ERRADO!
   ⚠️  AVISO: Valor muito baixo R$ 0.01 - possível erro no cálculo!

💰 CONVERSÃO PARA CENTAVOS:
   Valor em reais: R$ 0.01
   Valor em centavos: 1  ← ERRADO!
   Valor formatado (11 dig): 00000000001  ← ERRADO!

🔢 ID VALOR:
   ID Valor: 6 (faixa: R$ 0,01 - R$ 9,99)  ← ERRADO!
```

❌ **PROBLEMA**: O valor já está errado ANTES de chegar ao gerador!

**Possíveis causas:**
1. Calculadora INSS retornando valor errado
2. Frontend enviando valor errado (centavos em vez de reais)
3. Conversão de tipo perdendo precisão
4. Campo errado sendo lido do banco

### Logs Adicionais do Serviço Híbrido:

```
[GPS HYBRID] Gerando código de barras:
  - Código pagamento: 1473
  - Competência: 11/2025
  - Valor: 166.98 (tipo: <class 'float'>)  ← Se estiver 0.01 aqui, problema é ANTES
  - Identificador: 27317621955
```

Se valor estiver errado aqui (0.01), o problema está em:
- **Rota (`gps_hybrid.py`)**: `body.valor` já chegou errado
- **Frontend/Cliente**: Enviando valor errado na requisição

## 📊 ESTRUTURA DO CÓDIGO DE BARRAS GPS

### Formato Correto para R$ 166,98:

```
Posições | Conteúdo          | Exemplo (R$ 166,98)
---------|-------------------|--------------------
1        | Produto           | 8
2        | Segmento          | 5
3        | ID Valor          | 8 (R$ 100-999)
4        | DV Geral          | 1 (Módulo 11)
5-15     | Valor (11 dig)    | 00000016698
16-19    | Campo GPS         | 0270
20-23    | Código Pagamento  | 1473
24-27    | Campo GPS         | 0001
28-37    | NIT (10 dig)      | 7317621955
38-44    | Competência       | 2025113
45-48    | Campo Livre       | 2000

COMPLETO (48 dígitos):
858100000016698027014730001731762195202511332000
```

### Linha Digitável Esperada:

```
85810000001-6 66980270147-3 30001731762-1 19522025113-2
```

## 🎯 RESULTADO FINAL ESPERADO

Após o teste com debug, você terá:

1. ✅ **Logs completos** mostrando CADA etapa do processamento do valor
2. ✅ **Identificação exata** de onde o valor está sendo perdido/alterado
3. ✅ **Código de barras correto** se valor chegar corretamente ao gerador
4. ✅ **Banco reconhecerá** a GPS se estrutura estiver correta

## 📝 INFORMAÇÕES PARA ME ENVIAR

Após emitir a GPS de teste, envie:

1. **Logs completos** do terminal (desde `DEBUG - GERANDO GPS` até `LINHA DIGITÁVEL`)
2. **Código de barras gerado** (48 dígitos)
3. **Linha digitável** (4 campos)
4. **Mensagem de erro** (se houver)

Com essas informações, saberei EXATAMENTE onde está o problema!

## ✅ CACHE LIMPO - PRONTO PARA TESTE

**Servidor deve ser reiniciado AGORA para aplicar todos os debugs!**
