import logger from "../../utils/logger";
import { pfxToPem, validateCertificate } from "../../nfse/crypto/pfx-utils";
import forge from "node-forge";

export interface CertificateData {
  cnpj: string;
  nome: string;
  cpf?: string;
  email?: string;
  validadeInicio: Date;
  validadeFim: Date;
  emissor: string;
  subject: string;
}

/**
 * Serviço para extrair dados completos do certificado digital A1 (PFX)
 */
export class CertificateExtractorService {
  /**
   * Extrai dados do certificado A1 (PFX)
   */
  async extractFromPfx(
    pfxBuffer: Buffer,
    password: string
  ): Promise<CertificateData> {
    logger.info('[CERT EXTRACTOR] Extraindo dados do certificado A1...');

    try {
      // Converter PFX para PEM
      const { certificatePem } = pfxToPem(pfxBuffer, password);
      
      // Validar e extrair dados básicos
      const validation = validateCertificate(certificatePem);
      
      if (!validation.doc) {
        throw new Error('CNPJ/CPF não encontrado no certificado');
      }

      // Extrair dados detalhados usando node-forge
      const f = (forge as unknown as typeof import("node-forge")).pki;
      const cert = f.certificateFromPem(certificatePem);

      // Extrair CNPJ/CPF
      const cnpj = validation.doc.length === 14 ? validation.doc : '';
      const cpf = validation.doc.length === 11 ? validation.doc : undefined;

      // Extrair nome do subject
      const nome = this.extractNome(cert.subject.attributes);

      // Extrair email
      const email = this.extractEmail(cert.subject.attributes);

      // Extrair validade
      const validadeInicio = cert.validity.notBefore;
      const validadeFim = cert.validity.notAfter;

      // Extrair emissor
      const emissor = cert.issuer.attributes
        .map((attr: any) => {
          const val = typeof attr.value === 'string' ? attr.value : String(attr.value || '');
          return `${attr.shortName || attr.name}=${val}`;
        })
        .join(', ');

      const data: CertificateData = {
        cnpj,
        nome,
        cpf,
        email,
        validadeInicio,
        validadeFim,
        emissor,
        subject: validation.subject
      };

      logger.info(`[CERT EXTRACTOR] ✅ Certificado extraído: CNPJ ${cnpj}, Nome: ${nome}`);

      return data;

    } catch (error: any) {
      logger.error(`[CERT EXTRACTOR] Erro ao extrair certificado: ${error.message}`);
      throw new Error(`Falha ao processar certificado: ${error.message}`);
    }
  }

  /**
   * Extrai nome do Subject
   */
  private extractNome(subject: any[]): string {
    // Buscar no CN (Common Name)
    const cnField = subject.find(
      (attr: any) => attr.shortName === 'CN' || attr.name === 'commonName'
    );

    if (cnField) {
      const value = typeof cnField.value === 'string' ? cnField.value : String(cnField.value || '');
      
      // Formato comum: "Nome:CNPJ" - extrair apenas o nome (antes dos dois pontos)
      const matchBeforeColon = value.match(/^([^:]+):/);
      if (matchBeforeColon) {
        return matchBeforeColon[1].trim();
      }
      
      // Se não tem dois pontos, remover CNPJ/CPF e retornar o resto
      const semDoc = value.replace(/\d{11,14}/g, '').trim();
      if (semDoc) {
        return semDoc;
      }
      
      return value;
    }

    // Buscar em outros campos
    const nomeField = subject.find(
      (attr: any) => attr.shortName === 'O' || attr.name === 'organizationName'
    );

    if (nomeField) {
      return typeof nomeField.value === 'string' ? nomeField.value : String(nomeField.value || '');
    }

    return 'PRESTADOR';
  }

  /**
   * Extrai email do Subject
   */
  private extractEmail(subject: any[]): string | undefined {
    const emailField = subject.find(
      (attr: any) => attr.shortName === 'E' || attr.name === 'emailAddress'
    );

    if (emailField) {
      const value = typeof emailField.value === 'string' ? emailField.value : String(emailField.value || '');
      // Validar formato de email básico
      if (value.includes('@') && value.includes('.')) {
        return value;
      }
    }

    return undefined;
  }

  /**
   * Valida certificado
   */
  validateCertificate(certData: CertificateData): void {
    const now = new Date();

    if (now < certData.validadeInicio) {
      throw new Error('Certificado ainda não está válido');
    }

    if (now > certData.validadeFim) {
      throw new Error('Certificado expirado');
    }

    if (!certData.cnpj || certData.cnpj.length !== 14) {
      throw new Error('CNPJ inválido no certificado');
    }

    logger.info('[CERT EXTRACTOR] ✅ Certificado válido');
  }
}

