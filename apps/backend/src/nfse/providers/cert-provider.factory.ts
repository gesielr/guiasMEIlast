import { ICertProvider } from './cert-provider.interface';
import { EnvPfxCertProvider } from './env-pfx-cert-provider';
import { env } from '../../env';
import logger from '../../utils/logger';

/**
 * Factory para criar o provider de certificado apropriado
 * baseado nas feature flags
 */
export function createCertProvider(): ICertProvider {
  const testMode = env.NFSE_TEST_MODE;
  const certSource = env.NFSE_CERT_SOURCE || env.NFSE_CERT_METHOD || 'supabase_vault';

  // Se modo de teste ativo e source = env_pfx, usar EnvPfxCertProvider
  if (testMode && certSource === 'env_pfx') {
    logger.info('[NFSe] Usando EnvPfxCertProvider (modo de teste)');
    return new EnvPfxCertProvider();
  }

  // Caso contrário, usar o provider padrão (supabase_vault)
  // Por enquanto, retornamos EnvPfxCertProvider se NFSE_CERT_PFX_BASE64 estiver presente
  // Isso mantém compatibilidade com o código existente em adn-client.ts
  if (env.NFSE_CERT_PFX_BASE64) {
    logger.info('[NFSe] Usando EnvPfxCertProvider (fallback para compatibilidade)');
    return new EnvPfxCertProvider();
  }

  // Em produção, quando implementarmos SupabaseVaultCertProvider, usaremos aqui
  // Por enquanto, lançamos erro se não houver certificado disponível
  throw new Error('Nenhum provider de certificado disponível. Configure NFSE_CERT_PFX_BASE64 ou implemente SupabaseVaultCertProvider');
}

