import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeSicoobServices, getPixService, getBoletoService } from '../src/services/sicoob';
import { createClient } from '@supabase/supabase-js';

// Carregar .env do diretório apps/backend
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../.env') });

// Configurar cliente Supabase
const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  details: any;
  timestamp: string;
}

const results: TestResult[] = [];

async function registrarNoSupabase(categoria: string, tipo: string, dados: any): Promise<void> {
  if (!supabase) {
    console.log('⚠ Supabase não configurado, pulando registro');
    return;
  }

  try {
    const { error } = await supabase.from('sicoob_test_logs').insert({
      tipo_teste: tipo,
      categoria,
      dados_resposta: dados,
      timestamp: new Date().toISOString(),
      ambiente: process.env.SICOOB_ENVIRONMENT || 'sandbox',
    });

    if (error) {
      console.error('⚠ Erro ao registrar no Supabase:', error.message);
    } else {
      console.log('✓ Resposta registrada no Supabase');
    }
  } catch (error: any) {
    console.error('⚠ Erro ao conectar com Supabase:', error.message);
  }
}

async function testGetCobPorTxid() {
  console.log('\n=== Teste 1: GET /cob/{txid} - Consultar Cobrança Criada ===');
  const txid = 'PHB7MFTILK1NFV813678801761920911096';
  
  try {
    const pixService = getPixService();
    const cobranca = await pixService.consultarCobranca(txid);
    
    console.log('✓ Cobrança consultada com sucesso:', {
      txid: cobranca.txid,
      status: cobranca.status,
      valor: cobranca.valor?.original,
      chave: cobranca.chave,
      criacao: cobranca.calendario?.criacao,
    });

    await registrarNoSupabase('pix', 'cob_consulta_txid', cobranca);

    results.push({
      test: 'GET /cob/{txid}',
      status: 'PASS',
      details: cobranca,
      timestamp: new Date().toISOString(),
    });

    return cobranca;
  } catch (error: any) {
    console.error('✗ Erro ao consultar cobrança:', error.message);
    console.error('  Response:', error.response?.data || error.response || 'N/A');

    results.push({
      test: 'GET /cob/{txid}',
      status: 'FAIL',
      details: { error: error.message, response: error.response?.data },
      timestamp: new Date().toISOString(),
    });

    return null;
  }
}

async function testCobvSandboxLimitation() {
  console.log('\n=== Teste 2: POST /cobv - Validar Limitação do Sandbox ===');
  
  try {
    const pixService = getPixService();
    
    const dataVencimento = new Date();
    dataVencimento.setDate(dataVencimento.getDate() + 7); // 7 dias

    const payload = {
      calendario: {
        dataDeVencimento: dataVencimento.toISOString().split('T')[0],
        validadeAposVencimento: 30,
      },
      devedor: {
        cpf: '12345678909',
        nome: 'Carlos Teste',
      },
      valor: {
        original: '150.00',
      },
      chave: process.env.SICOOB_PIX_CHAVE!,
      solicitacaoPagador: 'Teste de cobrança com vencimento - sandbox',
    };

    const cobranca = await pixService.criarCobrancaComVencimento(payload);
    
    console.log('⚠ INESPERADO: /cobv funcionou no sandbox!', {
      txid: cobranca.txid,
      status: cobranca.status,
    });

    await registrarNoSupabase('pix', 'cobv_sandbox_success', cobranca);

    results.push({
      test: 'POST /cobv (validação sandbox)',
      status: 'PASS',
      details: { message: 'Funcionou inesperadamente', cobranca },
      timestamp: new Date().toISOString(),
    });

    return cobranca;
  } catch (error: any) {
    if (error.response?.status === 405) {
      console.log('✓ Confirmado: /cobv retorna 405 no sandbox (limitação esperada)');
      console.log('  Mensagem:', error.response?.data?.mensagem || 'Method Not Allowed');

      await registrarNoSupabase('pix', 'cobv_sandbox_405', {
        status: 405,
        message: 'Method Not Allowed - limitação do sandbox',
        response: error.response?.data,
      });

      results.push({
        test: 'POST /cobv (validação sandbox)',
        status: 'PASS',
        details: { message: 'Limitação 405 confirmada', error: error.response?.data },
        timestamp: new Date().toISOString(),
      });
    } else {
      console.error('✗ Erro diferente de 405:', error.message);
      console.error('  Response:', error.response?.data || 'N/A');

      results.push({
        test: 'POST /cobv (validação sandbox)',
        status: 'FAIL',
        details: { error: error.message, response: error.response?.data },
        timestamp: new Date().toISOString(),
      });
    }

    return null;
  }
}

async function testBoletoComNossoNumero() {
  console.log('\n=== Teste 3: Boleto - Gerar, Consultar e Baixar PDF ===');
  
  try {
    const boletoService = getBoletoService();
    
    // Passo 1: Gerar boleto
    console.log('\n[1/3] Gerando boleto...');
    const dataVencimento = new Date();
    dataVencimento.setDate(dataVencimento.getDate() + 15); // 15 dias

    const boleto = await boletoService.gerarBoleto({
      modalidade: 1, // 1 = Simples
      numeroTituloCliente: 'TEST-' + Date.now(),
      dataVencimento: dataVencimento.toISOString().split('T')[0],
      valorTitulo: 250.50,
      pagador: {
        nome: 'Carlos Teste Homologacao',
        numeroCpfCnpj: '12345678909',
        tipoPessoa: 1, // 1 = Pessoa Física
        endereco: 'Rua Exemplo 100',
        nomeBairro: 'Centro',
        nomeMunicipio: 'Sao Paulo',
        siglaUf: 'SP',
        numeroCep: '01310100',
      },
      especieDocumento: 2, // 2 = Duplicata Mercantil
      codigoAceite: 'N',
      multa: {
        tipoMulta: 0, // 0 = Isento
      },
      juros: {
        tipoJuros: 0, // 0 = Isento
      },
      mensagensPosicao5a8: ['Teste ciclo completo - gerar, consultar, PDF'],
    });

    console.log('✓ Boleto gerado:', {
      nossoNumero: boleto.nosso_numero,
      linhaDigitavel: boleto.numero_boleto,
      valor: boleto.valor,
    });

    await registrarNoSupabase('boleto', 'boleto_gerado', boleto);

    const nossoNumero = boleto.nosso_numero;

    if (!nossoNumero) {
      console.error('✗ nossoNumero não retornado; não é possível continuar');
      results.push({
        test: 'Boleto (gerar + consultar + PDF)',
        status: 'FAIL',
        details: { error: 'nossoNumero ausente', boleto },
        timestamp: new Date().toISOString(),
      });
      return null;
    }

    // Passo 2: Consultar boleto
    console.log('\n[2/3] Consultando boleto por nossoNumero...');
    const consultaBoleto = await boletoService.consultarBoleto(nossoNumero);
    
    console.log('✓ Boleto consultado:', {
      nossoNumero: consultaBoleto.nosso_numero,
      status: consultaBoleto.status,
      valor: consultaBoleto.valor,
    });

    await registrarNoSupabase('boleto', 'boleto_consultado', consultaBoleto);

    // Passo 3: Baixar PDF
    console.log('\n[3/3] Baixando PDF do boleto...');
    const pdfBuffer = await boletoService.baixarPDF(nossoNumero);
    
    console.log('✓ PDF baixado:', {
      tamanho: pdfBuffer.length,
      tipo: 'Buffer',
      valido: pdfBuffer.length > 1000,
    });

    // Salvar PDF localmente para evidência
    const fs = await import('fs/promises');
    const pdfPath = `boleto_${nossoNumero}_${Date.now()}.pdf`;
    await fs.writeFile(pdfPath, pdfBuffer);
    console.log(`✓ PDF salvo em: ${pdfPath}`);

    await registrarNoSupabase('boleto', 'boleto_pdf_baixado', {
      nossoNumero,
      tamanho: pdfBuffer.length,
      arquivo: pdfPath,
    });

    results.push({
      test: 'Boleto (gerar + consultar + PDF)',
      status: 'PASS',
      details: {
        boleto,
        consulta: consultaBoleto,
        pdf: { tamanho: pdfBuffer.length, arquivo: pdfPath },
      },
      timestamp: new Date().toISOString(),
    });

    return { boleto, consulta: consultaBoleto, pdf: pdfPath };
  } catch (error: any) {
    console.error('✗ Erro no ciclo de boleto:', error.message);
    console.error('  Response:', error.response?.data || 'N/A');

    results.push({
      test: 'Boleto (gerar + consultar + PDF)',
      status: 'FAIL',
      details: { error: error.message, response: error.response?.data },
      timestamp: new Date().toISOString(),
    });

    return null;
  }
}

async function gerarRelatorio() {
  console.log('\n' + '='.repeat(70));
  console.log('RELATÓRIO FINAL - CICLO COMPLETO SICOOB');
  console.log('='.repeat(70));

  const total = results.length;
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  const skipped = results.filter((r) => r.status === 'SKIP').length;

  console.log(`\nTotal de testes: ${total}`);
  console.log(`✓ Passou: ${passed}`);
  console.log(`✗ Falhou: ${failed}`);
  console.log(`⊙ Pulado: ${skipped}`);

  console.log('\nDetalhes por teste:');
  results.forEach((r, i) => {
    const symbol = r.status === 'PASS' ? '✓' : r.status === 'FAIL' ? '✗' : '⊙';
    console.log(`${i + 1}. ${symbol} ${r.test} - ${r.status}`);
  });

  // Salvar relatório JSON
  const fs = await import('fs/promises');
  const reportPath = `sicoob_test_report_${Date.now()}.json`;
  await fs.writeFile(
    reportPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        ambiente: process.env.SICOOB_ENVIRONMENT || 'sandbox',
        summary: { total, passed, failed, skipped },
        results,
      },
      null,
      2
    )
  );

  console.log(`\n✓ Relatório salvo em: ${reportPath}`);

  // Registrar relatório no Supabase
  if (supabase) {
    await registrarNoSupabase('relatorio', 'ciclo_completo', {
      summary: { total, passed, failed, skipped },
      results,
    });
  }

  console.log('\n' + '='.repeat(70));
}

async function main() {
  console.log('🔐 Teste de Ciclo Completo Sicoob (PIX + Boleto)\n');
  console.log('Ambiente:', process.env.SICOOB_ENVIRONMENT || 'sandbox');
  console.log('Supabase:', supabase ? 'Conectado' : 'Desabilitado');
  console.log('');

  // Inicializar serviços Sicoob
  initializeSicoobServices({
    environment: process.env.SICOOB_ENVIRONMENT as 'sandbox' | 'production',
    baseUrl: process.env.SICOOB_PIX_BASE_URL || process.env.SICOOB_API_BASE_URL!,
    authUrl: process.env.SICOOB_AUTH_URL!,
    authValidateUrl: process.env.SICOOB_AUTH_VALIDATE_URL,
    clientId: process.env.SICOOB_CLIENT_ID!,
    clientSecret: process.env.SICOOB_CLIENT_SECRET || undefined,
    certPath: process.env.SICOOB_CERT_PATH || undefined,
    keyPath: process.env.SICOOB_KEY_PATH || undefined,
    caPath: process.env.SICOOB_CA_PATH || undefined,
    caBase64: process.env.SICOOB_CA_BASE64 || undefined,
    pfxBase64: process.env.SICOOB_CERT_PFX_BASE64 || undefined,
    pfxPassphrase: process.env.SICOOB_CERT_PFX_PASS || undefined,
    webhookSecret: process.env.SICOOB_WEBHOOK_SECRET,
    cooperativa: process.env.SICOOB_COOPERATIVA,
    conta: process.env.SICOOB_CONTA,
    scopes: process.env.SICOOB_SCOPES
      ? process.env.SICOOB_SCOPES.split(/[,\s]+/).filter(Boolean)
      : undefined,
  });

  console.log('✓ Serviços Sicoob inicializados\n');

  // Executar testes
  await testGetCobPorTxid();
  await testCobvSandboxLimitation();
  await testBoletoComNossoNumero();

  // Gerar relatório final
  await gerarRelatorio();
}

main().catch((err) => {
  console.error('❌ Falha nos testes:', err);
  process.exit(1);
});
