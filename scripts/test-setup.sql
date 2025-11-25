-- scripts/test-setup.sql
-- Script SQL para configurar ambiente de testes

-- 1. Configurar valores de teste (R$ 0,10)
UPDATE public.system_config 
SET 
  config_value = '0.10',
  updated_at = NOW()
WHERE config_key IN (
  'valor_ativacao_autonomo',
  'valor_certificado_mei'
);

-- 2. Verificar valores atualizados
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

-- 3. Limpar dados de teste anteriores (OPCIONAL - descomente se necessário)
-- DELETE FROM payments WHERE type = 'activation' AND amount = 0.10;
-- DELETE FROM payment_cert_digital WHERE valor = 0.10;
-- DELETE FROM cert_enrollments WHERE external_cert_id LIKE 'MOCK_%';



