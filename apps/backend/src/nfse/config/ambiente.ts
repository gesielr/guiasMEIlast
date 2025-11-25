/**
 * Configuração de ambientes da API Nacional NFS-e
 * 
 * Ambientes corretos conforme documentação oficial:
 * - Homologação: https://hom-sefin.nfse.gov.br ou https://sefin.hom.nfse.gov.br
 * - Produção: https://sefin.nfse.gov.br
 * 
 * ⚠️ NÃO usar "producaorestrita" - é um ambiente especial com restrições
 */

export const AMBIENTES_NFSE = {
  homologacao: {
    sefin: 'https://hom-sefin.nfse.gov.br',
    sefinAlt: 'https://sefin.hom.nfse.gov.br', // Alternativa
    adn: 'https://hom-adn.nfse.gov.br',
    www: 'https://hom-www.nfse.gov.br',
    portal: 'https://www.gov.br/nfse/hom',
  },
  
  producao: {
    sefin: 'https://sefin.nfse.gov.br',
    adn: 'https://adn.nfse.gov.br',
    www: 'https://www.nfse.gov.br',
    portal: 'https://www.gov.br/nfse',
  },
  
  // ⚠️ Usar apenas se orientado pela SEFAZ
  producaoRestrita: {
    sefin: 'https://sefin.producaorestrita.nfse.gov.br',
    adn: 'https://adn.producaorestrita.nfse.gov.br',
    www: 'https://www.producaorestrita.nfse.gov.br',
    portal: 'https://www.gov.br/nfse',
    aviso: '⚠️ Ambiente com restrições de cadastro - usar apenas se orientado'
  }
} as const;

export type AmbienteNFSe = 'homologacao' | 'producao' | 'producaoRestrita';

export type ModuloNFSe = 'contribuintes' | 'parametros' | 'danfse';

/**
 * Obtém a URL base para um módulo específico no ambiente indicado
 * @param ambiente Ambiente (homologacao, producao, producaoRestrita)
 * @param modulo Módulo (contribuintes, parametros, danfse)
 * @returns URL base do módulo
 */
export function getUrlModulo(ambiente: AmbienteNFSe, modulo: ModuloNFSe): string {
  const amb = AMBIENTES_NFSE[ambiente];
  
  switch (modulo) {
    case 'contribuintes':
      return amb.sefin;
    case 'parametros':
      return amb.www;
    case 'danfse':
      return amb.adn;
    default:
      return amb.sefin;
  }
}

/**
 * Obtém a URL SEFIN para emissão de notas
 * @param ambiente Ambiente (homologacao, producao, producaoRestrita)
 * @returns URL SEFIN
 */
export function getUrlSefin(ambiente: AmbienteNFSe): string {
  return AMBIENTES_NFSE[ambiente].sefin;
}

/**
 * Determina o ambiente baseado no tpAmb (1=Produção, 2=Homologação)
 * @param tpAmb Tipo de ambiente ('1' ou '2')
 * @returns Ambiente correspondente
 */
export function getAmbienteFromTpAmb(tpAmb: '1' | '2'): AmbienteNFSe {
  return tpAmb === '1' ? 'producao' : 'homologacao';
}

/**
 * Determina o tpAmb baseado no ambiente
 * @param ambiente Ambiente
 * @returns tpAmb ('1' ou '2')
 */
export function getTpAmbFromAmbiente(ambiente: AmbienteNFSe): '1' | '2' {
  return ambiente === 'producao' ? '1' : '2';
}

/**
 * Detecta o ambiente baseado em uma URL
 * @param url URL para analisar
 * @param tpAmb Opcional: tpAmb do XML para ajudar na detecção
 * @returns Ambiente detectado ou null se não reconhecido
 */
export function detectarAmbientePorUrl(url: string, tpAmb?: '1' | '2'): AmbienteNFSe | null {
  if (!url) return null;
  
  const urlLower = url.toLowerCase();
  
  // Detectar homologação (URLs com prefixo hom-)
  if (urlLower.includes('hom-sefin') || 
      urlLower.includes('sefin.hom') ||
      urlLower.includes('hom-adn') ||
      urlLower.includes('hom-www')) {
    return 'homologacao';
  }
  
  // IMPORTANTE: producaorestrita pode ser usado com tpAmb=2 (homologação)
  // Se tpAmb=2 foi informado, tratar producaorestrita como homologação
  if (urlLower.includes('producaorestrita')) {
    // Se tpAmb=2 foi informado, tratar como homologação
    if (tpAmb === '2') {
      return 'homologacao';
    }
    // Caso contrário, tratar como produção restrita
    return 'producaoRestrita';
  }
  
  // Detectar produção (URLs padrão sem prefixo)
  if (urlLower.includes('sefin.nfse.gov.br') ||
      urlLower.includes('adn.nfse.gov.br') ||
      urlLower.includes('www.nfse.gov.br')) {
    // Se não tem prefixo "hom" ou "producaorestrita", é produção
    if (!urlLower.includes('hom') && !urlLower.includes('producaorestrita')) {
      return 'producao';
    }
  }
  
  return null;
}

