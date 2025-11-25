-- ============================================================
-- SQL PARA EXECUTAR NO SUPABASE EDITOR SQL
-- Sistema Híbrido de GPS - Migração Completa
-- ============================================================
-- INSTRUÇÕES:
-- 1. Copie TODO este código
-- 2. Cole no SQL Editor do Supabase
-- 3. Execute (Run ou Ctrl+Enter)
-- ============================================================

-- Verificar se tabela gps_emissions existe, se não criar
CREATE TABLE IF NOT EXISTS public.gps_emissions (
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

-- Habilitar RLS se ainda não estiver habilitado
ALTER TABLE public.gps_emissions ENABLE ROW LEVEL SECURITY;

-- Criar política RLS se não existir
DROP POLICY IF EXISTS "user can manage own gps" ON public.gps_emissions;
CREATE POLICY "user can manage own gps"
    ON public.gps_emissions
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Adicionar colunas novas (se não existirem)
ALTER TABLE public.gps_emissions 
ADD COLUMN IF NOT EXISTS metodo_emissao VARCHAR(50) DEFAULT 'local',
ADD COLUMN IF NOT EXISTS validado_sal BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS validado_em TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS codigo_barras VARCHAR(48);

-- Remover tabela de divergências se existir (para recriar corretamente)
DROP TABLE IF EXISTS public.gps_divergencias CASCADE;

-- Criar tabela de divergências
CREATE TABLE public.gps_divergencias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Habilitar RLS na tabela de divergências
ALTER TABLE public.gps_divergencias ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS para divergências
CREATE POLICY "user can view own divergencias"
    ON public.gps_divergencias
    FOR SELECT USING (auth.uid() = usuario_id);

CREATE POLICY "user can insert own divergencias"
    ON public.gps_divergencias
    FOR INSERT WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "user can update own divergencias"
    ON public.gps_divergencias
    FOR UPDATE USING (auth.uid() = usuario_id);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_gps_divergencias_usuario ON public.gps_divergencias(usuario_id);
CREATE INDEX IF NOT EXISTS idx_gps_divergencias_guia ON public.gps_divergencias(guia_id);
CREATE INDEX IF NOT EXISTS idx_gps_divergencias_resolvido ON public.gps_divergencias(resolvido);
CREATE INDEX IF NOT EXISTS idx_gps_emissions_metodo ON public.gps_emissions(metodo_emissao);
CREATE INDEX IF NOT EXISTS idx_gps_emissions_validado ON public.gps_emissions(validado_sal);

-- Criar função para trigger updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_gps_divergencias_updated_at ON public.gps_divergencias;
CREATE TRIGGER update_gps_divergencias_updated_at
    BEFORE UPDATE ON public.gps_divergencias
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Verificação final (opcional - mostra mensagem de sucesso)
DO $$
BEGIN
    RAISE NOTICE '✅ Migração concluída com sucesso!';
    RAISE NOTICE '✅ Tabela gps_emissions atualizada';
    RAISE NOTICE '✅ Tabela gps_divergencias criada';
END $$;

