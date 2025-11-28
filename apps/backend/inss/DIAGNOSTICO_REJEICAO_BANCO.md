# DIAGNÓSTICO: REJEIÇÃO DO CÓDIGO PELO BANCO

## Código Rejeitado

**Linha digitável:** `85800000003-8 03600270100-7 70001731762-7 19552025113-2`

**Código de barras:** `85800000003036002701007000173176219552025113`

## ✅ Validação Matemática

### DV Geral (Posição 4) - Módulo 11
- **DV informado:** 0
- **DV calculado:** 0
- **Status:** ✅ CORRETO

### DVs dos Campos da Linha Digitável - Módulo 11

| Campo | Dados (11 dig) | DV Info | DV Calc | Status |
|-------|----------------|---------|---------|--------|
| 1 | 85800000003 | 8 | 8 | ✅ CORRETO |
| 2 | 03600270100 | 7 | 7 | ✅ CORRETO |
| 3 | 70001731762 | 7 | 7 | ✅ CORRETO |
| 4 | 19552025113 | 2 | 2 | ✅ CORRETO |

**TODOS os DVs estão matematicamente corretos!**

## 📊 Decomposição do Código

```
Posição | Campo              | Valor        | Descrição
--------|--------------------|--------------|--------------------------
1       | Produto            | 8            | Arrecadação
2       | Segmento           | 5            | Taxas/Contribuições
3       | ID Valor           | 8            | R$ 100,00 - R$ 999,99 ✅
4       | DV Geral           | 0            | Módulo 11 ✅
5-15    | Valor              | 00000030360  | R$ 303,60 ✅
16-19   | Campo GPS          | 0270         | Fixo GPS ✅
20-23   | Código Pag         | 1007         | Contrib. Individual 20%
24-27   | Campo GPS          | 0001         | Fixo GPS ✅
28-37   | NIT (10 dig)       | 7317621955   | NIT sem 1º dígito (2)
38-44   | Competência        | 2025113      | YYYYMM3 = 11/2025
```

## ⚠️ Possíveis Causas de Rejeição

### 1. Formato da Competência (MAIS PROVÁVEL)

**Problema:** Estamos usando `YYYYMM3` (7 dígitos) mas alguns bancos podem esperar `YYYYMM` (6 dígitos).

**Evidência:**
- PDFs oficiais da Receita têm informações conflitantes
- Alguns mostram 7 dígitos, outros 6
- Não há consenso claro na especificação

**Solução:** Implementar opção para usar YYYYMM (6 dígitos)

### 2. Código de Barras I2of5 no PDF

**Problema:** PDF pode não estar gerando corretamente o barcode Interleaved 2 of 5.

**Evidências:**
- Mudança recente de Code128 para I2of5
- Scanners bancários muito sensíveis
- Módulo fino (barWidth) pode estar fora do padrão

**Solução:** Validar PDF gerado em leitor de código de barras profissional

### 3. NIT Não Registrado / Inválido

**Problema:** NIT 27317621955 pode não estar no cadastro oficial INSS.

**Como verificar:**
1. Acessar portal da Receita Federal
2. Consultar situação cadastral do NIT
3. Verificar se NIT está ativo e apto para GPS

**Se NIT inválido:**
- Banco SEMPRE rejeitará, independente do código estar correto
- Usuário precisa regularizar cadastro no INSS

### 4. Código 1007 Incompatível com NIT

**Problema:** Código 1007 (Contribuinte Individual 20%) pode ser incompatível com este NIT específico.

**Códigos GPS:**
- 1007: Contribuinte Individual 20%
- 1163: Contribuinte Individual Simplificado 11%
- 1120: Contribuinte Individual 11%

**Verificar:** Se NIT está cadastrado como contribuinte do tipo correto

### 5. Competência Não Disponível

**Problema:** Competência 11/2025 pode ainda não estar aberta para pagamento.

**Hoje:** 27/11/2025

**Status:** Competência atual, deveria estar disponível

### 6. Configuração do Scanner Bancário

**Problema:** Scanner do aplicativo pode ter problemas específicos com I2of5.

**Testar:**
- Aplicativo de outro banco
- Lotérica
- Digitação manual da linha digitável

## 🔧 Testes Recomendados (URGENTE)

### Teste 1: Tentar Competência com 6 Dígitos (YYYYMM)

**Ação:** Modificar competência de `2025113` para `202511`

**Como fazer:**
1. Criar flag/parâmetro para formato de competência
2. Gerar novo código com 6 dígitos
3. Testar no banco

**Código esperado com YYYYMM:**
```
Competência: 202511 (6 dígitos)
Código: 858000000030360027010070001731762195202511
                                           └──┬──┘
                                           6 dígitos
```

### Teste 2: Validar PDF com Leitor Profissional

**Ação:** Abrir PDF gerado e validar barcode I2of5

**Ferramentas:**
- ZXing Decoder Online
- Barcode Scanner app profissional
- Validador FEBRABAN

**Verificar:**
- Se I2of5 é lido corretamente
- Se retorna os 44 dígitos esperados
- Se módulo fino está no padrão (0.33-0.52mm)

### Teste 3: Digitação Manual

**Ação:** Em vez de escanear, digitar a linha manualmente no app do banco

**Linha para digitar:**
```
85800000003-8 03600270100-7 70001731762-7 19552025113-2
```

**Se funcionar com digitação:**
- Problema está no barcode I2of5 do PDF
- Linha digitável está correta

**Se NÃO funcionar com digitação:**
- Problema é com os dados (NIT, competência, código, etc)
- Não é problema de geração do barcode

### Teste 4: Gerar com NIT do PDF Oficial

**Ação:** Usar NIT 12800186722 (do PDF oficial da Receita)

**Justificativa:**
- Sabemos que este NIT é válido
- Receita Federal usa este NIT nos exemplos
- Se funcionar, confirma que problema é o NIT 27317621955

### Teste 5: Código 1163 em vez de 1007

**Ação:** Gerar GPS com código 1163 (11%) em vez de 1007 (20%)

**Valor ajustado:**
- Se era R$ 303,60 com 20%
- Com 11% seria R$ 166,98

**Justificativa:**
- Código 1163 pode ser mais compatível
- Testar se problema é específico do código 1007

## 📝 Próximos Passos Imediatos

1. ✅ **Implementar flag para competência YYYYMM vs YYYYMM3**
2. ✅ **Gerar código teste com 6 dígitos**
3. ⚠️ **Usuário testar digitação manual no banco**
4. ⚠️ **Validar PDF com leitor profissional**
5. ⚠️ **Verificar cadastro do NIT na Receita Federal**

## 💡 Conclusão Técnica

**O código gerado está MATEMATICAMENTE CORRETO segundo FEBRABAN.**

Todos os DVs estão corretos usando Módulo 11 (padrão para arrecadação). A estrutura de 44 dígitos está perfeita.

**A rejeição do banco NÃO é por erro de cálculo.**

As causas mais prováveis são:
1. **Formato de competência** (7 vs 6 dígitos) ← TESTAR PRIMEIRO
2. **NIT não registrado** ← VERIFICAR CADASTRO
3. **PDF/Barcode I2of5** ← VALIDAR COM LEITOR

**RECOMENDAÇÃO:** Começar pelos testes na ordem acima, do mais provável ao menos provável.
