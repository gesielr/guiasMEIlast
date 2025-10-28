import fs from 'fs';
import libxmljs from 'libxmljs';

/**
 * Valida um XML contra um XSD.
 * @param {string} xmlString O conteúdo XML a ser validado.
 * @param {string} xsdPath O caminho para o arquivo XSD.
 * @returns {boolean} True se o XML for válido, False caso contrário.
 */
export function validateXmlAgainstXsd(xmlString: string, xsdPath: string): boolean {
    try {
        const xsdContent = fs.readFileSync(xsdPath, 'utf8');
        const xsdDoc = libxmljs.parseXml(xsdContent, { noblanks: true, baseUrl: xsdPath });
        const xmlDoc = libxmljs.parseXml(xmlString, { noblanks: true });
        if (!xmlDoc.validate(xsdDoc)) {
            console.error('Erros de validação XSD:');
            xmlDoc.validationErrors.forEach((error: any) => {
                console.error(`- ${error.message}`);
            });
            return false;
        }
        console.log('XML validado com sucesso contra XSD.');
        return true;
    } catch (e: any) {
        console.error('Erro ao validar XML contra XSD:', e.message);
        return false;
    }
}

/**
 * Limpa o XML removendo espaços desnecessários e caracteres de formatação.
 * @param {string} xml O XML a ser limpo.
 * @returns {string} O XML limpo.
 */
export function cleanXml(xml: string): string {
    return xml
        .replace(/>\s+</g, '><') // Remove espaços entre tags
        .replace(/[\n\r\t]/g, '') // Remove quebras de linha e tabs
        .replace(/<!--.*?-->/gs, '') // Remove comentários
        .replace(/>\s+/g, '>') // Remove espaços após tags
        .replace(/\s+</g, '<') // Remove espaços antes de tags
        .trim(); // Remove espaços no início e fim do documento
}
