import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeSicoobServices, getAuthService } from '../src/services/sicoob';

// Carregar .env do diretório apps/backend
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../.env') });

async function main() {
  console.log('🔐 Configurações Sicoob:');
  console.log('  Environment:', process.env.SICOOB_ENVIRONMENT);
  console.log('  Client ID:', process.env.SICOOB_CLIENT_ID?.slice(0, 10) + '...');
  console.log('  PFX configurado:', !!process.env.SICOOB_CERT_PFX_BASE64);
  console.log('  Passphrase configurada:', !!process.env.SICOOB_CERT_PFX_PASS);
  console.log('');

  initializeSicoobServices({
    environment: process.env.SICOOB_ENVIRONMENT as 'sandbox' | 'production',
    baseUrl: process.env.SICOOB_PIX_BASE_URL || process.env.SICOOB_API_BASE_URL!,
    authUrl: process.env.SICOOB_AUTH_URL!,
    authValidateUrl: process.env.SICOOB_AUTH_VALIDATE_URL,
    clientId: process.env.SICOOB_CLIENT_ID!,
    clientSecret: process.env.SICOOB_CLIENT_SECRET || undefined,
    certPath: process.env.SICOOB_CERT_PATH || undefined,
    keyPath: process.env.SICOOB_KEY_PATH || undefined,
    caPath: process.env.SICOOB_CA_PATH || undefined,
    caBase64: process.env.SICOOB_CA_BASE64 || undefined,
    pfxBase64: process.env.SICOOB_CERT_PFX_BASE64 || undefined,
    pfxPassphrase: process.env.SICOOB_CERT_PFX_PASS || undefined,
    webhookSecret: process.env.SICOOB_WEBHOOK_SECRET,
    cooperativa: process.env.SICOOB_COOPERATIVA,
    conta: process.env.SICOOB_CONTA,
    scopes: process.env.SICOOB_SCOPES
      ? process.env.SICOOB_SCOPES.split(/[,\s]+/).filter(Boolean)
      : undefined,
  });

  const token = await getAuthService().getAccessToken();
  console.log('Token obtido com sucesso:', token.slice(0, 20), '...');
}

main().catch((err) => {
  console.error('Falha ao autenticar no Sicoob', err);
  process.exit(1);
});
