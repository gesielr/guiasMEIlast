// Serviço para gerenciar CNAE e mapeamento para códigos de tributação
import logger from '../../utils/logger';
import { MunicipalParamsService } from '../../nfse/services/municipal-params.service';
import { createSupabaseClients } from '../../../services/supabase';

const { admin } = createSupabaseClients();

export interface CnaeData {
  codigo: string; // Ex: "6201-5/00"
  descricao: string; // Ex: "Desenvolvimento de programas de computador sob encomenda"
}

export interface CodigoTributacaoData {
  cTribNac: string; // Ex: "140301"
  descricao: string; // Ex: "Desenvolvimento de programas de computador sob encomenda"
  itemListaLc116: string; // Ex: "01"
  validado: boolean; // Se foi validado nos parâmetros municipais
}

/**
 * Busca dados do CNPJ via BrasilAPI e extrai CNAEs
 * Cacheia os resultados no perfil do usuário
 */
export async function buscarCnaesDoCnpj(
  cnpj: string,
  userId?: string
): Promise<{
  principal: CnaeData | null;
  secundarios: CnaeData[];
}> {
  const cnpjLimpo = cnpj.replace(/\D/g, '');
  
  if (cnpjLimpo.length !== 14) {
    logger.warn('[CNAE Service] CNPJ inválido', { cnpj });
    return { principal: null, secundarios: [] };
  }
  
  // Tentar buscar do cache no perfil primeiro (se userId fornecido)
  if (userId) {
    try {
      logger.info('[CNAE Service] Verificando cache de CNAEs no perfil', { userId, cnpj: cnpjLimpo });
      const { data: profileData, error: profileError } = await admin
        .from('profiles')
        .select('cnae_principal, cnaes_secundarios, cnaes_updated_at')
        .eq('id', userId)
        .single();
      
      if (profileError) {
        logger.warn('[CNAE Service] Erro ao buscar perfil para cache', { 
          error: profileError.message,
          userId 
        });
      } else {
        logger.info('[CNAE Service] Dados do perfil obtidos', {
          userId,
          temCnaePrincipal: !!profileData?.cnae_principal,
          cnaePrincipal: profileData?.cnae_principal,
          cnaesUpdatedAt: profileData?.cnaes_updated_at
        });
      }
      
      // Se há CNAEs cacheados e foram atualizados há menos de 30 dias, usar cache
      if (profileData?.cnae_principal) {
        const updatedAt = profileData.cnaes_updated_at 
          ? new Date(profileData.cnaes_updated_at) 
          : null;
        const daysSinceUpdate = updatedAt 
          ? (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24)
          : Infinity;
        
        logger.info('[CNAE Service] Verificando validade do cache', {
          userId,
          daysSinceUpdate,
          isValid: daysSinceUpdate < 30
        });
        
        if (daysSinceUpdate < 30) {
          logger.info('[CNAE Service] Usando CNAEs do cache', { userId, daysSinceUpdate });
          
          const secundarios: CnaeData[] = [];
          if (Array.isArray(profileData.cnaes_secundarios)) {
            for (const cnae of profileData.cnaes_secundarios) {
              if (cnae?.code && cnae?.description) {
                secundarios.push({
                  codigo: cnae.code,
                  descricao: cnae.description
                });
              }
            }
          }
          
          return {
            principal: {
              codigo: profileData.cnae_principal,
              descricao: '' // Será buscado se necessário
            },
            secundarios
          };
        } else {
          logger.info('[CNAE Service] Cache expirado, buscando da API', {
            userId,
            daysSinceUpdate
          });
        }
      } else {
        logger.info('[CNAE Service] Nenhum CNAE no cache, buscando da API', { userId });
      }
    } catch (error) {
      logger.warn('[CNAE Service] Erro ao buscar cache de CNAEs', { 
        error: (error as Error).message,
        userId 
      });
      // Continuar para buscar da API
    }
  }
  
  try {
    // Tentar BrasilAPI primeiro
    let data: any = null;
    let apiUsada = 'brasilapi';
    
    try {
      const brasilApiUrl = `https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`;
      logger.info('[CNAE Service] Buscando CNAEs via BrasilAPI', { cnpj: cnpjLimpo });
      
      const brasilApiResponse = await fetch(brasilApiUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'GuiasMEI/1.0'
        }
      });
      
      if (brasilApiResponse.ok) {
        const brasilApiData = await brasilApiResponse.json();
        logger.info('[CNAE Service] Dados obtidos da BrasilAPI', { 
          cnpj: cnpjLimpo,
          temCnaeFiscal: !!brasilApiData.cnae_fiscal,
          cnaeFiscal: brasilApiData.cnae_fiscal,
          cnaeFiscalDescricao: brasilApiData.cnae_fiscal_descricao,
          temCnaesSecundarios: Array.isArray(brasilApiData.cnaes_secundarios),
          qtdCnaesSecundarios: brasilApiData.cnaes_secundarios?.length || 0,
          primeiroCnaeSecundario: brasilApiData.cnaes_secundarios?.[0]
        });
        
        // Converter formato BrasilAPI para formato compatível
        // BrasilAPI usa: cnae_fiscal, cnae_fiscal_descricao, cnaes_secundarios
        data = {
          primary_activity: brasilApiData.cnae_fiscal ? {
            code: brasilApiData.cnae_fiscal.replace(/[^\d]/g, ''), // Remove hífen e barra: "6201-5/00" → "6201500"
            description: brasilApiData.cnae_fiscal_descricao || ''
          } : null,
          secondary_activities: (brasilApiData.cnaes_secundarios || []).map((cnae: any) => {
            // BrasilAPI pode retornar cnaes_secundarios como array de objetos com codigo/descricao
            // ou como array de strings. Vamos tratar ambos os casos.
            const codigo = typeof cnae === 'string' 
              ? cnae.replace(/[^\d]/g, '')
              : (cnae.codigo || cnae.code || '').replace(/[^\d]/g, '');
            const descricao = typeof cnae === 'string' 
              ? ''
              : (cnae.descricao || cnae.description || '');
            
            return {
              code: codigo,
              description: descricao
            };
          })
        };
        
        logger.info('[CNAE Service] Dados da BrasilAPI convertidos', {
          cnpj: cnpjLimpo,
          temPrimaryActivity: !!data.primary_activity,
          primaryActivityCode: data.primary_activity?.code,
          qtdSecondaryActivities: data.secondary_activities?.length || 0
        });
      } else {
        logger.warn('[CNAE Service] BrasilAPI retornou erro, tentando ReceitaWS', { 
          status: brasilApiResponse.status, 
          cnpj: cnpjLimpo 
        });
        throw new Error(`BrasilAPI retornou ${brasilApiResponse.status}`);
      }
    } catch (brasilApiError) {
      // Fallback para ReceitaWS
      logger.info('[CNAE Service] Tentando buscar via ReceitaWS', { cnpj: cnpjLimpo });
      apiUsada = 'receitaws';
      
      const receitawsUrl = `https://www.receitaws.com.br/v1/cnpj/${cnpjLimpo}`;
      const receitawsResponse = await fetch(receitawsUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'GuiasMEI/1.0'
        }
      });
      
      if (!receitawsResponse.ok) {
        logger.error('[CNAE Service] Erro ao buscar CNPJ na ReceitaWS', { 
          status: receitawsResponse.status, 
          cnpj: cnpjLimpo 
        });
        return { principal: null, secundarios: [] };
      }
      
      const receitawsData = await receitawsResponse.json();
      
      // Verificar se retornou erro da API
      if (receitawsData.status === 'ERROR' || receitawsData.message) {
        logger.warn('[CNAE Service] CNPJ não encontrado na ReceitaWS', { 
          cnpj: cnpjLimpo,
          message: receitawsData.message 
        });
        return { principal: null, secundarios: [] };
      }
      
      // Converter formato ReceitaWS para formato compatível
      data = {
        primary_activity: receitawsData.atividade_principal ? {
          code: receitawsData.atividade_principal[0]?.code || '',
          description: receitawsData.atividade_principal[0]?.text || ''
        } : null,
        secondary_activities: (receitawsData.atividades_secundarias || []).map((atv: any) => ({
          code: atv.code || '',
          description: atv.text || ''
        }))
      };
      
      logger.info('[CNAE Service] Dados obtidos da ReceitaWS e convertidos', { cnpj: cnpjLimpo });
    }
    
    if (!data) {
      logger.error('[CNAE Service] Nenhum dado obtido das APIs', { cnpj: cnpjLimpo });
      return { principal: null, secundarios: [] };
    }
    
    logger.info('[CNAE Service] Resposta da API recebida', {
      cnpj: cnpjLimpo,
      apiUsada,
      temPrimaryActivity: !!data.primary_activity,
      primaryActivityCode: data.primary_activity?.code,
      primaryActivityDescription: data.primary_activity?.description,
      temSecondaryActivities: Array.isArray(data.secondary_activities),
      qtdSecondaryActivities: data.secondary_activities?.length || 0,
      dataKeys: Object.keys(data)
    });
    
    // Extrair CNAE principal
    let principal: CnaeData | null = null;
    if (data.primary_activity) {
      principal = {
        codigo: data.primary_activity.code || '',
        descricao: data.primary_activity.description || ''
      };
      logger.info('[CNAE Service] CNAE principal extraído', {
        codigo: principal.codigo,
        descricao: principal.descricao
      });
    } else {
      logger.warn('[CNAE Service] Nenhum primary_activity na resposta da API', {
        cnpj: cnpjLimpo,
        apiUsada,
        dataKeys: Object.keys(data)
      });
    }
    
    // Extrair CNAEs secundários
    const secundarios: CnaeData[] = [];
    if (Array.isArray(data.secondary_activities)) {
      for (const atividade of data.secondary_activities) {
        if (atividade.code && atividade.description) {
          secundarios.push({
            codigo: atividade.code,
            descricao: atividade.description
          });
        }
      }
    }
    
    logger.info('[CNAE Service] CNAEs encontrados', {
      cnpj: cnpjLimpo,
      temPrincipal: !!principal,
      principalCodigo: principal?.codigo,
      principalDescricao: principal?.descricao,
      qtdSecundarios: secundarios.length
    });
    
    // Cachear no perfil se userId fornecido
    if (userId && principal) {
      try {
        const secundariosForCache = secundarios.map(s => ({
          code: s.codigo,
          description: s.descricao
        }));
        
        await admin
          .from('profiles')
          .update({
            cnae_principal: principal.codigo,
            cnaes_secundarios: secundariosForCache,
            cnaes_updated_at: new Date().toISOString()
          })
          .eq('id', userId);
        
        logger.info('[CNAE Service] CNAEs cacheados no perfil', { userId });
      } catch (error) {
        logger.warn('[CNAE Service] Erro ao cachear CNAEs', { 
          error: (error as Error).message,
          userId 
        });
      }
    }
    
    return { principal, secundarios };
  } catch (error) {
    logger.error('[CNAE Service] Erro ao buscar CNAEs', { 
      error: (error as Error).message,
      cnpj: cnpjLimpo 
    });
    return { principal: null, secundarios: [] };
  }
}

/**
 * Mapeia CNAE para códigos de tributação nacional (cTribNac)
 * Consulta primeiro a tabela do Supabase, depois usa mapeamento hardcoded como fallback
 */
export async function mapearCnaeParaCodigosTributacao(cnae: string): Promise<string[]> {
  // Normalizar CNAE (remover hífen e barra: "6201-5/00" → "6201500")
  const cnaeNormalizado = cnae.replace(/\D/g, '');
  
  if (!cnaeNormalizado || cnaeNormalizado.length < 4) {
    logger.warn('[CNAE Service] CNAE inválido para mapeamento', { 
      cnae,
      cnaeNormalizado,
      recomendacao: 'CNAE deve ter pelo menos 4 dígitos. Usar descrição manual.'
    });
    return []; // Retornar vazio para forçar descrição manual
  }
  
  // Buscar mapeamento no Supabase primeiro
  try {
    const { data: mapeamentos, error } = await admin
      .from('cnae_tributacao')
      .select('codigo_tributacao')
      .eq('cnae', cnaeNormalizado)
      .eq('ativo', true);
    
    if (!error && mapeamentos && mapeamentos.length > 0) {
      const codigos = mapeamentos.map(m => m.codigo_tributacao);
      logger.info('[CNAE Service] Mapeamento encontrado no Supabase', { 
        cnae: cnaeNormalizado, 
        codigos 
      });
      return codigos;
    }
    
    // Se não encontrou por CNAE completo, tentar buscar por prefixo (primeiros 4 dígitos)
    const prefixo4 = cnaeNormalizado.substring(0, 4);
    const { data: mapeamentosPrefix } = await admin
      .from('cnae_tributacao')
      .select('codigo_tributacao')
      .like('cnae', `${prefixo4}%`)
      .eq('ativo', true)
      .limit(5); // Limitar a 5 resultados
    
    if (mapeamentosPrefix && mapeamentosPrefix.length > 0) {
      const codigos = mapeamentosPrefix.map(m => m.codigo_tributacao);
      logger.info('[CNAE Service] Mapeamento encontrado por prefixo no Supabase', { 
        cnae: cnaeNormalizado,
        prefixo: prefixo4,
        codigos 
      });
      return codigos;
    }
  } catch (error) {
    logger.warn('[CNAE Service] Erro ao buscar mapeamento no Supabase', { 
      error: (error as Error).message,
      cnae: cnaeNormalizado 
    });
  }
  
  // Fallback: usar mapeamento hardcoded
  return mapearCnaeParaCodigosTributacaoFallback(cnae);
}

/**
 * Mapeamento hardcoded como fallback (usado quando não há dados no Supabase)
 */
function mapearCnaeParaCodigosTributacaoFallback(cnae: string): string[] {
  // Mapeamento simplificado CNAE → códigos de tributação
  // Formato: "6201-5/00" → códigos possíveis
  // 
  // Estrutura do código de tributação: 6 dígitos
  // - Item (2 dígitos) + Subitem (2 dígitos) + Desdobro (2 dígitos)
  // 
  // Exemplo: CNAE 6201-5/00 (Desenvolvimento de programas de computador)
  // Pode mapear para: 140301 (Desenvolvimento de programas de computador sob encomenda)
  
  const cnaeLimpo = cnae.replace(/\D/g, '').substring(0, 4); // Primeiros 4 dígitos
  
  logger.info('[CNAE Service] Mapeando CNAE (fallback)', {
    cnaeOriginal: cnae,
    cnaeLimpo,
    cnaeCompleto: cnae.replace(/\D/g, '')
  });
  
  // Mapeamento básico (será expandido conforme necessário)
  const mapeamentos: Record<string, string[]> = {
    // Informática e Tecnologia
    '6201': ['140301', '140302'], // Desenvolvimento de programas de computador
    '6202': ['140401', '140402'], // Consultoria em tecnologia da informação
    '6203': ['140501'], // Gestão de dados
    '6204': ['140601'], // Processamento de dados
    '6209': ['140901'], // Suporte técnico
    
    // Serviços diversos
    '8121': ['140101'], // Limpeza de prédios
    '8122': ['140201'], // Limpeza de salas
    '8129': ['140301'], // Outras atividades de limpeza
    
    // Serviços contábeis
    '6920': ['140701'], // Atividades de contabilidade
    
    // Serviços de design
    '7410': ['140801'], // Design de interiores
    '7420': ['140901', '141201'], // Design gráfico e Fotografia
    
    // Serviços de marketing
    '7311': ['141001'], // Agências de publicidade
    '7312': ['141101'], // Criação de conteúdo
    
    // Serviços de tradução
    '7430': ['141301'], // Tradução e interpretação
    
    // Serviços de organização de eventos
    '8230': ['141401'], // Organização de eventos
    
    // Serviços de manutenção
    '9511': ['141501'], // Manutenção de equipamentos
    
    // Serviços de consultoria
    '7020': ['141601'], // Consultoria em gestão
    '7111': ['141701'], // Consultoria em arquitetura
    '7112': ['141801'], // Consultoria em engenharia
    
    // NOTA: CNAEs 9700 (Serviços domésticos) e 5620 (Fornecimento de alimentos)
    // não têm mapeamento hardcoded porque requerem códigos específicos da LC 116/2003
    // que podem variar por município e regime tributário.
    // O sistema deve buscar na tabela cnae_tributacao do Supabase ou usar descrição manual.
  };
  
  // Buscar mapeamento direto
  if (mapeamentos[cnaeLimpo]) {
    logger.info('[CNAE Service] Mapeamento encontrado (direto)', {
      cnaeLimpo,
      codigos: mapeamentos[cnaeLimpo]
    });
    return mapeamentos[cnaeLimpo];
  }
  
  // Se não encontrou, tentar buscar por prefixo (ex: 6201 → 620)
  const prefixo3 = cnaeLimpo.substring(0, 3);
  for (const [key, value] of Object.entries(mapeamentos)) {
    if (key.startsWith(prefixo3)) {
      logger.info('[CNAE Service] Mapeamento encontrado (por prefixo)', {
        cnaeLimpo,
        prefixo3,
        keyEncontrado: key,
        codigos: value
      });
      return value;
    }
  }
  
  // Fallback: retornar array vazio para forçar busca na tabela ou descrição manual
  // Não usar código genérico porque pode não ser válido para o CNAE específico
  logger.warn('[CNAE Service] CNAE não mapeado no fallback hardcoded', { 
    cnae,
    cnaeLimpo,
    prefixo3,
    mapeamentosDisponiveis: Object.keys(mapeamentos),
    recomendacao: 'Verificar tabela cnae_tributacao no Supabase ou usar descrição manual'
  });
  return []; // Retornar vazio para forçar busca na tabela ou descrição manual
}

/**
 * Valida códigos de tributação nos Parâmetros Municipais
 * e retorna apenas os válidos para o município na competência especificada
 */
export async function validarCodigosTributacaoMunicipio(
  codigos: string[],
  municipioIbge: string,
  codigoServico: string, // Código LC 116 de 6 dígitos (ex: '140101', '071000') ou item (ex: '01' -> '010000')
  competencia?: string // Formato: YYYY-MM
): Promise<CodigoTributacaoData[]> {
  const paramsService = new MunicipalParamsService();
  const codigosValidos: CodigoTributacaoData[] = [];
  
  // Se competência não fornecida, usar mês atual
  const competenciaUsar = competencia || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  
  // Converter código de serviço para 6 dígitos se necessário
  // Se vier como '01' ou '07', converter para '010000' ou '070000'
  // Se vier como '07.10', converter para '071000'
  let codigoServico6dig = codigoServico.replace(/\./g, '').padEnd(6, '0');
  
  // Extrair item da LC 116 do código de serviço para usar no retorno
  const itemListaLc116 = codigoServico6dig.substring(0, 2);
  
  // Listar serviços habilitados no município
  let servicosHabilitados: Set<string> = new Set();
  let apiFuncionou = false;
  
  // ✅ CORREÇÃO: Agora retorna Set vazio se API não disponível (não lança erro)
  servicosHabilitados = await paramsService.listarServicosHabilitados(
    municipioIbge, 
    competenciaUsar,
    codigoServico6dig
  );
  
  // Se retornou Set vazio, significa que API não está disponível
  apiFuncionou = servicosHabilitados.size > 0;
  
  if (!apiFuncionou) {
    logger.warn('[CNAE Service] API municipal não disponível - permitindo códigos com aviso', {
      municipioIbge,
      competencia: competenciaUsar,
      codigoServico: codigoServico6dig,
      observacao: 'Não bloqueando emissão - validação final será feita pela API Nacional'
    });
  }
  
  logger.info('[CNAE Service] Validando códigos de tributação no município', {
    municipioIbge,
    competencia: competenciaUsar,
    qtdCodigosParaValidar: codigos.length,
    qtdServicosHabilitados: servicosHabilitados.size,
    apiFuncionou
  });
  
  for (const cTribNac of codigos) {
    // ✅ CORREÇÃO: Se a API funcionou e retornou lista, validar rigorosamente
    // Se a API falhou (município sem API), permitir código - validação final será feita pela API Nacional
    // Muitos municípios não têm API municipal (ex: Garopaba), então não devemos bloquear aqui
    const isHabilitado = apiFuncionou && servicosHabilitados.size > 0
      ? servicosHabilitados.has(cTribNac)
      : true; // ✅ Se API não funcionou (município sem API), permitir - será validado na emissão
    
    codigosValidos.push({
      cTribNac,
      descricao: `Serviço baseado em código ${cTribNac}`,
      itemListaLc116,
      validado: isHabilitado
    });
    
    if (isHabilitado) {
      logger.info('[CNAE Service] ✅ Código de tributação validado no município', {
        cTribNac,
        municipioIbge,
        competencia: competenciaUsar
      });
    } else {
      logger.warn('[CNAE Service] ⚠️ Código de tributação NÃO habilitado no município', {
        cTribNac,
        municipioIbge,
        competencia: competenciaUsar,
        servicosHabilitados: Array.from(servicosHabilitados).slice(0, 5) // Log primeiros 5
      });
    }
  }
  
  // Garantir que sempre retorne pelo menos os códigos fornecidos
  if (codigosValidos.length === 0 && codigos.length > 0) {
    logger.warn('[CNAE Service] Nenhum código foi validado, retornando todos como não validados', {
      codigos,
      municipioIbge,
      competencia: competenciaUsar
    });
    return codigos.map(cTribNac => ({
      cTribNac,
      descricao: `Serviço baseado em código ${cTribNac}`,
      itemListaLc116,
      validado: false
    }));
  }
  
  return codigosValidos;
}

/**
 * Busca descrição oficial de um código de tributação
 * Consulta primeiro o cache do Supabase, depois tenta API oficial
 */
export async function buscarDescricaoCodigoTributacao(
  codigoTributacao: string
): Promise<string | null> {
  // Buscar no cache do Supabase
  try {
    const { data, error } = await admin
      .from('codigos_tributacao_cache')
      .select('descricao_oficial')
      .eq('codigo_tributacao', codigoTributacao)
      .single();
    
    if (!error && data?.descricao_oficial) {
      logger.info('[CNAE Service] Descrição encontrada no cache', { codigoTributacao });
      return data.descricao_oficial;
    }
  } catch (error) {
    logger.warn('[CNAE Service] Erro ao buscar descrição no cache', { 
      error: (error as Error).message,
      codigoTributacao 
    });
  }
  
  // TODO: Consultar API oficial do Sistema Nacional NFS-e
  // Por enquanto, retornar null para usar mapeamento hardcoded
  return null;
}

/**
 * Gera descrições de serviços baseadas em códigos de tributação
 * Consulta primeiro o cache do Supabase, depois usa mapeamento hardcoded
 */
export async function gerarDescricoesServico(codigos: CodigoTributacaoData[]): Promise<string[]> {
  const descricoes: string[] = [];
  
  for (const codigo of codigos) {
    // Buscar descrição oficial do cache ou API
    const descricaoOficial = await buscarDescricaoCodigoTributacao(codigo.cTribNac);
    
    // Priorizar: descrição oficial > mapeamento hardcoded > descrição genérica do código
    // Se a descrição do código for genérica (contém "baseado em código"), usar hardcoded primeiro
    const descricaoGenerica = codigo.descricao?.includes('baseado em código');
    const descricao = descricaoOficial 
      || (descricoesMapHardcoded[codigo.cTribNac] || (!descricaoGenerica ? codigo.descricao : null))
      || codigo.descricao;
    
    if (descricao && !descricoes.includes(descricao)) {
      descricoes.push(descricao);
    }
  }
  
  // Limitar a 3 descrições
  return descricoes.slice(0, 3);
}

/**
 * Mapeamento hardcoded de descrições (fallback)
 */
const descricoesMapHardcoded: Record<string, string> = {
  '140301': 'Desenvolvimento de programas de computador sob encomenda',
  '140302': 'Desenvolvimento e licenciamento de programas de computador customizados',
  '140401': 'Consultoria em tecnologia da informação',
  '140402': 'Consultoria em gestão de tecnologia da informação',
  '140501': 'Gestão de dados e bancos de dados',
  '140601': 'Processamento de dados, provedores de serviços de aplicação e serviços de hospedagem na internet',
  '140701': 'Atividades de contabilidade, escrituração, auditoria e consultoria tributária',
  '140801': 'Design de interiores e decoração',
  '140901': 'Design gráfico e comunicação visual',
  '141001': 'Agências de publicidade e propaganda',
  '141101': 'Criação de conteúdo e produção de material publicitário',
  '141201': 'Fotografia e produção fotográfica',
  '141301': 'Tradução e interpretação',
  '141401': 'Organização de eventos, exceto eventos esportivos',
  '141501': 'Manutenção e reparação de equipamentos de informática',
  '141601': 'Consultoria em gestão empresarial',
  '141701': 'Consultoria em arquitetura',
  '141801': 'Consultoria em engenharia',
  '140101': 'Limpeza de prédios e escritórios',
  // NOTA: Códigos 170101, 170102, 170201, 170202 removidos porque não são válidos para MEI
  // Esses serviços devem ser mapeados via tabela cnae_tributacao ou descrição manual
  '140201': 'Limpeza de salas comerciais e residenciais',
};

