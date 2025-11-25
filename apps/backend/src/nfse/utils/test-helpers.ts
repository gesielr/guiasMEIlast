import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import logger from '../../utils/logger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEST_OUTPUT_DIR = path.resolve(__dirname, '../../../inss/test_output');

/**
 * Garante que o diretório de teste existe
 */
export function ensureTestOutputDir(): void {
  if (!fs.existsSync(TEST_OUTPUT_DIR)) {
    fs.mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
    logger.info('[NFSe] Diretório de teste criado', { path: TEST_OUTPUT_DIR });
  }
}

/**
 * Salva resposta JSON da API
 */
export function saveTestResponse(data: any, filename: string = 'response.json'): void {
  ensureTestOutputDir();
  const filePath = path.join(TEST_OUTPUT_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  logger.info('[NFSe] Resposta de teste salva', { filePath, size: fs.statSync(filePath).size });
}

/**
 * Salva PDF do DANFSE
 */
export function saveTestPdf(pdfBuffer: Buffer, filename: string = 'danfse.pdf'): void {
  ensureTestOutputDir();
  const filePath = path.join(TEST_OUTPUT_DIR, filename);
  fs.writeFileSync(filePath, pdfBuffer);
  logger.info('[NFSe] PDF de teste salvo', { filePath, size: pdfBuffer.length });
}

/**
 * Registra log estruturado de teste
 */
export function logTestEmission(dto: any, result: any, dryRun: boolean): void {
  logger.info('[NFSe] Emissão de teste registrada', {
    dryRun,
    userId: dto.userId,
    protocolo: result.protocolo,
    chaveAcesso: result.chaveAcesso,
    status: result.status,
    situacao: result.situacao,
    timestamp: new Date().toISOString()
  });
}

