-- Adicionar colunas de endereço na tabela profiles
-- Esses dados vêm da API da Receita Federal quando o usuário se cadastra

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS endereco_logradouro TEXT,
ADD COLUMN IF NOT EXISTS endereco_numero TEXT,
ADD COLUMN IF NOT EXISTS endereco_complemento TEXT,
ADD COLUMN IF NOT EXISTS endereco_bairro TEXT,
ADD COLUMN IF NOT EXISTS endereco_cep TEXT,
ADD COLUMN IF NOT EXISTS endereco_municipio TEXT,
ADD COLUMN IF NOT EXISTS endereco_uf TEXT,
ADD COLUMN IF NOT EXISTS endereco_codigo_ibge TEXT; -- Código IBGE do município (7 dígitos)

-- Comentários para documentação
COMMENT ON COLUMN public.profiles.endereco_logradouro IS 'Logradouro do endereço da empresa (da API da Receita)';
COMMENT ON COLUMN public.profiles.endereco_numero IS 'Número do endereço da empresa';
COMMENT ON COLUMN public.profiles.endereco_complemento IS 'Complemento do endereço da empresa';
COMMENT ON COLUMN public.profiles.endereco_bairro IS 'Bairro do endereço da empresa';
COMMENT ON COLUMN public.profiles.endereco_cep IS 'CEP do endereço da empresa';
COMMENT ON COLUMN public.profiles.endereco_municipio IS 'Nome do município da empresa';
COMMENT ON COLUMN public.profiles.endereco_uf IS 'UF (estado) da empresa';
COMMENT ON COLUMN public.profiles.endereco_codigo_ibge IS 'Código IBGE do município (7 dígitos) - usado para emissão de NFSe';

