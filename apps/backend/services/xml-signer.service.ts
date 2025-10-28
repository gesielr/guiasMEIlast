import { SignedXml } from 'xml-crypto';
import * as fs from 'fs';

export class XmlSignerService {
  /**
   * Assina digitalmente o XML DPS usando certificado PFX.
   * @param xmlString XML DPS limpo
   * @param pfxPath Caminho do certificado PFX
   * @param pass Senha do certificado
   * @returns XML assinado
   */
  static sign(xmlString: string, pfxPath: string, pass: string): string {
    const pfx = fs.readFileSync(pfxPath);
    const sig = new SignedXml();
    sig.addReference("//*[local-name()='DPS']");
    sig.signingKey = pfx;
    sig.keyInfoProvider = {
      getKeyInfo: () => '<X509Data></X509Data>'
    };
    sig.computeSignature(xmlString);
    return sig.getSignedXml();
  }
}
