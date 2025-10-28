import { gunzipSync, gzipSync } from "node:zlib";
import { AxiosError } from "axios";
import { createAdnClient } from "../adapters/adn-client";
import { saveEmission, updateEmissionStatus, hashXml, attachPdf } from "../repositories/nfse-emissions.repo";
import { fetchLatestCredential, getCredentialPfxBuffer } from "../repositories/credentials.repo";
import { signInfDps } from "../crypto/xml-signer";
import { pfxToPem, validateCertificate } from "../crypto/pfx-utils";
import { cleanXml, validateXmlAgainstXsd } from "../utils/xml-utils";
import * as libxmljs from 'libxmljs';
import * as zlib from 'zlib';
import * as fs from 'fs';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

function decodeDpsPayload(base64Gzip: string): string {
  try {
    const gzBuffer = Buffer.from(base64Gzip, "base64");
    const xmlBuffer = gunzipSync(gzBuffer);
    return xmlBuffer.toString("utf8");
  } catch (err) {
    throw new Error("Payload DPS invalido: nao foi possivel decodificar GZip/Base64");
  }
}

export interface EmitNfseDto {
  userId: string;
  versao: string;
  dps_xml_gzip_b64: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DPS_XSD_PATH = path.resolve(__dirname, '..', 'xsd', 'DPS_v1.00.xsd');
let dpsXsdSchema: any | null = null;

export class NfseService {
  /**
   * Simula o processamento do XML DPS: limpeza, validação XSD, compressão GZIP e codificação Base64.
   * @param input Objeto com a propriedade dpsXml (string)
   * @returns Promise<{ ok: boolean, dpsXmlGzipB64?: string, message?: string, error?: string }>
   */
  async testSimNfse(input: { dpsXml: string }): Promise<any> {
    try {
      // 1. Carregar e cachear o XSD
      const xsdSchema = await this.loadXsdSchema(DPS_XSD_PATH);

      // 2. Limpar o XML
      const cleanedXml = this.cleanXmlString(input.dpsXml);

      // 3. Validar XML contra XSD
      this.validateXmlWithXsd(cleanedXml, xsdSchema);

      // 4. Comprimir e codificar em Base64
      const dpsXmlGzipB64 = await this.gzipAndBase64Encode(cleanedXml);

      // 5. Retornar sucesso
      return {
        ok: true,
        dpsXmlGzipB64,
        message: 'XML processado e payload preparado com sucesso.'
      };
    } catch (err: any) {
      // Retornar erro detalhado
      return {
        ok: false,
        error: err?.message || String(err)
      };
    }
  }

  /**
   * Carrega e cacheia o schema XSD para validação.
   */
  private async loadXsdSchema(xsdPath: string): Promise<any> {
    if (dpsXsdSchema) return dpsXsdSchema;
    try {
      const xsdContent = fs.readFileSync(xsdPath, 'utf-8');
      const xsdDoc = libxmljs.parseXml(xsdContent, { baseUrl: xsdPath });
      dpsXsdSchema = xsdDoc;
      return dpsXsdSchema;
    } catch (err: any) {
      throw new Error(`Erro ao carregar XSD: ${err.message}`);
    }
  }

  /**
   * Limpa o XML: remove espaços, quebras de linha, tabs e espaços entre tags.
   */
  private cleanXmlString(xml: string): string {
    try {
      let cleaned = xml.replace(/>\s+</g, '><'); // Remove espaços entre tags
      cleaned = cleaned.replace(/[\n\r\t]/g, ''); // Remove quebras de linha e tabs
      cleaned = cleaned.replace(/^\s+|\s+$/g, ''); // Remove espaços no início/fim
      return cleaned;
    } catch (err: any) {
      throw new Error(`Erro ao limpar XML: ${err.message}`);
    }
  }

  /**
   * Valida o XML contra o XSD. Lança erro detalhado se inválido.
   */
  private validateXmlWithXsd(xml: string, xsdSchema: any): void {
    try {
      const xmlDoc = libxmljs.parseXml(xml);
      const isValid = xmlDoc.validate(xsdSchema as any);
      if (!isValid) {
        const errors = xmlDoc.validationErrors.map((e: any) => e.message).join('; ');
        throw new Error(`XML inválido segundo o XSD: ${errors}`);
      }
    } catch (err: any) {
      throw new Error(`Erro na validação XSD: ${err.message}`);
    }
  }

  /**
   * Comprime o XML com GZIP e retorna a string Base64.
   */
  private async gzipAndBase64Encode(xml: string): Promise<string> {
    try {
      const gzip = promisify(zlib.gzip);
      const gzipped = await gzip(Buffer.from(xml, 'utf-8'));
      return gzipped.toString('base64');
    } catch (err: any) {
      throw new Error(`Erro ao comprimir/codificar XML: ${err.message}`);
    }
  }
  async emit(dto: EmitNfseDto) {
    if (!dto?.versao) {
      throw new Error("Campo versao e obrigatorio");
    }

    if (!dto?.userId) {
      throw new Error("Campo userId e obrigatorio");
    }

    if (!dto?.dps_xml_gzip_b64) {
      throw new Error("Campo dps_xml_gzip_b64 e obrigatorio");
    }


    const originalXml = decodeDpsPayload(dto.dps_xml_gzip_b64);
    let xml = cleanXml(originalXml);
    console.log('[NFSe] XML original decodificado e limpo:', xml);

    // Validação XSD obrigatória antes de assinar
    const xsdPath = process.env.NFSE_XSD_PATH || DPS_XSD_PATH;
    const xsdSchema = await this.loadXsdSchema(xsdPath);
    this.validateXmlWithXsd(xml, xsdSchema);

    if (!xml.includes('<Signature')) {
      // Escolher credencial: prioridade para credencial do usuário, depois .env/global
      let credential: Awaited<ReturnType<typeof fetchLatestCredential>> | null = null;
      try {
        credential = await fetchLatestCredential(dto.userId);
      } catch (err) {
        console.warn("[NFSe] Falha ao buscar credencial no Supabase, utilizando fallback do .env", err);
      }
      let privateKeyPem: string | undefined;
      let certificatePem: string | undefined;
      let certSource = 'unknown';

      if (!credential && process.env.NFSE_CERT_METHOD === 'supabase_vault' && process.env.NFSE_CERT_PFX_BASE64 && process.env.NFSE_CERT_PFX_PASS) {
        const pfxBuffer = Buffer.from(process.env.NFSE_CERT_PFX_BASE64, 'base64');
        ({ privateKeyPem, certificatePem } = pfxToPem(pfxBuffer, process.env.NFSE_CERT_PFX_PASS));
        certSource = 'global (.env)';
      } else if (credential) {
        const pfxBuffer = await getCredentialPfxBuffer(credential.storagePath);
        ({ privateKeyPem, certificatePem } = pfxToPem(pfxBuffer, credential.pass));
        certSource = 'usuario';
      } else {
        throw new Error('Nenhuma credencial PFX encontrada para o usuario');
      }

      // Validação do certificado
      const cnpjOuCpf = undefined; // se tiver, passar aqui
      const certStatus = validateCertificate(certificatePem!, cnpjOuCpf);
      if (certStatus.errors && certStatus.errors.length) {
        console.error('[NFSe] Erros de certificado:', certStatus.errors);
        throw new Error('Certificado invalido ou com erros. Veja logs.');
      }
      console.log(`[NFSe] Certificado válido: tipo=${certStatus.tipo}, doc=${certStatus.doc}, validade=${certStatus.notBefore} até ${certStatus.notAfter}`);
      console.log(`[NFSe] Assinando XML com certificado: ${certSource}`);
      xml = signInfDps(xml, { certificatePem: certificatePem!, privateKeyPem: privateKeyPem! });
      console.log('[NFSe] XML assinado:', xml);
    } else {
      console.log('[NFSe] XML já estava assinado.');
    }

    const xmlHash = hashXml(xml);

    const { http, endpoint } = await createAdnClient({ module: 'contribuintes' });
    const payload = {
      versao: dto.versao,
      dps_xml_gzip_b64: xml === originalXml ? dto.dps_xml_gzip_b64 : gzipSync(Buffer.from(xml, 'utf8')).toString('base64')
    };
    console.log('[NFSe] Payload final enviado para API Nacional:', payload);

    let response: any;
    try {
      response = await http.post(endpoint, payload, {
        headers: {
          Accept: 'application/json'
        }
      });
    } catch (err) {
      const error = err as AxiosError;
      if (error.response) {
        const upstreamError = new Error('Falha ao comunicar com a API Nacional de NFS-e');
        (upstreamError as any).statusCode = error.response.status;
        (upstreamError as any).data = error.response.data ?? null;
        throw upstreamError;
      }
      throw error;
    }

    const protocolo = response.data?.identificadorDps ?? response.data?.idDps ?? response.data?.uuidProcessamento ?? `PROTO-${Date.now()}`;
    const nfseKey = response.data?.chaveAcesso ?? response.data?.nfse?.chaveAcesso ?? response.data?.dados?.chaveAcesso ?? null;
    const status = nfseKey ? 'AUTORIZADA' : 'EM_FILA';

    // Persistir emissão mínima
    await saveEmission({
      protocolo,
      status,
      chaveAcesso: nfseKey,
      xmlHash,
      response: response.data
    });

    return {
      protocolo,
      chaveAcesso: nfseKey,
      status,
      situacao: status,
      resposta: response.data
    };
  }

  async pollStatus(protocolo: string) {
    const { http, endpoint } = await createAdnClient({ module: "contribuintes" });
    const url = `${endpoint}/${encodeURIComponent(protocolo)}`;
    const { data } = await http.get(url, {
      headers: {
        Accept: "application/json"
      }
    });

    const situacao = data?.situacao ?? data?.status ?? "UNKNOWN";
    await updateEmissionStatus(protocolo, situacao, data);

    return data;
  }

  async downloadDanfe(chave: string) {
    const { http, endpoint } = await createAdnClient({ module: "danfse" });
    const url = `${endpoint}/${encodeURIComponent(chave)}`;
    const { data } = await http.get<ArrayBuffer>(url, {
      responseType: "arraybuffer"
    });
    return Buffer.from(data);
  }

  async attachPdf(emissionId: string, pdf: Buffer) {
    await attachPdf(emissionId, pdf);
  }
}
