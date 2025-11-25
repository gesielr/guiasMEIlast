import { createClient } from '@supabase/supabase-js';
import { env } from '../../env';
import logger from '../../utils/logger';
import { buscarCnaesDoCnpj } from './cnae-service';
import { MunicipalParamsService } from '../../nfse/services/municipal-params.service';

const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

interface AllowedService {
  ctribnac: string;
  descricao: string;
  origem: 'auto' | 'manual' | 'fallback';
  valido_desde: string;
  valido_ate: string | null;
}

interface BuildAllowedServicesResult {
  allowlist: AllowedService[];
  needsUserConfirm: boolean;
  seeded: boolean;
}

/**
 * Constrói a allowlist de serviços permitidos para um CNPJ
 * Interseção: (candidatos do CNAE) ∩ (códigos administrados pelo município)
 */
export async function buildAllowedServicesForCNPJ(
  cnpj: string,
  codIBGE: string,
  competenciaISO: string // Formato: YYYY-MM
): Promise<BuildAllowedServicesResult> {
  logger.info('[CNAE Guard] Construindo allowlist de serviços', {
    cnpj,
    codIBGE,
    competenciaISO,
    timestamp: new Date().toISOString()
  });

  // 1. Buscar CNAEs do CNPJ
  const { principal, secundarios } = await buscarCnaesDoCnpj(cnpj);
  const cnaes: string[] = [];
  
  if (principal?.codigo) {
    // Normalizar CNAE (garantir formato sem hífen/barra)
    const cnaeNormalizado = principal.codigo.replace(/\D/g, '');
    cnaes.push(cnaeNormalizado);
  }
  
  for (const sec of secundarios) {
    if (sec.codigo) {
      const cnaeNormalizado = sec.codigo.replace(/\D/g, '');
      cnaes.push(cnaeNormalizado);
    }
  }

  if (cnaes.length === 0) {
    logger.warn('[CNAE Guard] Nenhum CNAE encontrado para o CNPJ', { cnpj });
    // Fallback: retornar todos os códigos administrados pelo município
    return await buildFallbackAllowlist(codIBGE, competenciaISO);
  }

  logger.info('[CNAE Guard] CNAEs encontrados', {
    cnpj,
    cnaes,
    qtdCnaes: cnaes.length
  });

  // 2. Buscar sementes CNAE → cTribNac (candidatos)
  logger.info('[CNAE Guard] Buscando sementes para CNAEs', {
    cnpj,
    cnaes,
    qtdCnaes: cnaes.length
  });
  
  const seeds = await admin
    .from('cnae_to_ctribnac_seed')
    .select('ctribnac, weight, source')
    .in('cnae_subclasse', cnaes)
    .order('weight', { ascending: false });

  if (seeds.error) {
    logger.error('[CNAE Guard] Erro ao buscar sementes', {
      error: seeds.error,
      cnaes,
      errorMessage: seeds.error.message,
      errorDetails: seeds.error
    });
    return await buildFallbackAllowlist(codIBGE, competenciaISO);
  }

  const candidatosOrdenados = (seeds.data || []).map(s => s.ctribnac);
  
  logger.info('[CNAE Guard] Resultado da busca de sementes', {
    cnpj,
    cnaesBuscados: cnaes,
    qtdSementesEncontradas: seeds.data?.length || 0,
    sementes: seeds.data?.slice(0, 5) || [],
    candidatos: candidatosOrdenados.slice(0, 5)
  });
  
  logger.info('[CNAE Guard] Candidatos encontrados via semente', {
    cnpj,
    qtdCandidatos: candidatosOrdenados.length,
    candidatos: candidatosOrdenados.slice(0, 10)
  });

  // 3. Buscar parâmetros municipais (códigos administrados)
  // ✅ CORREÇÃO: Usar código de serviço de 6 dígitos (padrão: '010000' para item '01')
  const paramsService = new MunicipalParamsService();
  let servicosHabilitados: Set<string> = new Set<string>();
  let apiMunicipalFuncionou = true;
  
  // Usar código padrão '010000' (item 01 da LC 116)
  const codigoServicoPadrao = '010000';
  
  // ✅ CORREÇÃO: Agora retorna Set vazio se API não disponível (não lança erro)
  servicosHabilitados = await paramsService.listarServicosHabilitados(
    codIBGE,
    competenciaISO,
    codigoServicoPadrao
  );
  
  // Se retornou Set vazio, significa que API não está disponível
  apiMunicipalFuncionou = servicosHabilitados.size > 0;
  
  if (apiMunicipalFuncionou) {
    logger.info('[CNAE Guard] Serviços habilitados no município', {
      codIBGE,
      competenciaISO,
      codigoServico: codigoServicoPadrao,
      qtdHabilitados: servicosHabilitados.size
    });
  } else {
    logger.warn('[CNAE Guard] API de parâmetros municipais não disponível (usando candidatos sem validação)', {
      codIBGE,
      competenciaISO,
      codigoServico: codigoServicoPadrao,
      qtdCandidatos: candidatosOrdenados.length,
      observacao: 'Usando candidatos do CNAE sem validação municipal. Validação final será feita no preflight/emissão.'
    });
  }

  // 4. Interseção: candidatos ∩ administrados (se API funcionou)
  let permitidos: string[] = [];
  
  if (apiMunicipalFuncionou && servicosHabilitados.size > 0) {
    // Se a API funcionou, fazer interseção
    permitidos = candidatosOrdenados.filter(c => 
      servicosHabilitados.has(c)
    );
    
    logger.info('[CNAE Guard] Interseção calculada', {
      cnpj,
      qtdCandidatos: candidatosOrdenados.length,
      qtdHabilitados: servicosHabilitados.size,
      qtdPermitidos: permitidos.length
    });
  } else {
    // Se a API não funcionou ou retornou vazio, usar todos os candidatos
    permitidos = candidatosOrdenados;
    
    logger.info('[CNAE Guard] Usando candidatos sem validação municipal (API não disponível)', {
      cnpj,
      qtdCandidatos: candidatosOrdenados.length,
      apiFuncionou: apiMunicipalFuncionou,
      qtdHabilitados: servicosHabilitados.size
    });
  }

  // 5. Se não encontrou candidatos, usar fallback
  if (permitidos.length === 0) {
    logger.warn('[CNAE Guard] Nenhuma interseção encontrada, usando fallback', {
      cnpj,
      codIBGE,
      qtdCandidatos: candidatosOrdenados.length,
      qtdHabilitados: servicosHabilitados.size,
      candidatos: candidatosOrdenados.slice(0, 5),
      habilitados: Array.from(servicosHabilitados).slice(0, 5)
    });
    const fallbackResult = await buildFallbackAllowlist(codIBGE, competenciaISO);
    
    // Se o fallback também estiver vazio, tentar usar os candidatos mesmo sem validação municipal
    // (melhor que nada - será validado no preflight)
    if (fallbackResult.allowlist.length === 0 && candidatosOrdenados.length > 0) {
      logger.warn('[CNAE Guard] Fallback vazio, usando candidatos sem validação municipal (será validado no preflight)', {
        cnpj,
        codIBGE,
        qtdCandidatos: candidatosOrdenados.length
      });
      
      const { data: catalogos } = await admin
        .from('catalogo_ctribnac')
        .select('ctribnac, descricao')
        .in('ctribnac', candidatosOrdenados.slice(0, 10)); // Limitar a 10 para não sobrecarregar
      
      const allowlist: AllowedService[] = candidatosOrdenados.slice(0, 10).map(ctribnac => {
        const catalogo = catalogos?.find(c => c.ctribnac === ctribnac);
        return {
          ctribnac,
          descricao: catalogo?.descricao || `Serviço código ${ctribnac}`,
          origem: 'auto' as const,
          valido_desde: competenciaISO + '-01',
          valido_ate: null
        };
      });
      
      return {
        allowlist,
        needsUserConfirm: true, // Precisa confirmação porque não foi validado municipalmente
        seeded: true
      };
    }
    
    return fallbackResult;
  }

  // 6. Buscar descrições do catálogo
  const { data: catalogos } = await admin
    .from('catalogo_ctribnac')
    .select('ctribnac, descricao')
    .in('ctribnac', permitidos);

  const allowlist: AllowedService[] = permitidos.map(ctribnac => {
    const catalogo = catalogos?.find(c => c.ctribnac === ctribnac);
    return {
      ctribnac,
      descricao: catalogo?.descricao || `Serviço código ${ctribnac}`,
      origem: 'auto' as const,
      valido_desde: competenciaISO + '-01', // Primeiro dia da competência
      valido_ate: null // Sem fim definido (será validado no preflight)
    };
  });

  // 7. Persistir allowlist
  await upsertAllowlist(cnpj, codIBGE, allowlist, competenciaISO);

  return {
    allowlist,
    needsUserConfirm: false,
    seeded: true
  };
}

/**
 * Fallback: retornar todos os códigos administrados pelo município
 */
async function buildFallbackAllowlist(
  codIBGE: string,
  competenciaISO: string
): Promise<BuildAllowedServicesResult> {
  logger.info('[CNAE Guard] Construindo allowlist fallback', {
    codIBGE,
    competenciaISO
  });

  const paramsService = new MunicipalParamsService();
  const servicosHabilitados = await paramsService.listarServicosHabilitados(
    codIBGE,
    competenciaISO,
    '01'
  );

  if (servicosHabilitados.size === 0) {
    logger.warn('[CNAE Guard] Nenhum serviço habilitado no município (API retornou vazio)', {
      codIBGE,
      competenciaISO,
      observacao: 'Isso pode indicar erro na API ou município sem serviços habilitados'
    });
    
    // Último recurso: retornar códigos comuns do catálogo (será validado no preflight)
    logger.info('[CNAE Guard] Tentando usar códigos comuns do catálogo como último recurso');
    const { data: codigosComuns } = await admin
      .from('catalogo_ctribnac')
      .select('ctribnac, descricao')
      .limit(10)
      .order('ctribnac', { ascending: true });
    
    if (codigosComuns && codigosComuns.length > 0) {
      logger.warn('[CNAE Guard] Usando códigos comuns do catálogo (não validados municipalmente)', {
        qtdCodigos: codigosComuns.length
      });
      
      const allowlist: AllowedService[] = codigosComuns.map(c => ({
        ctribnac: c.ctribnac,
        descricao: c.descricao,
        origem: 'fallback' as const,
        valido_desde: competenciaISO + '-01',
        valido_ate: null
      }));
      
      return {
        allowlist,
        needsUserConfirm: true,
        seeded: false
      };
    }
    
    return {
      allowlist: [],
      needsUserConfirm: false,
      seeded: false
    };
  }

  // Buscar descrições do catálogo
  const servicosHabilitadosArray = Array.from(servicosHabilitados) as string[];
  const { data: catalogos } = await admin
    .from('catalogo_ctribnac')
    .select('ctribnac, descricao')
    .in('ctribnac', servicosHabilitadosArray);

  const allowlist: AllowedService[] = servicosHabilitadosArray.map((ctribnac: string) => {
    const catalogo = catalogos?.find(c => c.ctribnac === ctribnac);
    return {
      ctribnac,
      descricao: catalogo?.descricao || `Serviço código ${ctribnac}`,
      origem: 'fallback' as const,
      valido_desde: competenciaISO + '-01',
      valido_ate: null
    };
  });

  return {
    allowlist,
    needsUserConfirm: true, // Precisa confirmação do usuário (não veio de CNAE)
    seeded: false
  };
}

/**
 * Persiste a allowlist no banco de dados
 */
async function upsertAllowlist(
  cnpj: string,
  codIBGE: string,
  allowlist: AllowedService[],
  competenciaISO: string
): Promise<void> {
  logger.info('[CNAE Guard] Persistindo allowlist', {
    cnpj,
    codIBGE,
    qtdServicos: allowlist.length
  });

  // Limpar allowlist antiga para esta competência
  await admin
    .from('cnpj_servicos_permitidos')
    .delete()
    .eq('cnpj', cnpj)
    .eq('cod_ibge', codIBGE)
    .eq('competencia_calculada', competenciaISO);

  // Inserir nova allowlist
  if (allowlist.length > 0) {
    const records = allowlist.map(service => ({
      cnpj,
      cod_ibge: codIBGE,
      ctribnac: service.ctribnac,
      origem: service.origem,
      valido_desde: service.valido_desde,
      valido_ate: service.valido_ate,
      competencia_calculada: competenciaISO
    }));

    const { error } = await admin
      .from('cnpj_servicos_permitidos')
      .insert(records);

    if (error) {
      logger.error('[CNAE Guard] Erro ao persistir allowlist', {
        error,
        cnpj,
        codIBGE
      });
      throw error;
    }
  }

  logger.info('[CNAE Guard] Allowlist persistida com sucesso', {
    cnpj,
    codIBGE,
    qtdServicos: allowlist.length
  });
}

/**
 * Busca allowlist persistida para um CNPJ
 */
export async function getAllowedServicesForCNPJ(
  cnpj: string,
  codIBGE: string,
  competenciaISO: string
): Promise<AllowedService[]> {
  const { data, error } = await admin
    .from('cnpj_servicos_permitidos')
    .select('ctribnac, origem, valido_desde, valido_ate')
    .eq('cnpj', cnpj)
    .eq('cod_ibge', codIBGE)
    .eq('competencia_calculada', competenciaISO)
    .is('valido_ate', null); // Apenas vigentes

  if (error) {
    logger.error('[CNAE Guard] Erro ao buscar allowlist', {
      error,
      cnpj,
      codIBGE
    });
    return [];
  }

  // Buscar descrições do catálogo
  if (data && data.length > 0) {
    const ctribnacs = data.map(d => d.ctribnac);
    const { data: catalogos } = await admin
      .from('catalogo_ctribnac')
      .select('ctribnac, descricao')
      .in('ctribnac', ctribnacs);

    return data.map(record => {
      const catalogo = catalogos?.find(c => c.ctribnac === record.ctribnac);
      return {
        ctribnac: record.ctribnac,
        descricao: catalogo?.descricao || `Serviço código ${record.ctribnac}`,
        origem: record.origem as 'auto' | 'manual' | 'fallback',
        valido_desde: record.valido_desde,
        valido_ate: record.valido_ate
      };
    });
  }

  return [];
}

/**
 * Preflight: valida se um código está habilitado na competência específica
 */
export async function preflightCodigoTributacao(
  ctribnac: string,
  codIBGE: string,
  competenciaISO: string,
  itemListaLc116: string = '01'
): Promise<{ valido: boolean; motivo?: string }> {
  logger.info('[CNAE Guard] Preflight de código de tributação', {
    ctribnac,
    codIBGE,
    competenciaISO,
    itemListaLc116
  });

  // Verificar se está na allowlist do CNPJ (se disponível)
  // Mas a validação final é sempre via Parâmetros Municipais

  try {
    const paramsService = new MunicipalParamsService();
    
    // Tentar listar serviços habilitados diretamente para detectar erros da API
    let servicosHabilitados: Set<string> = new Set<string>();
    let apiFuncionou = true;
    
    try {
      servicosHabilitados = await paramsService.listarServicosHabilitados(
        codIBGE,
        competenciaISO,
        itemListaLc116
      );
    } catch (error: any) {
      // Se a API falhar (404, timeout, etc), não bloquear
      apiFuncionou = false;
      logger.warn('[CNAE Guard] API de parâmetros municipais falhou (permitindo continuar)', {
        ctribnac,
        codIBGE,
        competenciaISO,
        error: error?.message || error,
        observacao: 'Validação final será feita na emissão pela API Nacional'
      });
      
      // Se a API falhou, permitir continuar imediatamente
      return { 
        valido: true,
        motivo: 'Validação municipal não disponível - será validado na emissão'
      };
    }
    
    // ⚠️ IMPORTANTE: Se a API funcionou mas retornou vazio, permitir continuar
    // Muitos municípios não têm API municipal (ex: Garopaba)
    // A validação final será feita pela API Nacional na emissão
    if (servicosHabilitados.size === 0) {
      logger.warn('[CNAE Guard] API retornou lista vazia ou município sem API municipal (permitindo continuar)', {
        ctribnac,
        codIBGE,
        competenciaISO,
        observacao: 'Município pode não ter API municipal. Validação final será feita na emissão pela API Nacional do Sistema NFS-e.'
      });
      return { 
        valido: true,
        motivo: 'Município sem API municipal - será validado na emissão pela API Nacional'
      };
    }
    
    // Verificar se o código está na lista
    const isHabilitado = servicosHabilitados.has(ctribnac);
    
    if (!isHabilitado) {
      logger.warn('[CNAE Guard] ⚠️ Código não encontrado na lista municipal (mas permitindo continuar)', {
        ctribnac,
        codIBGE,
        competenciaISO,
        qtdServicosHabilitados: servicosHabilitados.size,
        servicosDisponiveis: Array.from(servicosHabilitados).slice(0, 10),
        observacao: 'A lista municipal pode estar incompleta. Validação final será feita na emissão pela API Nacional.'
      });
      
      // ✅ CORREÇÃO: NÃO BLOQUEAR quando código não está na lista municipal
      // Muitos municípios não têm API municipal completa ou atualizada
      // A validação final será feita pela API Nacional na emissão (erro E0312 se inválido)
      return { 
        valido: true,
        motivo: `Código ${ctribnac} não encontrado na lista municipal, mas será validado na emissão pela API Nacional`
      };
    }

    logger.info('[CNAE Guard] Código validado no preflight', {
      ctribnac,
      codIBGE,
      competenciaISO
    });

    return { valido: true };
  } catch (error: any) {
    // Se qualquer erro inesperado ocorrer, não bloquear
    logger.warn('[CNAE Guard] Erro inesperado no preflight (permitindo continuar)', {
      ctribnac,
      codIBGE,
      competenciaISO,
      error: error?.message || error,
      observacao: 'Validação final será feita na emissão pela API Nacional'
    });
    
    return { 
      valido: true,
      motivo: 'Erro na validação municipal - será validado na emissão'
    };
  }
}

