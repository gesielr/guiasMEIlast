// Serviço para mapear automaticamente CNAEs → Serviços (LC 116) no momento do cadastro
import { servicesByCnaes, normalizeCnae } from '../../nfse/domain/cnae-map';
import { labelFor, subitemToCodigoServico } from '../../nfse/domain/lc116-labels';
import logger from '../../utils/logger';

export interface ServicoMapeado {
  numero: number;
  descricao: string;
  codigoTributacao: string;
  itemListaLc116: string;
  subitemLc116: string; // Formato original (ex: '07.10')
}

/**
 * Mapeia automaticamente CNAEs para lista de serviços (LC 116)
 * Usa o SEED do cnae-map.ts como referência
 * 
 * @param cnaes Array de CNAEs (formato: '8121-4/00' ou '8121400')
 * @param perCnaeLimit Limite de serviços por CNAE (padrão: 2)
 * @returns Array de serviços mapeados
 */
export function mapearServicosAutomaticamente(
  cnaes: string[],
  perCnaeLimit: number = 2
): ServicoMapeado[] {
  logger.info('[AUTO MAP] Iniciando mapeamento automático de serviços', {
    cnaes,
    qtdCnaes: cnaes.length,
    perCnaeLimit
  });

  // Normalizar CNAEs (remover caracteres especiais)
  const cnaesNormalizados = cnaes.map(cnae => normalizeCnae(cnae));
  
  logger.info('[AUTO MAP] CNAEs normalizados', {
    original: cnaes,
    normalizados: cnaesNormalizados
  });

  // Gerar subitens LC 116 (até perCnaeLimit por CNAE, deduplicados)
  const subitensLc116 = servicesByCnaes(cnaesNormalizados, perCnaeLimit);
  
  logger.info('[AUTO MAP] Subitens LC 116 gerados', {
    subitens: subitensLc116,
    qtdSubitens: subitensLc116.length
  });

  // Se não encontrou nenhum subitem, retornar array vazio
  if (subitensLc116.length === 0) {
    logger.warn('[AUTO MAP] Nenhum subitem LC 116 encontrado para os CNAEs fornecidos', {
      cnaes,
      cnaesNormalizados
    });
    return [];
  }

  // Converter subitens para serviços mapeados
  const servicosMapeados: ServicoMapeado[] = subitensLc116.map((subitem, index) => {
    const codigoServico6dig = subitemToCodigoServico(subitem);
    const descricao = labelFor(subitem);
    const itemListaLc116 = subitem.split('.')[0]; // Ex: '07' de '07.10'

    return {
      numero: index + 1,
      descricao,
      codigoTributacao: codigoServico6dig,
      itemListaLc116,
      subitemLc116: subitem
    };
  });

  logger.info('[AUTO MAP] Serviços mapeados com sucesso', {
    qtdServicos: servicosMapeados.length,
    servicos: servicosMapeados.map(s => ({
      numero: s.numero,
      descricao: s.descricao,
      subitem: s.subitemLc116
    }))
  });

  return servicosMapeados;
}

/**
 * Mapeia serviços de um objeto de CNAEs (formato usado no perfil)
 * 
 * @param cnaePrincipal CNAE principal (formato: '8121-4/00' ou objeto com 'codigo')
 * @param cnaesSecundarios Array de CNAEs secundários (formato: '8121-4/00' ou objetos com 'code')
 * @param perCnaeLimit Limite de serviços por CNAE (padrão: 2)
 * @returns Array de serviços mapeados
 */
export function mapearServicosDeProfile(
  cnaePrincipal: string | { codigo: string } | null | undefined,
  cnaesSecundarios: (string | { code: string; description?: string })[] | null | undefined,
  perCnaeLimit: number = 2
): ServicoMapeado[] {
  // Extrair códigos de CNAE
  const cnaes: string[] = [];

  // CNAE principal
  if (cnaePrincipal) {
    if (typeof cnaePrincipal === 'string') {
      cnaes.push(cnaePrincipal);
    } else if (cnaePrincipal.codigo) {
      cnaes.push(cnaePrincipal.codigo);
    }
  }

  // CNAEs secundários
  if (cnaesSecundarios && Array.isArray(cnaesSecundarios)) {
    for (const cnae of cnaesSecundarios) {
      if (typeof cnae === 'string') {
        cnaes.push(cnae);
      } else if (cnae && typeof cnae === 'object' && 'code' in cnae) {
        cnaes.push(cnae.code);
      }
    }
  }

  logger.info('[AUTO MAP PROFILE] Extraindo CNAEs do perfil', {
    cnaePrincipal,
    cnaesSecundarios,
    cnaesExtraidos: cnaes
  });

  // Mapear serviços
  return mapearServicosAutomaticamente(cnaes, perCnaeLimit);
}

