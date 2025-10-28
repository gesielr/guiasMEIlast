// Serviço de limpeza de XML DPS
export class XmlCleanerService {
  /**
   * Limpa o XML DPS removendo espaços desnecessários, normalizando encoding e quebras de linha.
   * @param xmlString XML DPS bruto
   * @returns XML limpo
   */
  static clean(xmlString: string): string {
    // Remove espaços entre tags
    let cleaned = xmlString.replace(/>\s+</g, '><');
    // Remove BOM e normaliza encoding para UTF-8
    cleaned = cleaned.replace(/^\uFEFF/, '');
    // Normaliza quebras de linha para LF
    cleaned = cleaned.replace(/\r\n|\r/g, '\n');
    // Remove espaços no início/fim
    cleaned = cleaned.trim();
    return cleaned;
  }
}
