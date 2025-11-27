# Instruções para Atualização da Tabela guias_inss

## Problema Identificado

A tabela `guias_inss` no Supabase tem apenas campos básicos:
- id, usuario_id, codigo_gps, competencia, valor, status, pdf_url, data_vencimento

Mas o sistema precisa salvar campos adicionais importantes para:
1. **Validação da GPS pela Receita Federal** (CPF, NIT, nome)
2. **Auditoria e histórico** (linha_digitavel, codigo_barras, tipo_contribuinte)
3. **Cálculos e valores detalhados** (valor_base, aliquota, juros, multa)

## Solução

Execute o script SQL `add_columns_guias_inss.sql` no SQL Editor do Supabase.

### Passo a Passo:

1. Acesse seu projeto no Supabase
2. Vá em **SQL Editor** (menu lateral esquerdo)
3. Clique em **New Query**
4. Copie e cole o conteúdo do arquivo `add_columns_guias_inss.sql`
5. Clique em **Run** (ou pressione Ctrl+Enter)

## O que o script faz?

O script adiciona as seguintes colunas à tabela `guias_inss`:

### Dados do Contribuinte:
- `cpf` - CPF do contribuinte
- `nome` - Nome completo
- `rg` - RG
- `endereco` - Endereço completo
- `pis_pasep` - Número PIS/PASEP/NIT

### Período Detalhado:
- `periodo_mes` - Mês da competência (1-12)
- `periodo_ano` - Ano da competência

### Tipo e Valores:
- `tipo_contribuinte` - Tipo (ci_normal, ci_simplificado, domestico)
- `valor_base` - Valor base para cálculo
- `aliquota` - Alíquota aplicada
- `valor_contribuicao` - Valor da contribuição
- `valor_juros` - Juros (se houver)
- `valor_multa` - Multa (se houver)
- `valor_total` - Valor total a pagar

### Controle e Auditoria:
- `reference_number` - Número de referência único
- `linha_digitavel` - Linha digitável da GPS
- `codigo_barras` - Código de barras da GPS
- `metodo_emissao` - Método usado (SAL, local, híbrido)
- `vencimento` - Data de vencimento

## Importante!

- O script usa `ADD COLUMN IF NOT EXISTS`, então é **seguro executar múltiplas vezes**
- **Não remove** nem **altera** colunas existentes
- **Não perde** dados já salvos na tabela
- Adiciona índices para melhorar a performance nas consultas

## Após executar o script

O sistema começará a salvar todos os campos automaticamente. As guias antigas continuarão funcionando normalmente (terão NULL nos novos campos).

## Rollback (caso necessário)

Se precisar remover as colunas adicionadas, execute:

```sql
-- ATENÇÃO: Use apenas se realmente precisar reverter!
ALTER TABLE guias_inss
DROP COLUMN IF EXISTS cpf,
DROP COLUMN IF EXISTS nome,
DROP COLUMN IF EXISTS rg,
DROP COLUMN IF EXISTS endereco,
DROP COLUMN IF EXISTS pis_pasep,
DROP COLUMN IF EXISTS periodo_mes,
DROP COLUMN IF EXISTS periodo_ano,
DROP COLUMN IF EXISTS tipo_contribuinte,
DROP COLUMN IF EXISTS valor_base,
DROP COLUMN IF EXISTS aliquota,
DROP COLUMN IF EXISTS valor_contribuicao,
DROP COLUMN IF EXISTS valor_juros,
DROP COLUMN IF EXISTS valor_multa,
DROP COLUMN IF EXISTS valor_total,
DROP COLUMN IF EXISTS reference_number,
DROP COLUMN IF EXISTS linha_digitavel,
DROP COLUMN IF EXISTS codigo_barras,
DROP COLUMN IF EXISTS metodo_emissao,
DROP COLUMN IF EXISTS vencimento;
```
