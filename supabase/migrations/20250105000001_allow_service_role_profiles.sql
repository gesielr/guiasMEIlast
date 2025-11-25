-- Permitir que service_role insira perfis (para migrations e scripts)
-- Isso é necessário para que o backend possa criar perfis durante o cadastro

-- Remover políticas antigas se existirem (para evitar duplicatas)
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Service role can update profiles" ON public.profiles;

-- Política para service_role inserir perfis
CREATE POLICY "Service role can insert profiles" ON public.profiles
    FOR INSERT 
    WITH CHECK (true);

-- Política para service_role atualizar perfis
CREATE POLICY "Service role can update profiles" ON public.profiles
    FOR UPDATE 
    USING (true);

-- Política para service_role ler perfis
CREATE POLICY "Service role can read profiles" ON public.profiles
    FOR SELECT 
    USING (true);

