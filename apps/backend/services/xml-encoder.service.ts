import { gzipSync } from 'zlib';

export class XmlEncoderService {
  /**
   * Compacta e codifica o XML DPS (GZIP + Base64).
   * @param xmlString XML DPS assinado
   * @returns XML compactado e codificado
   */
  static encode(xmlString: string): string {
    const gzipped = gzipSync(Buffer.from(xmlString, 'utf8'));
    return gzipped.toString('base64');
  }
}
