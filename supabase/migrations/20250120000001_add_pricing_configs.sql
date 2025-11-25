-- Adicionar configurações de preços e taxas ao system_config
-- Permite que admin ajuste valores sem alterar código

INSERT INTO public.system_config (config_key, config_value, config_type, description)
VALUES 
    ('valor_ativacao_autonomo', '150.00', 'number', 'Valor da taxa de ativação do sistema para Autônomos (R$) - Pago uma vez por ano'),
    ('valor_certificado_mei', '150.00', 'number', 'Valor do certificado digital ICP-Brasil para MEI (R$) - Pagamento único'),
    ('porcentagem_taxa_gps', '6', 'number', 'Porcentagem de taxa sobre o valor da guia GPS (INSS) - Ex: 6 = 6%'),
    ('porcentagem_comissao_parceiro', '30', 'number', 'Porcentagem de comissão para parceiros sobre taxas de clientes - Ex: 30 = 30%'),
    ('taxa_nfse_por_nota', '3.00', 'number', 'Taxa por nota fiscal NFS-e emitida (R$)')
ON CONFLICT (config_key) DO UPDATE
SET 
    config_value = EXCLUDED.config_value,
    description = EXCLUDED.description,
    updated_at = NOW();

