import forge from "node-forge";

export interface PfxPemResult {
  privateKeyPem: string;
  certificatePem: string;
}

/**
 * Valida certificado extraído do PFX.
 * @param certificatePem PEM do certificado
 * @param cnpjOuCpf Esperado do prestador
 * @returns {object} status e erros
 */
export function validateCertificate(certificatePem: string, cnpjOuCpf?: string) {
  const f = (forge as unknown as typeof import("node-forge")).pki;
  const cert = f.certificateFromPem(certificatePem);
  const now = new Date();
  const notBefore = cert.validity.notBefore;
  const notAfter = cert.validity.notAfter;
  const expired = now < notBefore || now > notAfter;
  let tipo = "A1";
  if (
    cert.extensions.some(
      (ext: any) =>
        ext.name === "subjectAltName" && ext.altNames.some((a: any) => a.value && a.value.includes("A3"))
    )
  ) {
    tipo = "A3";
  }
  const subject = cert.subject.attributes.map((a: any) => a.value).join(" ");
  const docMatch = subject.match(/(\d{11}|\d{14})/);
  const doc = docMatch ? docMatch[0] : null;
  const docOk = cnpjOuCpf ? doc === cnpjOuCpf : true;
  return {
    expired,
    tipo,
    doc,
    docOk,
    notBefore,
    notAfter,
    subject,
    errors: [expired ? "Certificado expirado" : null, !docOk ? "CNPJ/CPF do certificado não corresponde ao prestador" : null].filter(Boolean)
  };
}

export function pfxToPem(buffer: Buffer, passphrase?: string, forgeImpl?: any): PfxPemResult {
  const f = forgeImpl ?? forge;
  const p12Asn1 = f.asn1.fromDer(buffer.toString("binary"));
  const p12 = f.pkcs12.pkcs12FromAsn1(p12Asn1, passphrase || "");

  let keyObj: any = null;
  let certObj: any = null;

  for (const safeContent of p12.safeContents) {
    for (const safeBag of safeContent.safeBags) {
      if (safeBag.type === f.pki.oids.pkcs8ShroudedKeyBag || safeBag.type === f.pki.oids.keyBag) {
        keyObj = safeBag.key;
      }
      if (safeBag.type === f.pki.oids.certBag) {
        certObj = safeBag.cert;
      }
    }
  }

  if (!keyObj || !certObj) {
    throw new Error("PFX does not contain key or certificate");
  }

  const privateKeyPem = f.pki.privateKeyToPem(keyObj);
  const certificatePem = f.pki.certificateToPem(certObj);

  return { privateKeyPem, certificatePem };
}
