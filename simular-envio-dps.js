// Script para simular o envio do XML DPS assinado para o endpoint /nfse
// Usa o certificado global do .env

import fs from 'fs';
import zlib from 'zlib';
import axios from 'axios';
import dotenv from 'dotenv';
import { pfxToPem } from './apps/backend/src/nfse/crypto/pfx-utils';
import { signInfDps } from './apps/backend/src/nfse/crypto/xml-signer';

dotenv.config({ path: './apps/backend/.env' });

const xmlPath = './dps-exemplo.xml';
const userId = '00000000-0000-0000-0000-000000000001';
const versao = '1.00';
const endpoint = 'http://localhost:3333/nfse';

async function main() {
  // 1. Ler XML DPS
  const xml = fs.readFileSync(xmlPath, 'utf8');

  // 2. Extrair certificado do .env
  const pfxBase64 = process.env.NFSE_CERT_PFX_BASE64;
  const pfxPass = process.env.NFSE_CERT_PFX_PASS;
  if (!pfxBase64 || !pfxPass) throw new Error('Certificado PFX não configurado no .env');
  const pfxBuffer = Buffer.from(pfxBase64.replace(/\s+/g, ''), 'base64');
  const { privateKeyPem, certificatePem } = pfxToPem(pfxBuffer, pfxPass);

  // 3. Assinar o XML
  const signedXml = signInfDps(xml, { privateKeyPem, certificatePem });

  // 4. Comprimir (gzip) e codificar em base64
  const gzipped = zlib.gzipSync(Buffer.from(signedXml, 'utf8'));
  const dps_xml_gzip_b64 = gzipped.toString('base64');

  // 5. Montar payload
  const payload = { userId, versao, dps_xml_gzip_b64 };

  // 6. Enviar para o endpoint
  try {
    const res = await axios.post(endpoint, payload, {
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' }
    });
    console.log('Resposta da API:', res.data);
  } catch (err) {
    if (err.response) {
      console.error('Erro da API:', err.response.status, err.response.data);
    } else {
      console.error('Erro ao enviar:', err.message);
    }
  }
}

main();
