import axios, { AxiosInstance } from 'axios';
import https from 'node:https';
import fs from 'fs';

export function createAdnClient({ module = 'contribuintes', tpAmb = '2' }: { module?: string, tpAmb?: string }) {
  // URLs de ambiente
  const sefinBaseUrl = process.env.NFSE_BASE_URL || 'https://sefin.nfse.gov.br/sefinnacional';
  const adnBaseUrl = process.env.NFSE_CONTRIBUINTES_BASE_URL || 'https://sefin.nfse.gov.br/sefinnacional/nfse';
  const parametrosBaseUrl = process.env.NFSE_PARAMETROS_BASE_URL || 'https://sefin.nfse.gov.br/sefinnacional/parametros_municipais';
  const danfseBaseUrl = process.env.NFSE_DANFSE_BASE_URL || 'https://sefin.nfse.gov.br/sefinnacional/danfse';

  // Certificado ICP-Brasil
  let pfx: Buffer | undefined;
  let passphrase: string | undefined;
  if (process.env.NFSE_CERT_METHOD === 'supabase_vault' && process.env.NFSE_CERT_PFX_BASE64 && process.env.NFSE_CERT_PFX_PASS) {
    pfx = Buffer.from(process.env.NFSE_CERT_PFX_BASE64, 'base64');
    passphrase = process.env.NFSE_CERT_PFX_PASS;
  } else if (process.env.NFSE_CERT_PATH && process.env.NFSE_CERT_PFX_PASS) {
    pfx = fs.readFileSync(process.env.NFSE_CERT_PATH);
    passphrase = process.env.NFSE_CERT_PFX_PASS;
  }

  const agent = new https.Agent({
    pfx,
    passphrase,
    rejectUnauthorized: true,
  });

  // Seleciona endpoint conforme módulo
  let endpoint = sefinBaseUrl;
  if (module === 'contribuintes') endpoint = adnBaseUrl;
  if (module === 'parametros') endpoint = parametrosBaseUrl;
  if (module === 'danfse') endpoint = danfseBaseUrl;

  const http: AxiosInstance = axios.create({
    baseURL: endpoint,
    httpsAgent: agent,
    timeout: 60000,
    headers: {
      'Content-Type': 'application/xml',
      ...(process.env.OCP_APIM_KEY ? { 'Ocp-Apim-Subscription-Key': process.env.OCP_APIM_KEY } : {}),
    },
  });

  return { http, endpoint };
}
