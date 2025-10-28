import * as fs from 'fs';
import * as libxmljs from 'libxmljs2';

export class XmlValidatorService {
  /**
   * Valida o XML DPS contra o XSD flat.
   * @param xmlString XML DPS limpo
   * @param xsdPath Caminho do XSD flat
   * @returns { valid: boolean, errors: string[] }
   */
  static validate(xmlString: string, xsdPath: string): { valid: boolean, errors: string[] } {
    try {
      const xsdString = fs.readFileSync(xsdPath, 'utf8');
      const xsdDoc = libxmljs.parseXml(xsdString);
      const xmlDoc = libxmljs.parseXml(xmlString);
      const valid = xmlDoc.validate(xsdDoc);
      const errors = valid ? [] : (xmlDoc.validationErrors as { message: string }[]).map(e => e.message);
      return { valid, errors };
    } catch (err) {
      return { valid: false, errors: [err instanceof Error ? err.message : String(err)] };
    }
  }
}
