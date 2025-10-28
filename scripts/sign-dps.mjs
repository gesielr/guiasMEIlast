// scripts/sign-dps.mjs
import fs from 'fs';
import path from 'path';
import forge from 'node-forge';
import { SignedXml } from 'xml-crypto';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';

function getPfxFromEnv() {
  const b64 = process.env.NFSE_CERT_PFX_BASE64;
  const pass = process.env.NFSE_CERT_PFX_PASS || '';
  if (!b64) throw new Error('NFSE_CERT_PFX_BASE64 ausente');
  const buf = Buffer.from(b64, 'base64');
  return { buf, pass };
}

function extractPemFromPfxBuffer(buf, passphrase) {
  // node-forge espera string binária
  const bin = buf.toString('binary');
  const p12Asn1 = forge.asn1.fromDer(bin);
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, passphrase);

  // private key
  const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag];
  const privateKey = keyBags && keyBags[0] && keyBags[0].key;
  if (!privateKey) throw new Error('Private key not found in PFX');

  // cert
  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag];
  const cert = certBags && certBags[0] && certBags[0].cert;
  if (!cert) throw new Error('Certificate not found in PFX');

  const pemKey = forge.pki.privateKeyToPem(privateKey);
  const pemCert = forge.pki.certificateToPem(cert);
  return { pemKey, pemCert };
}

function signXml(unsignedXml, pemKey, pemCert) {
  const doc = new DOMParser().parseFromString(unsignedXml, 'text/xml');

  // busca infDPS e pega o Id para referenciar
  const infDPS = doc.getElementsByTagName('infDPS')[0];
  if (!infDPS) throw new Error('infDPS não encontrado no XML');
  const id = infDPS.getAttribute('Id');
  if (!id) throw new Error('infDPS.Id não encontrado — obrigatório para referência');

  const sig = new SignedXml();
  // reference to the Id
  sig.addReference({
    transform: [
      "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
      "http://www.w3.org/2001/10/xml-exc-c14n#"
    ],
    digestAlgorithm: "http://www.w3.org/2001/04/xmlenc#sha256",
    reference: `#${id}`
  });

  sig.signatureAlgorithm = "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256";
  sig.signingKey = pemKey;

  // KeyInfo with X509Certificate (without headers/footers/newlines)
  const certB64 = pemCert.replace(/-----BEGIN CERTIFICATE-----/g, '').replace(/-----END CERTIFICATE-----/g, '').replace(/\r?\n/g, '');
  sig.keyInfoProvider = {
    getKeyInfo() {
      return `<X509Data><X509Certificate>${certB64}</X509Certificate></X509Data>`;
    }
  };

  const unsignedStr = new XMLSerializer().serializeToString(doc);
  sig.computeSignature(unsignedStr, {
    location: { reference: `//*[local-name(.)='DPS']`, action: 'append' }
  });

  const signedXml = sig.getSignedXml();
  return signedXml;
}

async function main() {
  try {
    const pfx = getPfxFromEnv();
    const { pemKey, pemCert } = extractPemFromPfxBuffer(pfx.buf, pfx.pass);
    const inPath = path.resolve(process.cwd(), 'DPS.xml');
    if (!fs.existsSync(inPath)) throw new Error('DPS.xml não encontrado. Rode generate-dps.js primeiro.');
    const unsignedXml = fs.readFileSync(inPath, 'utf8');
    const signed = signXml(unsignedXml, pemKey, pemCert);
    fs.writeFileSync(path.resolve(process.cwd(), 'DPS.signed.xml'), signed, 'utf8');
    console.log('DPS.signed.xml gerado');
  } catch (err) {
    console.error('Erro:', err.message || err);
    process.exit(1);
  }
}

main();
