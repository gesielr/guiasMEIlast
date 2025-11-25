import { createAdnClient } from "../adapters/adn-client";
import logger from "../../utils/logger";

// Função auxiliar para obter tpAmb (copiada de nfse.service.ts para evitar dependência circular)
function getTpAmb(): '1' | '2' {
  const baseUrl = process.env.NFSE_BASE_URL || process.env.NFSE_CONTRIBUINTES_BASE_URL || '';
  const isProducaoRestrita = baseUrl.toLowerCase().includes('producaorestrita');
  const ambiente = process.env.NFSE_ENVIRONMENT || 'homologation';
  
  if (isProducaoRestrita || ambiente === 'production' || ambiente === 'producao') {
    return '1';
  }
  return '2';
}

export interface DadosNFSe {
  numero: string;
  chaveAcesso: string;
  protocolo: string;
  dataEmissao: Date;
  prestador: {
    cnpj: string;
    nome: string;
    endereco: string;
    municipio: string;
    uf: string;
    cep: string;
    fone?: string;
    email?: string;
  };
  tomador: {
    cnpj: string;
    nome: string;
    endereco: string;
    municipio: string;
    uf: string;
    cep: string;
    fone?: string;
    email?: string;
  };
  servico: {
    codigo: string;
    discriminacao: string;
    valorServicos: number;
  };
  valores: {
    servicos: number;
    deducoes: number;
    baseCalculo: number;
    aliquota: number;
    issqn: number;
    retencoes: number;
    descontoIncondicionado: number;
    descontoCondicionado: number;
    outrasRetencoes: number;
    valorLiquido: number;
  };
  xmlCompleto: string;
}

export class NfseConsultaService {
  /**
   * Consulta NFS-e pela chave de acesso e retorna dados estruturados
   * @param chaveAcesso Chave de acesso da NFS-e
   * @param xmlPrevio XML já disponível (opcional, evita consulta desnecessária)
   */
  async consultarNFSe(chaveAcesso: string, xmlPrevio?: string): Promise<DadosNFSe> {
    logger.info(`[NFSE CONSULTA] Consultando nota: ${chaveAcesso}`, {
      temXmlPrevio: !!xmlPrevio
    });

    try {
      // 1. Buscar XML da nota na API ADN (ou usar XML prévio se disponível)
      const xmlNota = xmlPrevio || await this.buscarXmlApiAdn(chaveAcesso);

      // 2. Parsear XML
      const dadosNota = await this.parsearXmlNFSe(xmlNota);

      logger.info(`[NFSE CONSULTA] ✅ Nota consultada: Número ${dadosNota.numero}`);
      return dadosNota;
    } catch (error) {
      logger.error(`[NFSE CONSULTA] Erro: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Buscar XML da nota na API ADN
   */
  private async buscarXmlApiAdn(chaveAcesso: string): Promise<string> {
    logger.info('[NFSE CONSULTA] Buscando XML na API ADN...');

    const tpAmb = getTpAmb();
    const { http } = await createAdnClient({ module: 'contribuintes', tpAmb });
    
    const url = `/nfse/${encodeURIComponent(chaveAcesso)}`;

    try {
      const response = await http.get(url, {
        headers: {
          'Accept': 'application/xml',
          'User-Agent': 'GuiasMEI/1.0'
        },
        timeout: 30000
      });

      if (response.status !== 200) {
        throw new Error(`API ADN retornou status ${response.status}`);
      }

      const xml = typeof response.data === 'string' ? response.data : response.data.toString();
      
      if (!xml || xml.trim().length === 0) {
        throw new Error('API ADN não retornou XML válido');
      }

      logger.info('[NFSE CONSULTA] ✅ XML obtido da API ADN');
      return xml;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error('Nota fiscal não encontrada na API Nacional');
      }
      if (error.response?.status === 401 || error.response?.status === 403) {
        throw new Error('Certificado digital inválido ou sem permissão');
      }
      logger.error(`[NFSE CONSULTA] Erro na API ADN: ${(error as Error).message}`);
      throw new Error(`Falha ao consultar nota na API Nacional: ${(error as Error).message}`);
    }
  }

  /**
   * Parsear XML da NFS-e
   */
  private async parsearXmlNFSe(xml: string): Promise<DadosNFSe> {
    // Importação dinâmica para evitar erro se fast-xml-parser não estiver instalado
    const { XMLParser } = await import("fast-xml-parser");
    
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      parseTagValue: true,
      parseNodeValue: true,
      trimValues: true
    });

    const result = parser.parse(xml);

    // Navegar na estrutura do XML (pode variar conforme o formato retornado)
    // Tentar diferentes estruturas possíveis
    const nfse = result.NFSe?.infNFSe || result.nfse?.infNFSe || result;
    
    if (!nfse) {
      throw new Error('XML não contém estrutura válida de NFS-e');
    }

    // Extrair dados do prestador
    const emit = nfse.emit || nfse.prestador || nfse.DPS?.infDPS?.prest;
    const enderEmit = emit?.enderNac || emit?.endereco || {};
    
    // Extrair dados do tomador
    const toma = nfse.DPS?.infDPS?.toma || nfse.tomador || {};
    const enderToma = toma?.end?.endNac || toma?.endereco || {};
    
    // Extrair dados do serviço
    const serv = nfse.DPS?.infDPS?.serv?.cServ || nfse.servico || {};
    
    // Extrair valores
    const valores = nfse.DPS?.infDPS?.valores || nfse.valores || {};
    const vServPrest = valores.vServPrest || valores;
    const vServ = vServPrest?.vServ || valores.vServ || valores.servicos || 0;
    
    // Extrair tributos
    const trib = valores.trib || {};
    const tribMun = trib.tribMun || {};
    const totTrib = trib.totTrib || {};

    // Montar dados estruturados
    const dados: DadosNFSe = {
      numero: nfse.nNFSe || nfse.numero || nfse.nDPS || '',
      chaveAcesso: nfse['@_Id']?.replace('NFS', '') || nfse.chaveAcesso || '',
      protocolo: nfse.nDFSe || nfse.protocolo || '',
      dataEmissao: nfse.dhProc ? new Date(nfse.dhProc) : new Date(),
      prestador: {
        cnpj: emit?.CNPJ || emit?.cnpj || '',
        nome: emit?.xNome || emit?.nome || '',
        endereco: this.montarEndereco(enderEmit),
        municipio: enderEmit?.cMun || '',
        uf: enderEmit?.UF || enderEmit?.uf || this.obterUfPorMunicipio(enderEmit?.cMun),
        cep: enderEmit?.CEP || enderEmit?.cep || '',
        fone: emit?.fone || emit?.telefone,
        email: emit?.email
      },
      tomador: {
        cnpj: toma?.CNPJ || toma?.cnpj || '',
        nome: toma?.xNome || toma?.nome || '',
        endereco: this.montarEndereco(enderToma),
        municipio: enderToma?.cMun || '',
        uf: enderToma?.UF || enderToma?.uf || this.obterUfPorMunicipio(enderToma?.cMun),
        cep: enderToma?.CEP || enderToma?.cep || '',
        fone: toma?.fone || toma?.telefone,
        email: toma?.email
      },
      servico: {
        codigo: serv?.cTribNac || serv?.codigo || '',
        discriminacao: serv?.xDescServ || serv?.discriminacao || '',
        valorServicos: typeof vServ === 'number' ? vServ : parseFloat(String(vServ)) || 0
      },
      valores: {
        servicos: typeof vServ === 'number' ? vServ : parseFloat(String(vServ)) || 0,
        deducoes: parseFloat(String(valores.deducoes || 0)),
        baseCalculo: parseFloat(String(totTrib?.vBC || valores.baseCalculo || vServ)),
        aliquota: parseFloat(String(tribMun?.aliquota || valores.aliquota || 0)),
        issqn: parseFloat(String(tribMun?.vISSQN || valores.issqn || 0)),
        retencoes: parseFloat(String(valores.retencoes || 0)),
        descontoIncondicionado: parseFloat(String(valores.descontoIncondicionado || 0)),
        descontoCondicionado: parseFloat(String(valores.descontoCondicionado || 0)),
        outrasRetencoes: parseFloat(String(valores.outrasRetencoes || 0)),
        valorLiquido: parseFloat(String(valores.vLiquido || valores.valorLiquido || vServ))
      },
      xmlCompleto: xml
    };

    return dados;
  }

  /**
   * Montar endereço completo
   */
  private montarEndereco(endereco: any): string {
    if (!endereco) return '';

    const partes = [
      endereco.xLgr || endereco.logradouro,
      endereco.nro ? `nº ${endereco.nro}` : null,
      endereco.xCpl || endereco.complemento,
      endereco.xBairro || endereco.bairro
    ].filter(Boolean);

    return partes.join(', ') || '';
  }

  /**
   * Obter UF pelo código do município
   */
  private obterUfPorMunicipio(codigoMunicipio: string): string {
    if (!codigoMunicipio || codigoMunicipio.length < 2) return '';

    const codigoUf = codigoMunicipio.substring(0, 2);

    const mapa: Record<string, string> = {
      '11': 'RO', '12': 'AC', '13': 'AM', '14': 'RR', '15': 'PA',
      '16': 'AP', '17': 'TO', '21': 'MA', '22': 'PI', '23': 'CE',
      '24': 'RN', '25': 'PB', '26': 'PE', '27': 'AL', '28': 'SE',
      '29': 'BA', '31': 'MG', '32': 'ES', '33': 'RJ', '35': 'SP',
      '41': 'PR', '42': 'SC', '43': 'RS', '50': 'MS', '51': 'MT',
      '52': 'GO', '53': 'DF'
    };

    return mapa[codigoUf] || '';
  }
}

