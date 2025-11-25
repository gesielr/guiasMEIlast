-- Script para reverter valores de teste para produção (R$ 150,00)
-- Execute este script APÓS os testes para restaurar valores de produção

UPDATE public.system_config 
SET 
  config_value = '150.00',
  updated_at = NOW()
WHERE config_key IN (
  'valor_ativacao_autonomo',
  'valor_certificado_mei'
);

-- Verificar se os valores foram revertidos
SELECT 
  config_key,
  config_value,
  config_type,
  description,
  updated_at
FROM public.system_config
WHERE config_key IN (
  'valor_ativacao_autonomo',
  'valor_certificado_mei'
)
ORDER BY config_key;



