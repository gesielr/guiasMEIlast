import 'dotenv/config';
import { initializeSicoobServices, getBoletoService } from '../src/services/sicoob';
import { createClient } from '@supabase/supabase-js';

async function main() {
  // Inicializar serviços Sicoob
  initializeSicoobServices({
    environment: process.env.SICOOB_ENVIRONMENT as 'sandbox' | 'production',
    baseUrl: process.env.SICOOB_API_BASE_URL!,
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

  // Teste 1: Gerar boleto
  console.log('\n=== Teste 1: Gerar Boleto ===');
  try {
    const dataVencimento = new Date();
    dataVencimento.setDate(dataVencimento.getDate() + 15); // 15 dias

    const boleto = await boletoService.gerarBoleto({
      numero_controle: 'TESTE-' + Date.now(),
      beneficiario: {
        nome: 'Empresa Teste Ltda',
        cpf_cnpj: process.env.SICOOB_CNPJ_BENEFICIARIO || '12345678000190',
        endereco: 'Rua da Empresa',
        numero: '1000',
        bairro: 'Centro',
        cidade: 'São Paulo',
        estado: 'SP',
      },
      pagador: {
        cpf_cnpj: '12345678909',
        nome: 'Carlos Souza Teste',
        endereco: 'Rua Exemplo',
        numero: '100',
        bairro: 'Centro',
        cidade: 'São Paulo',
        estado: 'SP',
      },
      valor: 350.75,
      data_vencimento: dataVencimento.toISOString().split('T')[0],
      tipo_juros: 'ISENTO',
      tipo_multa: 'ISENTO',
      descricao: 'Teste de geração de boleto via sandbox',
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
