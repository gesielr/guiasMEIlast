# Instruções para Aplicar Migrations GPS no Supabase

## 📋 Resumo

Foram criadas **4 novas migrations** para implementar o módulo GPS 100% seguro conforme documento técnico SAL 2025.

## 🗂️ Tabelas Criadas

### 1. `sal_version_history`
- **Propósito:** Versionamento de regras SAL (teto INSS, salário mínimo, alíquotas)
- **Arquivo:** `20250122000001_create_sal_version_history.sql`
- **Dados iniciais:** Regras de 2025 já populadas

### 2. `gps_history_v2`
- **Propósito:** Histórico completo de GPS emitidas
- **Arquivo:** `20250122000002_create_gps_history_v2.sql`
- **Recursos:** Constraint UNIQUE para evitar duplicidade, trigger para status overdue

### 3. `sal_classes`
- **Propósito:** Dados mestre de códigos GPS (1007, 1163, etc.)
- **Arquivo:** `20250122000003_create_sal_classes.sql`
- **Dados iniciais:** 8 códigos GPS principais já populados

### 4. `gps_validation_log`
- **Propósito:** Log de validações realizadas durante emissão
- **Arquivo:** `20250122000004_create_gps_validation_log.sql`
- **Recursos:** Auditoria completa de todas as validações

## 🚀 Como Aplicar

### Passo 1: Acessar Supabase SQL Editor

1. Acesse seu projeto no Supabase Dashboard
2. Vá em **SQL Editor** no menu lateral
3. Clique em **New Query**

### Passo 2: Executar Migrations na Ordem

> [!IMPORTANT]
> Execute as migrations **na ordem numérica** para evitar erros de dependência.

#### Migration 1: sal_version_history

```sql
-- Copie e cole o conteúdo completo de:
-- supabase/migrations/20250122000001_create_sal_version_history.sql
```

Clique em **Run** e aguarde a confirmação de sucesso.

#### Migration 2: gps_history_v2

```sql
-- Copie e cole o conteúdo completo de:
-- supabase/migrations/20250122000002_create_gps_history_v2.sql
```

Clique em **Run** e aguarde a confirmação de sucesso.

#### Migration 3: sal_classes

```sql
-- Copie e cole o conteúdo completo de:
-- supabase/migrations/20250122000003_create_sal_classes.sql
```

Clique em **Run** e aguarde a confirmação de sucesso.

#### Migration 4: gps_validation_log

```sql
-- Copie e cole o conteúdo completo de:
-- supabase/migrations/20250122000004_create_gps_validation_log.sql
```

Clique em **Run** e aguarde a confirmação de sucesso.

## ✅ Verificação de Sucesso

Após executar todas as migrations, verifique se as tabelas foram criadas:

```sql
-- Verificar tabelas criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'sal_version_history', 
    'gps_history_v2', 
    'sal_classes', 
    'gps_validation_log'
)
ORDER BY table_name;
```

Deve retornar **4 linhas**.

### Verificar Dados Iniciais

```sql
-- Verificar regras SAL 2025
SELECT effective_date, teto_inss, salario_minimo 
FROM public.sal_version_history;

-- Verificar códigos GPS
SELECT codigo_gps, descricao, tipo_contribuinte, ativo 
FROM public.sal_classes 
WHERE ativo = TRUE
ORDER BY codigo_gps;
```

## 🧪 Testes Rápidos

### Teste 1: Inserir GPS de Teste

```sql
-- Inserir GPS de teste (substitua user_id por um UUID válido do seu sistema)
INSERT INTO public.gps_history_v2 (
    user_id,
    cpf,
    nome_contribuinte,
    periodo_mes,
    periodo_ano,
    tipo_contribuinte,
    codigo_gps,
    valor_base,
    aliquota,
    valor_contribuicao,
    valor_total,
    vencimento,
    reference_number,
    linha_digitavel
) VALUES (
    'SEU_USER_ID_AQUI', -- Substitua por um UUID válido
    '12345678901',
    'Teste Contribuinte',
    11,
    2025,
    'ci_normal',
    '1007',
    1518.00,
    0.20,
    303.60,
    303.60,
    '2025-12-15',
    '202511TEST123',
    '85000000000000000000000000000000000000000000 12'
);
```

### Teste 2: Verificar Constraint de Duplicidade

```sql
-- Tentar inserir GPS duplicada (deve falhar)
INSERT INTO public.gps_history_v2 (
    user_id,
    cpf,
    periodo_mes,
    periodo_ano,
    tipo_contribuinte,
    codigo_gps,
    valor_base,
    aliquota,
    valor_contribuicao,
    valor_total,
    vencimento,
    reference_number,
    linha_digitavel
) VALUES (
    'SEU_USER_ID_AQUI',
    '12345678901', -- Mesmo CPF
    11, -- Mesmo mês
    2025, -- Mesmo ano
    'ci_normal', -- Mesmo tipo
    '1007',
    1518.00,
    0.20,
    303.60,
    303.60,
    '2025-12-15',
    '202511TEST456', -- Reference diferente
    '85000000000000000000000000000000000000000000 34'
);
```

**Resultado esperado:** Erro de violação de constraint UNIQUE.

### Teste 3: Limpar Dados de Teste

```sql
-- Remover GPS de teste
DELETE FROM public.gps_history_v2 
WHERE cpf = '12345678901';
```

## 🔧 Troubleshooting

### Erro: "relation already exists"

Se você receber este erro, significa que a tabela já existe. Você pode:

1. **Opção 1:** Pular a migration (se a tabela já está correta)
2. **Opção 2:** Dropar a tabela e recriar (CUIDADO: perde dados)

```sql
-- CUIDADO: Isso apaga todos os dados da tabela
DROP TABLE IF EXISTS public.sal_version_history CASCADE;
-- Depois execute a migration novamente
```

### Erro: "function handle_updated_at does not exist"

A função `handle_updated_at` deve ter sido criada na migration `20241217000001_create_profiles_table.sql`. Se não existir:

```sql
-- Criar função manualmente
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Erro: "permission denied"

Certifique-se de estar executando as migrations com permissões de administrador no Supabase SQL Editor.

## 📊 Estrutura das Tabelas

### sal_version_history
- `id` (UUID, PK)
- `effective_date` (DATE, UNIQUE) - Data de vigência
- `teto_inss` (DECIMAL) - Teto INSS
- `salario_minimo` (DECIMAL) - Salário mínimo
- `tabela_aliquotas` (JSONB) - Faixas e alíquotas
- `tabela_codes` (JSONB) - Mapeamento de códigos

### gps_history_v2
- `id` (UUID, PK)
- `user_id` (UUID, FK → profiles)
- `cpf` (VARCHAR) - CPF do contribuinte
- `periodo_mes`, `periodo_ano` (INT) - Competência
- `tipo_contribuinte` (VARCHAR) - Tipo
- `codigo_gps` (VARCHAR) - Código GPS
- `valor_total` (DECIMAL) - Valor total
- `reference_number` (VARCHAR, UNIQUE) - Referência
- `linha_digitavel` (VARCHAR) - Linha digitável
- `status` (VARCHAR) - Status da GPS
- **UNIQUE:** (cpf, periodo_mes, periodo_ano, tipo_contribuinte)

### sal_classes
- `id` (UUID, PK)
- `codigo_gps` (VARCHAR, UNIQUE) - Código GPS
- `descricao` (TEXT) - Descrição
- `tipo_contribuinte` (VARCHAR) - Tipo
- `aliquota_minima`, `aliquota_maxima` (DECIMAL) - Alíquotas
- `ativo` (BOOLEAN) - Se está ativo

### gps_validation_log
- `id` (UUID, PK)
- `gps_id` (UUID, FK → gps_history_v2)
- `validation_type` (VARCHAR) - Tipo de validação
- `passed` (BOOLEAN) - Se passou
- `error_message` (TEXT) - Mensagem de erro
- `validation_data` (JSONB) - Dados adicionais

## 🎯 Próximos Passos

Após aplicar as migrations:

1. ✅ Testar endpoint `/api/v1/guias/emitir` via WhatsApp
2. ✅ Verificar se as validações estão funcionando
3. ✅ Confirmar que GPS não duplicadas são bloqueadas
4. ✅ Validar PDF gerado com layout SAL 2025

## 📝 Notas Importantes

> [!WARNING]
> - A tabela `gps_history_v2` foi criada como **nova tabela** para não conflitar com `gps_emissions` existente
> - Você pode migrar dados de `gps_emissions` para `gps_history_v2` posteriormente se necessário
> - As policies RLS garantem que usuários só vejam suas próprias GPS

> [!TIP]
> - Todas as tabelas têm RLS habilitado para segurança
> - Service role tem acesso total para operações do backend
> - Triggers automáticos atualizam `updated_at` e `status`

## 🔗 Referências

- Documento Técnico: `DOCUMENTO TÉCNICO_ IMPLEMENTAÇÃO 100% COMPLETA DO MÓDULO GPS.txt`
- Guia de Implementação: `GUIA DE IMPLEMENTAÇÃO - CÓDIGO-FONTE REFERENCIAL.txt`
- Plano de Implementação: `implementation_plan.md`
