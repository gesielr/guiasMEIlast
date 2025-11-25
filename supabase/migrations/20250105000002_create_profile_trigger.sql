-- Trigger para criar perfil automaticamente quando um usuário é criado em auth.users
-- Isso garante que mesmo cadastros feitos pelo frontend diretamente criem o perfil

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  normalized_phone TEXT;
BEGIN
  -- Normalizar telefone do user_metadata
  IF NEW.raw_user_meta_data->>'phone' IS NOT NULL THEN
    normalized_phone := regexp_replace(NEW.raw_user_meta_data->>'phone', '[^0-9]', '', 'g');
    IF normalized_phone !~ '^55' THEN
      normalized_phone := '55' || normalized_phone;
    END IF;
  END IF;

  -- Inserir perfil se não existir
  INSERT INTO public.profiles (
    id,
    name,
    email,
    whatsapp_phone,
    user_type,
    onboarding_completed,
    contract_accepted,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    normalized_phone,
    COALESCE(
      NEW.raw_user_meta_data->>'user_type',
      NEW.raw_user_meta_data->>'role',
      'common'
    ),
    false,
    false,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    whatsapp_phone = COALESCE(EXCLUDED.whatsapp_phone, profiles.whatsapp_phone),
    name = COALESCE(EXCLUDED.name, profiles.name),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger se não existir
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Comentário explicativo
COMMENT ON FUNCTION public.handle_new_user() IS 'Cria automaticamente um perfil na tabela profiles quando um novo usuário é criado em auth.users';


