import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeSicoobServices, getBoletoService } from '../src/services/sicoob';
import type { BoletoPayloadV3 } from '../src/services/sicoob';
import { createClient } from '@supabase/supabase-js';

// Carregar .env do diretório apps/backend
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../.env') });

async function main() {
  console.log('🔐 Testando integração Boleto Sicoob (Sandbox)\n');
  
  // Inicializar serviços Sicoob
  initializeSicoobServices({
    environment: process.env.SICOOB_ENVIRONMENT as 'sandbox' | 'production',
    baseUrl: process.env.SICOOB_BOLETO_BASE_URL || process.env.SICOOB_API_BASE_URL!,
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

  console.log('✓ Serviços Sicoob inicializados');

  // Obter serviço de Boleto
  const boletoService = getBoletoService();

  // Teste 0: Criar Boleto (V3 mínimo)
  console.log('\n=== Teste 0: Criar Boleto V3 (mínimo) ===');
  try {
    const hoje = new Date();
    const vencimento = new Date();
    vencimento.setDate(hoje.getDate() + 30);

    const payloadV3: BoletoPayloadV3 = {
      numeroContrato: Number(process.env.SICOOB_NUMERO_CONTRATO || '123456'),
      modalidade: Number(process.env.SICOOB_MODALIDADE || '1'),
      numeroContaCorrente: Number(process.env.SICOOB_CONTA_CORRENTE || '144796'),
      especieDocumento: process.env.SICOOB_ESPECIE_DOCUMENTO || 'DM',
      dataEmissao: hoje.toISOString().slice(0, 10),
      dataVencimento: vencimento.toISOString().slice(0, 10),
      valorNominal: 100.0,
      pagador: {
        numeroCpfCnpj: process.env.SICOOB_PAGADOR_CPF || '12345678901',
        nome: 'Teste Sandbox',
        endereco: 'Rua Teste 123',
        cidade: 'Brasilia',
        cep: '70000000',
        uf: 'DF',
      },
      seuNumero: 'TESTE001',
    };

    const boletoV3 = await boletoService.criarBoleto(payloadV3);
    console.log('✓ Boleto V3 criado:', {
      nossoNumero: boletoV3.nosso_numero,
      linhaDigitavel: boletoV3.numero_boleto,
    });

    await registrarNoSupabase('boleto_v3_criado', boletoV3);
  } catch (error: any) {
    console.error('✗ Erro ao criar boleto V3:', error.message);
  }

  // Teste 1: Gerar boleto
  console.log('\n=== Teste 1: Gerar Boleto ===');
  try {
    const dataVencimento = new Date();
    dataVencimento.setDate(dataVencimento.getDate() + 15); // 15 dias

    const boleto = await boletoService.gerarBoleto({
      modalidade: 1, // 1 = Simples
      numeroTituloCliente: 'TESTE-' + Date.now(),
      dataVencimento: dataVencimento.toISOString().split('T')[0],
      valorTitulo: 350.75,
      pagador: {
        nome: 'Carlos Souza Teste',
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
      mensagensPosicao5a8: ['Teste de geracao de boleto via sandbox'],
    });

    console.log('✓ Boleto gerado:', {
      nossoNumero: boleto.nosso_numero,
      linhaDigitavel: boleto.numero_boleto,
      codigoBarras: boleto.nosso_numero?.substring(0, 20) + '...',
    });

    // Registrar no Supabase
    await registrarNoSupabase('boleto_gerado', boleto);

    // Teste 2: Consultar boleto recém-criado
    if (boleto.nosso_numero) {
      console.log('\n=== Teste 2: Consultar Boleto ===');
      try {
        const consultaBoleto = await boletoService.consultarBoleto(boleto.nosso_numero);
        console.log('✓ Boleto consultado:', {
          nossoNumero: consultaBoleto.nosso_numero,
          status: consultaBoleto.status,
          valor: consultaBoleto.valor,
        });

        await registrarNoSupabase('boleto_consultado', consultaBoleto);
      } catch (error: any) {
        console.error('✗ Erro ao consultar boleto:', error.message);
      }
    }
  } catch (error: any) {
    console.error('✗ Erro ao gerar boleto:', error.message);
  }

  // Teste 3: Listar boletos
  console.log('\n=== Teste 3: Listar Boletos ===');
  try {
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - 30); // 30 dias atrás

    const lista = await boletoService.listarBoletos({
      data_inicio: dataInicio.toISOString().split('T')[0],
      data_fim: new Date().toISOString().split('T')[0],
      pagina: 1,
      limite: 10,
    });

    console.log('✓ Boletos listados:', {
      total: lista.paginacao?.total_itens || 0,
      registros: lista.boletos?.length || 0,
    });

    await registrarNoSupabase('boleto_lista', lista);
  } catch (error: any) {
    console.error('✗ Erro ao listar boletos:', error.message);
  }

  // Teste 4: Baixar PDF de boleto (se houver um boleto criado)
  console.log('\n=== Teste 4: Baixar PDF do Boleto ===');
  try {
    const nossoNumeroTeste = 'teste123'; // Substitua por um nossoNumero válido
    const pdfBuffer = await boletoService.baixarPDF(nossoNumeroTeste);
    console.log('✓ PDF baixado:', {
      tamanho: pdfBuffer.length,
      tipo: 'Buffer',
    });
  } catch (error: any) {
    console.error('✗ Erro ao baixar PDF (esperado em sandbox sem boleto prévio):', error.message);
  }

  console.log('\n=== Testes de Boleto concluídos ===');
}

async function registrarNoSupabase(tipo: string, dados: any): Promise<void> {
  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.log('⚠ Supabase não configurado, pulando registro');
      return;
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { error } = await supabase.from('sicoob_test_logs').insert({
      tipo_teste: tipo,
      categoria: 'boleto',
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

main().catch((err) => {
  console.error('❌ Falha nos testes de Boleto:', err);
  process.exit(1);
});
