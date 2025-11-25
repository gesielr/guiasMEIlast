-- ============================================================
-- Migração Corrigida: Sistema Híbrido de GPS
-- Data: 2025-01-09
-- Versão: Corrigida e Robusta
-- ============================================================

-- ============================================================
-- PARTE 1: Verificar e criar tabela gps_emissions se não existir
-- ============================================================
DO $$ 
BEGIN
    -- Verificar se a tabela gps_emissions existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'gps_emissions'
    ) THEN
        -- Criar tabela gps_emissions básica
        CREATE TABLE public.gps_emissions (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            month_ref TEXT NOT NULL,
            value NUMERIC(12,2) NOT NULL,
            inss_code TEXT,
            barcode TEXT,
            status TEXT DEFAULT 'pending',
            pdf_url TEXT,
            integration_mode TEXT DEFAULT 'production',
            raw_response JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Habilitar RLS
        ALTER TABLE public.gps_emissions ENABLE ROW LEVEL SECURITY;
        
        -- Criar política RLS básica
        CREATE POLICY IF NOT EXISTS "user can manage own gps"
            ON public.gps_emissions
            FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
        
        RAISE NOTICE 'Tabela gps_emissions criada com sucesso';
    ELSE
        RAISE NOTICE 'Tabela gps_emissions já existe';
    END IF;
END $$;

-- ============================================================
-- PARTE 2: Adicionar colunas à tabela gps_emissions
-- ============================================================
DO $$ 
BEGIN
    -- Método de emissão
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'gps_emissions' 
        AND column_name = 'metodo_emissao'
    ) THEN
        ALTER TABLE public.gps_emissions 
        ADD COLUMN metodo_emissao VARCHAR(50) DEFAULT 'local';
        
        COMMENT ON COLUMN public.gps_emissions.metodo_emissao IS 'Método usado: local, sal_validado, sal_oficial';
        RAISE NOTICE 'Coluna metodo_emissao adicionada';
    END IF;
    
    -- Flag de validação SAL
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'gps_emissions' 
        AND column_name = 'validado_sal'
    ) THEN
        ALTER TABLE public.gps_emissions 
        ADD COLUMN validado_sal BOOLEAN DEFAULT FALSE;
        
        COMMENT ON COLUMN public.gps_emissions.validado_sal IS 'Se a GPS foi validada no sistema SAL';
        RAISE NOTICE 'Coluna validado_sal adicionada';
    END IF;
    
    -- Data de validação
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'gps_emissions' 
        AND column_name = 'validado_em'
    ) THEN
        ALTER TABLE public.gps_emissions 
        ADD COLUMN validado_em TIMESTAMP WITH TIME ZONE;
        
        COMMENT ON COLUMN public.gps_emissions.validado_em IS 'Data/hora da validação no SAL';
        RAISE NOTICE 'Coluna validado_em adicionada';
    END IF;
    
    -- Código de barras
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'gps_emissions' 
        AND column_name = 'codigo_barras'
    ) THEN
        ALTER TABLE public.gps_emissions 
        ADD COLUMN codigo_barras VARCHAR(48);
        
        COMMENT ON COLUMN public.gps_emissions.codigo_barras IS 'Código de barras completo (48 dígitos)';
        RAISE NOTICE 'Coluna codigo_barras adicionada';
    END IF;
END $$;

-- ============================================================
-- PARTE 3: Criar tabela de divergências
-- ============================================================
-- Primeiro, remover a tabela se existir com estrutura incorreta
DROP TABLE IF EXISTS public.gps_divergencias CASCADE;

-- Criar tabela de divergências
CREATE TABLE public.gps_divergencias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Usar auth.users(id) para manter consistência com gps_emissions.user_id
    usuario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    guia_id UUID REFERENCES public.gps_emissions(id) ON DELETE CASCADE,
    competencia VARCHAR(7) NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    codigo_local VARCHAR(48) NOT NULL,
    codigo_sal VARCHAR(48) NOT NULL,
    tipo_divergencia VARCHAR(50) NOT NULL,
    resolvido BOOLEAN DEFAULT FALSE,
    resolvido_em TIMESTAMP WITH TIME ZONE,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comentários na tabela de divergências
COMMENT ON TABLE public.gps_divergencias IS 'Registra divergências entre GPS local e SAL';
COMMENT ON COLUMN public.gps_divergencias.usuario_id IS 'ID do usuário (referência a auth.users)';
COMMENT ON COLUMN public.gps_divergencias.guia_id IS 'ID da guia GPS (referência a gps_emissions)';
COMMENT ON COLUMN public.gps_divergencias.tipo_divergencia IS 'Tipo: codigo_barras_diferente, valor_diferente, etc';
COMMENT ON COLUMN public.gps_divergencias.resolvido IS 'Se a divergência foi resolvida';

-- Habilitar RLS na tabela de divergências
ALTER TABLE public.gps_divergencias ENABLE ROW LEVEL SECURITY;

-- Criar política RLS para divergências
CREATE POLICY IF NOT EXISTS "user can view own divergencias"
    ON public.gps_divergencias
    FOR SELECT USING (auth.uid() = usuario_id);

CREATE POLICY IF NOT EXISTS "user can insert own divergencias"
    ON public.gps_divergencias
    FOR INSERT WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY IF NOT EXISTS "user can update own divergencias"
    ON public.gps_divergencias
    FOR UPDATE USING (auth.uid() = usuario_id);

-- ============================================================
-- PARTE 4: Criar índices para performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_gps_divergencias_usuario ON public.gps_divergencias(usuario_id);
CREATE INDEX IF NOT EXISTS idx_gps_divergencias_guia ON public.gps_divergencias(guia_id);
CREATE INDEX IF NOT EXISTS idx_gps_divergencias_resolvido ON public.gps_divergencias(resolvido);
CREATE INDEX IF NOT EXISTS idx_gps_emissions_metodo ON public.gps_emissions(metodo_emissao);
CREATE INDEX IF NOT EXISTS idx_gps_emissions_validado ON public.gps_emissions(validado_sal);

-- ============================================================
-- PARTE 5: Criar trigger para atualizar updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_gps_divergencias_updated_at ON public.gps_divergencias;
CREATE TRIGGER update_gps_divergencias_updated_at
    BEFORE UPDATE ON public.gps_divergencias
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- PARTE 6: Verificação final
-- ============================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migração concluída com sucesso!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Tabelas criadas/atualizadas:';
    RAISE NOTICE '- gps_emissions (com novos campos)';
    RAISE NOTICE '- gps_divergencias';
    RAISE NOTICE '========================================';
END $$;

