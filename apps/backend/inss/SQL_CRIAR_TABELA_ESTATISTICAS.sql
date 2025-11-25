-- ============================================================
-- CRIAR TABELA DE ESTATÍSTICAS GPS
-- Fase 3: Otimizações
-- ============================================================

-- Criar tabela de estatísticas diárias
CREATE TABLE IF NOT EXISTS public.gps_estatisticas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data DATE DEFAULT CURRENT_DATE UNIQUE NOT NULL,
    total_emitidas INTEGER DEFAULT 0,
    emitidas_local INTEGER DEFAULT 0,
    emitidas_sal_validado INTEGER DEFAULT 0,
    emitidas_sal_oficial INTEGER DEFAULT 0,
    validacoes_sal INTEGER DEFAULT 0,
    divergencias INTEGER DEFAULT 0,
    divergencias_resolvidas INTEGER DEFAULT 0,
    tempo_medio_local_ms INTEGER,
    tempo_medio_sal_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comentários
COMMENT ON TABLE public.gps_estatisticas IS 'Estatísticas diárias de emissões GPS';
COMMENT ON COLUMN public.gps_estatisticas.data IS 'Data das estatísticas (uma linha por dia)';
COMMENT ON COLUMN public.gps_estatisticas.tempo_medio_local_ms IS 'Tempo médio de geração local em milissegundos';
COMMENT ON COLUMN public.gps_estatisticas.tempo_medio_sal_ms IS 'Tempo médio de geração via SAL em milissegundos';

-- Criar índice único em data
CREATE UNIQUE INDEX IF NOT EXISTS idx_gps_estatisticas_data ON public.gps_estatisticas(data);

-- Criar índice para consultas por período
CREATE INDEX IF NOT EXISTS idx_gps_estatisticas_data_desc ON public.gps_estatisticas(data DESC);

-- Habilitar RLS
ALTER TABLE public.gps_estatisticas ENABLE ROW LEVEL SECURITY;

-- Política RLS: apenas usuários autenticados podem ler
CREATE POLICY "authenticated users can read statistics"
    ON public.gps_estatisticas
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_gps_estatisticas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_gps_estatisticas_updated_at ON public.gps_estatisticas;
CREATE TRIGGER trigger_update_gps_estatisticas_updated_at
    BEFORE UPDATE ON public.gps_estatisticas
    FOR EACH ROW
    EXECUTE FUNCTION update_gps_estatisticas_updated_at();

-- ============================================================
-- FUNÇÃO PARA POPULAR ESTATÍSTICAS DIÁRIAS
-- ============================================================

CREATE OR REPLACE FUNCTION public.popular_estatisticas_gps(data_ref DATE DEFAULT CURRENT_DATE)
RETURNS void AS $$
DECLARE
    total_emitidas_count INTEGER;
    emitidas_local_count INTEGER;
    emitidas_sal_validado_count INTEGER;
    emitidas_sal_oficial_count INTEGER;
    validacoes_sal_count INTEGER;
    divergencias_count INTEGER;
    divergencias_resolvidas_count INTEGER;
BEGIN
    -- Contar GPS emitidas no dia
    SELECT COUNT(*) INTO total_emitidas_count
    FROM public.gps_emissions
    WHERE DATE(created_at) = data_ref;
    
    -- Contar por método
    SELECT COUNT(*) INTO emitidas_local_count
    FROM public.gps_emissions
    WHERE DATE(created_at) = data_ref
    AND metodo_emissao = 'local';
    
    SELECT COUNT(*) INTO emitidas_sal_validado_count
    FROM public.gps_emissions
    WHERE DATE(created_at) = data_ref
    AND metodo_emissao = 'sal_validado';
    
    SELECT COUNT(*) INTO emitidas_sal_oficial_count
    FROM public.gps_emissions
    WHERE DATE(created_at) = data_ref
    AND metodo_emissao = 'sal_oficial';
    
    -- Contar validações SAL
    SELECT COUNT(*) INTO validacoes_sal_count
    FROM public.gps_emissions
    WHERE DATE(created_at) = data_ref
    AND validado_sal = true;
    
    -- Contar divergências
    SELECT COUNT(*) INTO divergencias_count
    FROM public.gps_divergencias
    WHERE DATE(created_at) = data_ref
    AND resolvido = false;
    
    SELECT COUNT(*) INTO divergencias_resolvidas_count
    FROM public.gps_divergencias
    WHERE DATE(created_at) = data_ref
    AND resolvido = true;
    
    -- Inserir ou atualizar estatísticas
    INSERT INTO public.gps_estatisticas (
        data,
        total_emitidas,
        emitidas_local,
        emitidas_sal_validado,
        emitidas_sal_oficial,
        validacoes_sal,
        divergencias,
        divergencias_resolvidas
    ) VALUES (
        data_ref,
        total_emitidas_count,
        emitidas_local_count,
        emitidas_sal_validado_count,
        emitidas_sal_oficial_count,
        validacoes_sal_count,
        divergencias_count,
        divergencias_resolvidas_count
    )
    ON CONFLICT (data) DO UPDATE SET
        total_emitidas = EXCLUDED.total_emitidas,
        emitidas_local = EXCLUDED.emitidas_local,
        emitidas_sal_validado = EXCLUDED.emitidas_sal_validado,
        emitidas_sal_oficial = EXCLUDED.emitidas_sal_oficial,
        validacoes_sal = EXCLUDED.validacoes_sal,
        divergencias = EXCLUDED.divergencias,
        divergencias_resolvidas = EXCLUDED.divergencias_resolvidas,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Comentário na função
COMMENT ON FUNCTION public.popular_estatisticas_gps IS 'Popula estatísticas GPS para uma data específica (padrão: hoje)';

-- ============================================================
-- VERIFICAR SE FOI CRIADO CORRETAMENTE
-- ============================================================

SELECT 
    'Tabela criada' AS status,
    COUNT(*) AS total_linhas
FROM public.gps_estatisticas;

