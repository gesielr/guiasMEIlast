-- Migração: Adicionar campos para estratégia híbrida de GPS
-- Data: 2025-01-09

-- Adicionar colunas à tabela gps_emissions (se não existir)
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
    END IF;
    
    -- Data de validação
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'gps_emissions' 
        AND column_name = 'validado_em'
    ) THEN
        ALTER TABLE public.gps_emissions 
        ADD COLUMN validado_em TIMESTAMP;
        
        COMMENT ON COLUMN public.gps_emissions.validado_em IS 'Data/hora da validação no SAL';
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
    END IF;
END $$;

-- Criar tabela de divergências
CREATE TABLE IF NOT EXISTS public.gps_divergencias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    guia_id UUID REFERENCES public.gps_emissions(id) ON DELETE CASCADE,
    competencia VARCHAR(7) NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    codigo_local VARCHAR(48) NOT NULL,
    codigo_sal VARCHAR(48) NOT NULL,
    tipo_divergencia VARCHAR(50) NOT NULL,
    resolvido BOOLEAN DEFAULT FALSE,
    resolvido_em TIMESTAMP,
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Comentários na tabela de divergências
COMMENT ON TABLE public.gps_divergencias IS 'Registra divergências entre GPS local e SAL';
COMMENT ON COLUMN public.gps_divergencias.tipo_divergencia IS 'Tipo: codigo_barras_diferente, valor_diferente, etc';
COMMENT ON COLUMN public.gps_divergencias.resolvido IS 'Se a divergência foi resolvida';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_gps_divergencias_usuario ON public.gps_divergencias(usuario_id);
CREATE INDEX IF NOT EXISTS idx_gps_divergencias_guia ON public.gps_divergencias(guia_id);
CREATE INDEX IF NOT EXISTS idx_gps_divergencias_resolvido ON public.gps_divergencias(resolvido);
CREATE INDEX IF NOT EXISTS idx_gps_emissions_metodo ON public.gps_emissions(metodo_emissao);
CREATE INDEX IF NOT EXISTS idx_gps_emissions_validado ON public.gps_emissions(validado_sal);

-- Trigger para atualizar updated_at
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
