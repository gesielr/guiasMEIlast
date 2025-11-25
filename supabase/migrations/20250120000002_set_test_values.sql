-- Script para configurar valores de teste (R$ 0,10)
-- Execute este script ANTES de testar os fluxos de pagamento
-- Para reverter para produção, execute: supabase/migrations/20250120000001_add_pricing_configs.sql

UPDATE public.system_config 
SET 
  config_value = '0.10',
  updated_at = NOW()
WHERE config_key IN (
  'valor_ativacao_autonomo',
  'valor_certificado_mei'
);

-- Verificar se os valores foram atualizados
SELECT 
  config_key,
  config_value,
  config_type,
  description,
  updated_at
FROM public.system_config
WHERE config_key IN (
  'valor_ativacao_autonomo',
  'valor_certificado_mei',
  'porcentagem_taxa_gps',
  'porcentagem_comissao_parceiro',
  'taxa_nfse_por_nota'
)
ORDER BY config_key;



