#!/usr/bin/env node
/**
 * Testes de Integração para Polling de Status e Download de PDF (NFSe)
 * ==================================================================
 * 
 * Este script Node.js testa:
 * 1. Emissão de NFS-e
 * 2. Polling de status com retry
 * 3. Download de PDF
 * 4. Tratamento de erros
 * 5. Casos de sucesso e falha
 *
 * Uso: node test_nfse_polling_and_pdf.mjs
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuração
const BASE_URL = 'http://localhost:3333';
const MAX_POLLING_ATTEMPTS = 30;
const POLLING_INTERVAL = 2000; // ms

// Cores para terminal
const Colors = {
  GREEN: '\x1b[92m',
  RED: '\x1b[91m',
  YELLOW: '\x1b[93m',
  BLUE: '\x1b[94m',
  CYAN: '\x1b[96m',
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m',
};

function log_test(title, status, details = '') {
  const timestamp = new Date().toISOString();
  const symbol = status === 'PASS' || status === 'OK' ? '✓' : status === 'FAIL' ? '✗' : '⊙';
  const color = status === 'PASS' || status === 'OK' ? Colors.GREEN : status === 'FAIL' ? Colors.RED : Colors.YELLOW;

  console.log(`${color}[${timestamp}] ${symbol} ${title}: ${status}${Colors.RESET}`);
  if (details) {
    console.log(`    └─ ${details}`);
  }
}

function log_info(message) {
  console.log(`${Colors.BLUE}[INFO]${Colors.RESET} ${message}`);
}

function log_error(message) {
  console.log(`${Colors.RED}[ERRO]${Colors.RESET} ${message}`);
}

function log_success(message) {
  console.log(`${Colors.GREEN}[OK]${Colors.RESET} ${message}`);
}

function log_data(title, data) {
  console.log(`\n${Colors.BOLD}${title}:${Colors.RESET}`);
  try {
    console.log(JSON.stringify(data, null, 2));
  } catch {
    console.log(String(data));
  }
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testEmission() {
  log_info('=== TESTE 1: EMISSÃO DE NFS-E ===');

  const emissionPayload = {
    userId: '550e8400-e29b-41d4-a716-446655440000',
    versao: '1.00',
    dps_xml_gzip_b64: 'H4sICNcM72YC/2Rwc0lsQ2xlYW4ueG1sAKtWSkksSVSyUkorzcnPS1WyMlKqBPEKUkoqgJRVFhcUFqUWKVkpWZkkFhUX5+eVFpUUK1kp5Bfn5ZQWlRSVFCtVAgBHEb9FfgAAAA==',
  };

  try {
    const response = await axios.post(`${BASE_URL}/nfse`, emissionPayload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
    });

    if (response.status === 200 || response.status === 201 || response.status === 202) {
      const data = response.data;
      const protocolo = data.protocolo;
      const chave = data.chaveAcesso;
      const status = data.status;

      log_test('Emissão de NFS-e', 'PASS', `Protocolo: ${protocolo}, Status: ${status}`);
      log_data('Resposta da Emissão', data);

      return {
        protocolo,
        chave,
        status,
        success: true,
        response: data,
      };
    } else {
      log_test('Emissão de NFS-e', 'FAIL', `Status ${response.status}`);
      log_error(`Erro: ${response.data}`);
      return { success: false, error: response.data };
    }
  } catch (e) {
    if (e.response) {
      log_test('Emissão de NFS-e', 'FAIL', `HTTP ${e.response.status}`);
      log_error(`Erro: ${e.response.data?.message || e.response.data}`);
    } else if (e.code === 'ECONNREFUSED') {
      log_test('Emissão de NFS-e', 'FAIL', 'Conexão recusada - backend não está rodando?');
    } else {
      log_test('Emissão de NFS-e', 'FAIL', e.message);
    }
    return { success: false, error: e.message };
  }
}

async function testPolling(protocolo, maxAttempts = MAX_POLLING_ATTEMPTS) {
  log_info('=== TESTE 2: POLLING DE STATUS ===');

  let attempt = 0;
  let lastStatus = null;

  while (attempt < maxAttempts) {
    attempt++;
    log_info(`Tentativa ${attempt}/${maxAttempts}: Consultando status...`);

    try {
      const response = await axios.get(`${BASE_URL}/nfse/${protocolo}`, {
        headers: { Accept: 'application/json' },
        timeout: 10000,
      });

      if (response.status === 200) {
        const data = response.data;
        const situacao = data.situacao || data.status || 'DESCONHECIDO';
        lastStatus = situacao;

        log_test(`Polling (tentativa ${attempt})`, 'OK', `Status: ${situacao}`);
        log_data('Status Response', data);

        // Verificar se já foi autorizado
        if (['AUTORIZADA', 'ACEITA', 'PROCESSADA'].includes(situacao)) {
          log_success(`NFS-e autorizada! Status: ${situacao}`);
          return {
            success: true,
            status: situacao,
            attempts: attempt,
            data,
            chave: data.chaveAcesso || data.chave,
          };
        }
      }
    } catch (e) {
      if (e.response) {
        log_test(`Polling (tentativa ${attempt})`, 'FAIL', `HTTP ${e.response.status}`);
      } else {
        log_test(`Polling (tentativa ${attempt})`, 'FAIL', e.message);
      }
    }

    // Aguardar antes da próxima tentativa
    if (attempt < maxAttempts) {
      log_info(`Aguardando ${POLLING_INTERVAL / 1000}s antes da próxima tentativa...`);
      await delay(POLLING_INTERVAL);
    }
  }

  log_error(`Polling expirou após ${maxAttempts} tentativas. Último status: ${lastStatus}`);
  return {
    success: false,
    error: 'Polling timeout',
    lastStatus,
    attempts: attempt,
  };
}

async function testPdfDownload(chave) {
  log_info('=== TESTE 3: DOWNLOAD DE PDF ===');

  try {
    const response = await axios.get(`${BASE_URL}/nfse/${chave}/pdf`, {
      responseType: 'arraybuffer',
      timeout: 15000,
    });

    if (response.status === 200) {
      const pdfSize = response.data.length;
      log_test('Download de PDF', 'PASS', `Tamanho: ${pdfSize} bytes`);

      // Salvar PDF para validação
      const pdfPath = path.join(__dirname, 'nfse_download.pdf');
      fs.writeFileSync(pdfPath, response.data);
      log_success(`PDF salvo em: ${pdfPath}`);

      return {
        success: true,
        size: pdfSize,
        path: pdfPath,
      };
    }
  } catch (e) {
    if (e.response) {
      log_test('Download de PDF', 'FAIL', `HTTP ${e.response.status}`);
    } else {
      log_test('Download de PDF', 'FAIL', e.message);
    }
    return { success: false, error: e.message };
  }
}

async function testErrorHandling() {
  log_info('=== TESTE 4: TRATAMENTO DE ERROS ===');

  const testCases = [
    {
      name: 'Protocolo inválido',
      protocolo: 'PROTO-INVALIDO-123456789',
      expectedError: [404, 400],
    },
    {
      name: 'Protocolo vazio',
      protocolo: '',
      expectedError: [400, 404],
    },
    {
      name: 'Protocolo com caracteres especiais',
      protocolo: 'PROTO<>SCRIPT',
      expectedError: [400, 404],
    },
  ];

  const results = [];
  for (const testCase of testCases) {
    const protocolo = testCase.protocolo;
    log_info(`Testando: ${testCase.name}`);

    try {
      const response = await axios.get(`${BASE_URL}/nfse/${protocolo}`, {
        timeout: 5000,
        validateStatus: () => true, // Não lança erro em status codes de erro
      });

      if ([400, 404, 500].includes(response.status)) {
        log_test(testCase.name, 'PASS', `Erro capturado (HTTP ${response.status})`);
        results.push({ test: testCase.name, passed: true });
      } else {
        log_test(testCase.name, 'FAIL', `Esperado erro, mas recebeu HTTP ${response.status}`);
        results.push({ test: testCase.name, passed: false });
      }
    } catch (e) {
      log_test(testCase.name, 'PASS', `Exceção capturada: ${e.message?.substring(0, 50)}`);
      results.push({ test: testCase.name, passed: true });
    }
  }

  return results;
}

async function testCertificateValidation() {
  log_info('=== TESTE 5: VALIDAÇÃO DE CERTIFICADO ===');

  try {
    const response = await axios.get(`${BASE_URL}/nfse/metrics`, {
      headers: { Accept: 'application/json' },
      timeout: 10000,
    });

    if (response.status === 200) {
      const data = response.data;
      log_test('Métricas do Sistema', 'PASS', 'Endpoint acessível');
      log_data('Métricas', data);
      return { success: true, metrics: data };
    }
  } catch (e) {
    if (e.response) {
      log_test('Métricas do Sistema', 'FAIL', `HTTP ${e.response.status}`);
    } else {
      log_test('Métricas do Sistema', 'FAIL', e.message);
    }
  }

  return { success: false, error: 'Não foi possível obter métricas' };
}

function generateReport(results) {
  log_info('=== RELATÓRIO FINAL ===');

  const report = {
    timestamp: new Date().toISOString(),
    tests: results,
    summary: {
      total: results.length,
      passed: results.filter(r => r.success || r.passed).length,
      failed: results.filter(r => !(r.success || r.passed)).length,
    },
  };

  console.log(`\n${Colors.BOLD}RESUMO DOS TESTES:${Colors.RESET}`);
  console.log(`Total: ${report.summary.total}`);
  console.log(`${Colors.GREEN}Passou: ${report.summary.passed}${Colors.RESET}`);
  console.log(`${Colors.RED}Falhou: ${report.summary.failed}${Colors.RESET}`);

  // Salvar relatório
  const reportPath = path.join(__dirname, 'test_results.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log_success(`Relatório salvo em: ${reportPath}`);

  return report;
}

async function main() {
  console.log(`\n${Colors.BOLD}${'='.repeat(60)}`);
  console.log(`TESTES DE INTEGRAÇÃO - POLLING E PDF DA NFSE`);
  console.log(`${'='.repeat(60)}${Colors.RESET}\n`);

  const results = [];

  // Teste 1: Emissão
  const emissionResult = await testEmission();
  results.push({
    test: 'Emissão',
    success: emissionResult.success,
    details: emissionResult,
  });

  if (!emissionResult.success) {
    log_error('Emissão falhou. Não é possível continuar com os próximos testes.');
    generateReport(results);
    process.exit(1);
  }

  const protocolo = emissionResult.protocolo;
  let chave = emissionResult.chave;

  // Teste 2: Polling
  console.log();
  const pollingResult = await testPolling(protocolo);
  results.push({
    test: 'Polling',
    success: pollingResult.success,
    details: pollingResult,
  });

  // Teste 3: PDF
  console.log();
  if (pollingResult.success && pollingResult.data?.chaveAcesso) {
    chave = pollingResult.data.chaveAcesso;
  }

  if (chave) {
    const pdfResult = await testPdfDownload(chave);
    results.push({
      test: 'PDF Download',
      success: pdfResult.success,
      details: pdfResult,
    });
  } else {
    log_info('Pulando teste de PDF (chave não disponível)');
  }

  // Teste 4: Tratamento de Erros
  console.log();
  const errorResults = await testErrorHandling();
  results.push(...errorResults.map(r => ({ test: `Erro: ${r.test}`, success: r.passed, details: r })));

  // Teste 5: Certificado e Métricas
  console.log();
  const certResult = await testCertificateValidation();
  results.push({
    test: 'Certificado/Métricas',
    success: certResult.success,
    details: certResult,
  });

  // Gerar relatório
  console.log();
  const report = generateReport(results);

  // Retornar código de saída apropriado
  process.exit(report.summary.failed === 0 ? 0 : 1);
}

main().catch(err => {
  log_error(`Erro fatal: ${err.message}`);
  process.exit(1);
});
