import { ICertProvider } from './cert-provider.interface';
import { env } from '../../env';
import logger from '../../utils/logger';

/**
 * Provider de certificado que lê PFX do .env (NFSE_CERT_PFX_BASE64)
 */
export class EnvPfxCertProvider implements ICertProvider {
  async resolvePfx(): Promise<Buffer> {
    const pfxBase64 = env.NFSE_CERT_PFX_BASE64;
    
    if (!pfxBase64) {
      throw new Error('NFSE_CERT_PFX_BASE64 não configurado no .env');
    }

    try {
      const buffer = Buffer.from(pfxBase64, 'base64');
      
      // Validar tamanho mínimo (1KB) e máximo (30KB)
      if (buffer.length < 1000 || buffer.length > 30000) {
        throw new Error(`PFX fora do tamanho esperado (1KB ~ 30KB). Recebido: ${buffer.length} bytes`);
      }

      // Mascarar base64 nos logs (mostrar apenas primeiros e últimos caracteres)
      const masked = pfxBase64.length > 20 
        ? `${pfxBase64.substring(0, 10)}...${pfxBase64.substring(pfxBase64.length - 10)}`
        : '***';
      
      logger.info('[NFSe] Certificado PFX carregado do .env', {
        size: buffer.length,
        base64Preview: masked
      });

      return buffer;
    } catch (error) {
      logger.error('[NFSe] Erro ao decodificar PFX do .env', {
        error: (error as Error).message
      });
      throw new Error(`Falha ao decodificar NFSE_CERT_PFX_BASE64: ${(error as Error).message}`);
    }
  }

  async getPassphrase(): Promise<string | undefined> {
    return env.NFSE_CERT_PFX_PASS;
  }
}

