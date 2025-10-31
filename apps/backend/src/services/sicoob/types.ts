/**
 * Sicoob API Types and Interfaces
 * Define all request/response types for Sicoob integration
 */

// ============================================================
// AUTHENTICATION TYPES
// ============================================================

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

export interface CertificateConfig {
  cert: string;
  key: string;
  ca?: string;
}

// ============================================================
// PIX TYPES - Padrão PADI PIX do Bacen
// ============================================================

export interface CobrancaPixImediata {
  // Formato padrão Bacen PADI PIX
  calendario?: {
    expiracao: number; // segundos
    criacao?: string;
  };
  devedor?: {
    cpf?: string;
    cnpj?: string;
    nome: string;
  };
  valor: {
    original: string; // valor em string formato "100.00"
    modalidadeAlteracao?: number;
  };
  chave: string;
  solicitacaoPagador?: string;
  infoAdicionais?: Array<{
    nome: string;
    valor: string;
  }>;
  
  // Campos adicionais opcionais
  txid?: string; // para PUT com txid específico
}

export interface CobrancaPixVencimento {
  // Formato padrão Bacen PADI PIX cobv
  calendario: {
    dataDeVencimento: string; // YYYY-MM-DD
    validadeAposVencimento?: number; // dias
  };
  devedor?: {
    cpf?: string;
    cnpj?: string;
    nome: string;
    logradouro?: string;
    cidade?: string;
    uf?: string;
    cep?: string;
  };
  valor: {
    original: string;
    modalidadeAlteracao?: number;
    juros?: {
      modalidade: number; // 1=Valor fixo, 2=Percentual
      valorPerc: string;
    };
    multa?: {
      modalidade: number; // 1=Valor fixo, 2=Percentual
      valorPerc: string;
    };
    desconto?: {
      modalidade: number;
      descontoDataFixa?: Array<{
        data: string;
        valorPerc: string;
      }>;
    };
  };
  chave: string;
  solicitacaoPagador?: string;
  infoAdicionais?: Array<{
    nome: string;
    valor: string;
  }>;
  
  // Campos adicionais opcionais
  txid?: string; // para PUT com txid específico
}

export interface CobrancaResponse {
  txid: string;
  qr_code: string;
  qr_code_url?: string;
  valor: number;
  status: 'VIGENTE' | 'RECEBIDA' | 'CANCELADA' | 'DEVOLVIDA' | 'EXPIRADA';
  data_criacao: string;
  data_vencimento?: string;
  chave_pix: string;
  pagador?: {
    cpf?: string;
    cnpj?: string;
    nome?: string;
  };
}

export interface ListaCobrancas {
  cobracas: CobrancaResponse[];
  paginacao: {
    pagina_atual: number;
    total_paginas: number;
    total_itens: number;
  };
}

export interface FiltrosCobranca {
  status?: 'VIGENTE' | 'RECEBIDA' | 'CANCELADA' | 'DEVOLVIDA' | 'EXPIRADA';
  // Bacen PADI utiliza inicio/fim em RFC3339
  inicio?: string; // ex: 2025-02-01T00:00:00Z
  fim?: string;    // ex: 2025-02-28T23:59:59Z
  // Paginação
  paginaAtual?: number;
  itensPorPagina?: number;
}

export interface QRCodeResponse {
  txid: string;
  qr_code: string;
  qr_code_url: string;
  valor: number;
  data_criacao: string;
}

// ============================================================
// BOLETO TYPES
// ============================================================

export interface DadosBoleto {
  // Campos obrigatórios conforme API Sicoob V3
  modalidade: number; // 1 = Simples
  numeroTituloCliente: string; // Seu número (identificador do cliente)
  dataVencimento: string; // YYYY-MM-DD
  valorTitulo: number;
  
  // Dados do pagador (obrigatórios)
  pagador: {
    nome: string;
    numeroCpfCnpj: string; // Apenas números
    tipoPessoa: 1 | 2; // 1 = Física, 2 = Jurídica
    endereco?: string;
    nomeBairro?: string;
    nomeMunicipio?: string;
    siglaUf?: string;
    numeroCep?: string;
  };
  
  // Campos opcionais
  especieDocumento?: 2; // 2 = Duplicata Mercantil
  codigoAceite?: 'A' | 'N'; // A = Aceite, N = Não aceite
  numeroParcela?: number;
  
  // Multa e Juros (opcional)
  multa?: {
    tipoMulta?: 0 | 1 | 2; // 0 = Isento, 1 = Valor Fixo, 2 = Percentual
    valorMulta?: number;
    dataMulta?: string; // YYYY-MM-DD
  };
  
  juros?: {
    tipoJuros?: 0 | 1 | 3; // 0 = Isento, 1 = Valor por dia, 3 = Percentual mensal
    valorJuros?: number;
  };
  
  // Mensagens (opcional)
  mensagensPosicao5a8?: string[];
}

export interface BoletoResponse {
  nosso_numero: string;
  numero_boleto: string;
  valor: number;
  data_vencimento: string;
  status: 'ATIVO' | 'PAGO' | 'CANCELADO' | 'VENCIDO';
  data_pagamento?: string;
  valor_pago?: number;
  beneficiario: {
    nome: string;
    cpf_cnpj: string;
  };
  pagador: {
    nome: string;
    cpf_cnpj: string;
  };
}

// ============================================================
// BOLETO V3 STRICT PAYLOAD (as per latest docs)
// ============================================================

export interface BoletoV3Pagador {
  numeroCpfCnpj: string; // 11 or 14 digits
  nome: string;
  endereco: string;
  cidade: string;
  cep: string; // 8 digits, no hyphen
  uf: string; // 2-letter UF
}

export interface BoletoDescontoV3 {
  codigoDesconto: number; // 1=fixed, 2=percent
  data: string; // YYYY-MM-DD
  valor?: number; // when fixed
  taxa?: number; // when percent
}

export interface BoletoMultaV3 {
  codigoMulta: number; // 1=fixed, 2=percent
  data: string; // YYYY-MM-DD
  valor?: number;
  taxa?: number;
}

export interface BoletoJurosV3 {
  codigoJuros: number; // 1=per day, 2=monthly, 3=exempt
  valor?: number; // per day
  taxa?: number; // monthly
}

export interface BoletoRateioCreditoV3 {
  numeroContaRateio: number;
  codigoTipoValorRateio: number; // 1=percent, 2=fixed
  valorRateio: number;
}

export interface BoletoPayloadV3 {
  // Required boleto data
  numeroContrato: number;
  modalidade: number;
  numeroContaCorrente: number;
  especieDocumento: string; // e.g. "DM"
  dataEmissao: string; // YYYY-MM-DD
  dataVencimento: string; // YYYY-MM-DD
  valorNominal: number;

  // Required payer
  pagador: BoletoV3Pagador;

  // Optional fields (include only when present)
  seuNumero?: string;
  descricao?: string;
  codigoNegativacao?: number;
  numeroDiasNegativacao?: number;
  codigoProtesto?: number;
  numeroDiasProtesto?: number;
  descontos?: BoletoDescontoV3[];
  multa?: BoletoMultaV3;
  jurosMora?: BoletoJurosV3;
  rateioCredito?: BoletoRateioCreditoV3[];
}

export interface ListaBoletos {
  boletos: BoletoResponse[];
  paginacao: {
    pagina_atual: number;
    total_paginas: number;
    total_itens: number;
  };
}

export interface FiltrosBoleto {
  status?: 'ATIVO' | 'PAGO' | 'CANCELADO' | 'VENCIDO';
  data_inicio?: string;
  data_fim?: string;
  pagina?: number;
  limite?: number;
}

// ============================================================
// COBRANCA TYPES
// ============================================================

export type PixModalidade = 'IMEDIATA' | 'COM_VENCIMENTO';

export interface PixCobrancaPayload {
  modalidade: PixModalidade;
  imediata?: CobrancaPixImediata;
  comVencimento?: CobrancaPixVencimento;
}

export interface BoletoCobrancaPayload {
  dados: DadosBoleto;
}

export interface CobrancaData {
  tipo: 'PIX' | 'BOLETO';
  descricao?: string;
  pix?: PixCobrancaPayload;
  boleto?: BoletoCobrancaPayload;
  metadados?: Record<string, any>;
}

// ============================================================
// WEBHOOK TYPES
// ============================================================

export type WebhookEventType =
  | 'pix.received'
  | 'pix.returned'
  | 'boleto.paid'
  | 'boleto.expired'
  | 'cobranca.paid'
  | 'cobranca.cancelled';

export interface WebhookEvent {
  id: string;
  timestamp: string;
  tipo: WebhookEventType;
  dados: Record<string, any>;
  assinatura?: string;
}

export interface WebhookPayload {
  evento_id: string;
  timestamp: string;
  tipo_evento: WebhookEventType;
  dados: Record<string, any>;
}

// ============================================================
// ERROR TYPES
// ============================================================

export class SicoobError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'SicoobError';
  }
}

export class SicoobAuthError extends SicoobError {
  constructor(message: string, details?: any) {
    super(message, 401, 'AUTH_ERROR', details);
    this.name = 'SicoobAuthError';
  }
}

export class SicoobValidationError extends SicoobError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'SicoobValidationError';
  }
}

export class SicoobNotFoundError extends SicoobError {
  constructor(message: string, details?: any) {
    super(message, 404, 'NOT_FOUND_ERROR', details);
    this.name = 'SicoobNotFoundError';
  }
}

export class SicoobRateLimitError extends SicoobError {
  constructor(message: string, retryAfter?: number) {
    super(message, 429, 'RATE_LIMIT_ERROR', { retryAfter });
    this.name = 'SicoobRateLimitError';
  }
}

export class SicoobServerError extends SicoobError {
  constructor(message: string, statusCode: number, details?: any) {
    super(message, statusCode, 'SERVER_ERROR', details);
    this.name = 'SicoobServerError';
  }
}

export class SicoobCertificateError extends SicoobError {
  constructor(message: string, details?: any) {
    super(message, 500, 'CERTIFICATE_ERROR', details);
    this.name = 'SicoobCertificateError';
  }
}

// ============================================================
// API CONFIG
// ============================================================

export interface SicoobConfig {
  environment: 'sandbox' | 'production';
  baseUrl: string;
  authUrl: string;
  authValidateUrl?: string;
  clientId: string;
  clientSecret?: string;
  certPath?: string;
  keyPath?: string;
  caPath?: string;
  caBase64?: string;
  pfxBase64?: string;
  pfxPassphrase?: string;
  cooperativa?: string;
  conta?: string;
  webhookSecret?: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  scopes?: string[];
}
