# Correções Finais - Código de Barras GPS

## Data: 26/11/2025

## Problemas Identificados

1. ❌ **NIT processado incorretamente** - Estava removendo o PRIMEIRO dígito em vez do ÚLTIMO
2. ❌ **Código de barras com barras muito finas** - Módulo fino de 0.27mm (muito pequeno para scanners)
3. ❌ **Coluna `validado_sal` faltante** - Erro 400 ao salvar no Supabase

## Correções Aplicadas

### 1. Processamento Correto do NIT ✅

**Arquivo:** `codigo_barras_gps.py` linhas 101-117

**Antes (ERRADO):**
```python
nit_10_digitos = nit_limpo[1:11]  # Removia PRIMEIRO dígito
primeiro_digito_nit = nit_limpo[0]
campo_livre = primeiro_digito_nit + "000"
```

**Depois (CORRETO):**
```python
nit_10_digitos = nit_limpo[:10]  # Remove ÚLTIMO dígito (verificador)
digito_verificador_nit = nit_limpo[10]
campo_livre = digito_verificador_nit + "000"
```

**Exemplo:**
- NIT: `27317621955`
- Antes: `7317621955` (removeu "2")
- Depois: `2731762195` (removeu "5" - dígito verificador) ✅

### 2. Largura de Barras Otimizada para Scanners ✅

**Arquivo:** `gps_pdf_generator_oficial.py` linhas 707-711

**Antes:**
```python
bar_width_calculado = 150mm / 552 ≈ 0.27mm  # Muito fino!
bar_width_otimizado = max(bar_width_calculado, 0.2 * mm)
```

**Depois:**
```python
# Padrão ISO/IEC 15417: módulo fino entre 0.33mm e 0.43mm
bar_width_otimizado = 0.38 * mm  # Ideal para scanners bancários
```

**Justificativa:**
- Módulo fino < 0.33mm: Barras muito finas, dificulta leitura
- Módulo fino 0.38mm: Ideal para scanners bancários ✅
- Módulo fino > 0.43mm: Barras muito grossas, código muito largo

### 3. Coluna `validado_sal` Adicionada ✅

**Arquivo SQL:** `add_validado_sal_column.sql`
```sql
ALTER TABLE guias_inss
ADD COLUMN IF NOT EXISTS validado_sal BOOLEAN DEFAULT FALSE;
```

**Arquivo Python:** `inss.py` linha 379
```python
guia_save_data = {
    ...
    "validado_sal": False  # Validação SAL não implementada neste fluxo
}
```

## Instruções para Aplicar as Correções

### Passo 1: Executar SQL no Supabase

Abra o SQL Editor no Supabase e execute:

```sql
-- Adicionar coluna validado_sal
ALTER TABLE guias_inss
ADD COLUMN IF NOT EXISTS validado_sal BOOLEAN DEFAULT FALSE;
```

### Passo 2: Reiniciar o Servidor FastAPI

**IMPORTANTE:** O Python carrega módulos na memória ao iniciar.
Para as mudanças em `codigo_barras_gps.py` e `gps_pdf_generator_oficial.py` terem efeito,
você DEVE reiniciar o servidor:

**No Windows (PowerShell):**
```powershell
# Parar servidor (Ctrl+C no terminal)
# Depois reiniciar:
cd "apps\backend\inss"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Passo 3: Testar Novamente

Emita uma nova GPS e verifique:

1. ✅ **NIT correto na linha digitável:**
   - Campo 3 deve ter: `30001273176` (com NIT `2731762195`)
   - Não mais: `30001731762` (estava usando `7317621955`)

2. ✅ **Código de barras mais grosso:**
   - Barras devem estar mais visíveis (0.38mm em vez de 0.27mm)
   - Scanner do banco deve conseguir ler

3. ✅ **Salvamento sem erros:**
   - Não deve mais aparecer erro: `Could not find the 'validado_sal' column`

## Resultado Esperado

```
Linha digitável corrigida:
85810000001-4 66980270116-8 30001273176-9 21952025113-3
                              ^^^^^^^^^^^
                              NIT: 2731762195 ✅
```

- **Código de barras:** 48 dígitos válidos
- **Barras:** Mais grossas e legíveis para scanners
- **NIT:** Processado corretamente (sem primeiro dígito "2", com últimos 10 dígitos)
- **Banco:** Deve reconhecer o código ✅

## Arquivos Modificados

1. `codigo_barras_gps.py` - Correção do processamento do NIT
2. `gps_pdf_generator_oficial.py` - Ajuste da largura de barras (0.38mm)
3. `inss.py` - Adição do campo `validado_sal`
4. `add_validado_sal_column.sql` - SQL para adicionar coluna

## Observações Técnicas

- **NIT/PIS/PASEP brasileiro:** 11 dígitos (10 base + 1 verificador)
- **GPS barcode:** Usa os 10 primeiros dígitos (sem verificador)
- **Code128 ISO/IEC 15417:** Módulo fino ideal = 0.33mm a 0.43mm
- **Módulo escolhido:** 0.38mm (meio do intervalo recomendado)

## Próximos Passos

Após reiniciar o servidor e testar:
1. Emitir nova GPS com o NIT `27317621955`
2. Verificar linha digitável no PDF gerado
3. Testar leitura com app do banco
4. Confirmar que o banco reconhece o código ✅
