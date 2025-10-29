import { z } from "zod";

const documentoSchema = z.string().min(11);

const prestadorSchema = z.object({
  cpfCnpj: documentoSchema,
  inscricaoMunicipal: z.string().min(1),
  codigoMunicipio: z.string().length(7)
});

const enderecoSchema = z.object({
  codigoMunicipio: z.string().length(7),
  logradouro: z.string().min(1),
  numero: z.string().min(1),
  bairro: z.string().min(1),
  complemento: z.string().optional(),
  cep: z.string().min(8).max(8),
  uf: z.string().length(2)
});

const tomadorSchema = z.object({
  nome: z.string().min(1),
  documento: documentoSchema,
  email: z.string().email().optional(),
  endereco: enderecoSchema
});

const servicoSchema = z.object({
  codigoTributacaoMunicipio: z.string().min(1),
  itemListaLc116: z.string().min(1),
  codigoCnae: z.string().min(1),
  descricao: z.string().min(3),
  codigoMunicipio: z.string().length(7),
  aliquota: z.number().nonnegative(),
  valorServicos: z.number().positive(),
  valorDeducoes: z.number().nonnegative().default(0),
  valorIss: z.number().nonnegative().optional()
});

const identificationSchema = z.object({
  numero: z.string().min(1),
  serie: z.string().min(1),
  competencia: z.string().regex(/^\d{4}-\d{2}$/, "Competencia no formato YYYY-MM"),
  dataEmissao: z.string().optional()
});

const regimeSchema = z.object({
  regimeEspecialTributacao: z.string().min(1),
  optanteSimples: z.boolean(),
  incentivoFiscal: z.boolean().default(false)
});


// Campos adicionais para fluxos especiais
const obraSchema = z
  .object({
    codigoObra: z.string().min(1),
    cep: z.string().min(8).max(8),
    municipio: z.string().min(1),
    bairro: z.string().min(1),
    logradouro: z.string().min(1),
    numero: z.string().min(1),
    complemento: z.string().optional(),
    inscricaoImobiliaria: z.string().min(1)
  })
  .optional();

const eventoSchema = z
  .object({
    identificacao: z.string().min(1),
    dataInicial: z.string().min(10),
    dataFinal: z.string().min(10),
    descricao: z.string().min(3),
    cep: z.string().min(8).max(8),
    municipio: z.string().min(1),
    bairro: z.string().min(1),
    logradouro: z.string().min(1),
    numero: z.string().min(1),
    complemento: z.string().optional()
  })
  .optional();

const exportacaoSchema = z
  .object({
    modalidade: z.string().min(1),
    vinculo: z.string().min(1),
    moeda: z.string().min(3).max(3),
    valorServicoMoedaEstrangeira: z.number().nonnegative(),
    paisResultado: z.string().min(1),
    mecanismoApoio: z.string().min(1),
    mecanismoApoioTomador: z.string().min(1),
    vinculoOperacao: z.string().min(1),
    numeroDeclaracaoImportacao: z.string().optional(),
    numeroRegistroExportacao: z.string().optional(),
    compartilharComMDIC: z.boolean()
  })
  .optional();

const deducaoSchema = z.object({
  tipoDocumento: z.string().min(1),
  chaveAcesso: z.string().min(1),
  dataEmissao: z.string().min(10),
  valorDedutivel: z.number().nonnegative(),
  valorDeducao: z.number().nonnegative()
});

const beneficioMunicipalSchema = z
  .object({
    identificacao: z.string().min(1),
    valorReducao: z.number().nonnegative(),
    percentualReducao: z.number().min(0).max(100)
  })
  .optional();

const retencaoIssqnSchema = z
  .object({
    retidoPor: z.string().min(1),
    valorRetido: z.number().nonnegative()
  })
  .optional();

export const createDpsSchema = z.object({
  userId: z.string().uuid(),
  identification: identificationSchema,
  prestador: prestadorSchema,
  tomador: tomadorSchema,
  servico: servicoSchema,
  regime: regimeSchema,
  referencias: z
    .object({
      codigoMunicipioIncidencia: z.string().length(7),
      naturezaOperacao: z.string().min(1)
    })
    .optional(),
  obra: obraSchema,
  evento: eventoSchema,
  exportacao: exportacaoSchema,
  deducoes: z.array(deducaoSchema).optional(),
  beneficioMunicipal: beneficioMunicipalSchema,
  retencaoIssqn: retencaoIssqnSchema
});

export type CreateDpsDto = z.infer<typeof createDpsSchema>;

export const cancelSchema = z.object({ protocolo: z.string().min(1) });

export const emitNfseSchema = z.object({
  userId: z.string().uuid(),
  versao: z.string().min(1),
  dps_xml_gzip_b64: z.string().min(1)
});

export type EmitNfseDto = z.infer<typeof emitNfseSchema>;
