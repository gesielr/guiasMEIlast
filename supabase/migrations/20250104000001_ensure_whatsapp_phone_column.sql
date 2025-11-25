-- Garantir que a coluna whatsapp_phone existe na tabela profiles
-- Esta migration é idempotente e pode ser executada múltiplas vezes

-- Adicionar coluna whatsapp_phone se não existir
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT;

-- Se houver dados na coluna 'telefone' (se existir), migrar para whatsapp_phone
-- Nota: Esta query só funciona se a coluna 'telefone' existir
DO $$
BEGIN
    -- Verificar se a coluna 'telefone' existe e tem dados
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'telefone'
    ) THEN
        -- Migrar dados de 'telefone' para 'whatsapp_phone' onde whatsapp_phone está vazio
        UPDATE public.profiles
        SET whatsapp_phone = telefone
        WHERE whatsapp_phone IS NULL 
        AND telefone IS NOT NULL 
        AND telefone != '';
    END IF;
END $$;

-- Comentário na coluna para documentação
COMMENT ON COLUMN public.profiles.whatsapp_phone IS 'Número de telefone WhatsApp do usuário no formato internacional (ex: 5548991117268)';

