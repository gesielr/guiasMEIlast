import {
  NfseService,
  pfxToPem
} from "./chunk-34J323FM.js";
import {
  listPendingEmissions
} from "./chunk-ONGYNLNV.js";
import "./chunk-PPYPL3RS.js";
import {
  createSupabaseClients,
  env
} from "./chunk-LQ32C36N.js";
import {
  getCobrancaService,
  sicoobLogger
} from "./chunk-DZWHWOQX.js";
import {
  require_body_parser,
  require_express
} from "./chunk-OLUR7OAF.js";
import {
  __require,
  __toESM
} from "./chunk-UPBZT3NW.js";

// src/index.ts
import "dotenv/config";
import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import fastifyExpress from "@fastify/express";
import fastifySensible from "@fastify/sensible";

// routes/auth.ts
import { z } from "zod";

// services/profile-service.ts
var upsertProfile = async (supabase, profile) => {
};
var ensureCustomerRecord = async (supabase, customer) => {
};
var ensurePartnerRecord = async (supabase, partner) => {
};

// routes/auth.ts
var registerBodySchema = z.object({
  role: z.enum(["mei", "autonomo", "partner"]),
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  phone: z.string().min(8),
  document: z.string().optional(),
  businessName: z.string().optional(),
  pis: z.string().optional(),
  referralCode: z.string().optional()
});
var loginBodySchema = z.object({
  identifier: z.string().min(3),
  password: z.string().min(6)
});
async function registerAuthRoutes(app) {
  const supabase = createSupabaseClients();
  app.post("/auth/register", async (request, reply) => {
    const body = registerBodySchema.parse(request.body);
    const { data: userCreated, error: createError } = await supabase.admin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: {
        name: body.name,
        phone: body.phone,
        user_type: body.role,
        referral_code: body.referralCode ?? null
      }
    });
    if (createError || !userCreated.user) {
      request.log.error({ err: createError }, "failed to create user");
      return reply.badRequest("N\xE3o foi poss\xEDvel criar o usu\xE1rio");
    }
    const userId = userCreated.user.id;
    await upsertProfile(supabase.admin, {
      id: userId,
      name: body.name,
      email: body.email,
      phone: body.phone,
      document: body.document ?? null,
      businessName: body.businessName ?? null,
      userType: body.role,
      partnerId: body.role === "partner" ? userId : null
    });
    if (body.role === "partner") {
      if (!body.document) {
        return reply.badRequest("Documento do parceiro \xE9 obrigat\xF3rio");
      }
      await ensurePartnerRecord(supabase.admin, {
        partnerId: userId,
        companyName: body.businessName ?? body.name,
        document: body.document,
        phone: body.phone
      });
    } else if (body.document) {
      await ensureCustomerRecord(supabase.admin, {
        userId,
        type: body.role,
        encryptedDocument: body.document,
        pis: body.pis ?? null,
        partnerId: body.referralCode ?? null
      });
    }
    const { data: sessionData, error: signInError } = await supabase.anon.auth.signInWithPassword({
      email: body.email,
      password: body.password
    });
    if (signInError || !sessionData.session) {
      request.log.error({ err: signInError }, "failed to create session after signup");
    }
    const whatsappLink = body.role === "partner" ? null : `https://wa.me/${env.WHATSAPP_NUMBER}?text=${encodeURIComponent(
      `${env.WHATSAPP_WELCOME_TEMPLATE} (ID:${userId})`
    )}`;
    return {
      userId,
      session: sessionData.session ?? null,
      whatsappLink,
      redirectTo: body.role === "partner" ? `${env.FRONTEND_URL ?? ""}/dashboard/parceiro` : whatsappLink
    };
  });
  app.post("/auth/login", async (request, reply) => {
    const body = loginBodySchema.parse(request.body);
    const isEmail = body.identifier.includes("@");
    const credentials = isEmail ? { email: body.identifier, password: body.password } : { phone: body.identifier, password: body.password };
    const { data: sessionData, error } = await supabase.anon.auth.signInWithPassword(credentials);
    if (error || !sessionData.session) {
      request.log.warn({ err: error }, "invalid credentials");
      return reply.unauthorized("Credenciais inv\xE1lidas");
    }
    const { data: profileData } = await supabase.admin.from("profiles").select("user_type, partner_id, whatsapp_phone").eq("id", sessionData.user?.id).single();
    return {
      session: sessionData.session,
      profile: profileData ?? null,
      challengeRequired: false
    };
  });
  app.post("/auth/verify-2fa", async (_request, _reply) => {
    return { token: "2fa-not-configured" };
  });
}

// routes/dashboard.ts
import { z as z2 } from "zod";
var querySchema = z2.object({ userId: z2.string().uuid() });
async function registerDashboardRoutes(app) {
  const supabase = createSupabaseClients();
  app.get(
    "/dashboards/mei",
    async (request) => {
      const { userId } = querySchema.parse(request.query);
      const [{ data: profile }, { data: nfse }, { data: gps }] = await Promise.all([
        supabase.admin.from("profiles").select("name, onboarding_completed, onboarding_status").eq("id", userId).single(),
        supabase.admin.from("nfse_emissions").select("value, status").eq("user_id", userId),
        supabase.admin.from("gps_emissions").select("value, status").eq("user_id", userId)
      ]);
      const nfseIssued = nfse?.filter((item) => item.status === "issued").length ?? 0;
      const gpsIssued = gps?.filter((item) => item.status === "issued").length ?? 0;
      const gpsTotal = gps?.reduce((acc, item) => acc + (item.value ?? 0), 0) ?? 0;
      return {
        profile,
        nfseIssued,
        gpsIssued,
        gpsTotal
      };
    }
  );
  app.get(
    "/dashboards/autonomo",
    async (request) => {
      const { userId } = querySchema.parse(request.query);
      const [{ data: profile }, { data: gps }] = await Promise.all([
        supabase.admin.from("profiles").select("name, onboarding_completed, onboarding_status").eq("id", userId).single(),
        supabase.admin.from("gps_emissions").select("month_ref, value, status").eq("user_id", userId)
      ]);
      return {
        profile,
        contributions: gps ?? []
      };
    }
  );
  app.get(
    "/dashboards/parceiro",
    async (request) => {
      const { userId } = querySchema.parse(request.query);
      const { data: clients } = await supabase.admin.from("partner_clients").select("client_id, created_at").eq("partner_id", userId);
      const clientIds = clients?.map((client) => client.client_id) ?? [];
      const [nfse, gps, partner] = await Promise.all([
        clientIds.length ? supabase.admin.from("nfse_emissions").select("value").in("user_id", clientIds) : Promise.resolve({ data: [] }),
        clientIds.length ? supabase.admin.from("gps_emissions").select("value").in("user_id", clientIds) : Promise.resolve({ data: [] }),
        supabase.admin.from("partners").select("company_name").eq("id", userId).single()
      ]);
      const issuedNfseCount = nfse?.data?.length ?? 0;
      const gpsTotalValue = gps?.data?.reduce((accumulator, item) => accumulator + (item.value ?? 0), 0) ?? 0;
      const totalRevenue = issuedNfseCount * 3 + gpsTotalValue * 0.06;
      return {
        partner: partner?.data ?? null,
        clients: clients ?? [],
        metrics: {
          totalClients: clientIds.length,
          nfseIssued: nfse?.data?.length ?? 0,
          gpsIssued: gps?.data?.length ?? 0,
          totalRevenue
        }
      };
    }
  );
}

// src/nfse/dto/create-dps.dto.ts
import { z as z3 } from "zod";
var documentoSchema = z3.string().min(11);
var prestadorSchema = z3.object({
  cpfCnpj: documentoSchema,
  inscricaoMunicipal: z3.string().min(1),
  codigoMunicipio: z3.string().length(7)
});
var enderecoSchema = z3.object({
  codigoMunicipio: z3.string().length(7),
  logradouro: z3.string().min(1),
  numero: z3.string().min(1),
  bairro: z3.string().min(1),
  complemento: z3.string().optional(),
  cep: z3.string().min(8).max(8),
  uf: z3.string().length(2)
});
var tomadorSchema = z3.object({
  nome: z3.string().min(1),
  documento: documentoSchema,
  email: z3.string().email().optional(),
  endereco: enderecoSchema
});
var servicoSchema = z3.object({
  codigoTributacaoMunicipio: z3.string().min(1),
  itemListaLc116: z3.string().min(1),
  codigoCnae: z3.string().min(1),
  descricao: z3.string().min(3),
  codigoMunicipio: z3.string().length(7),
  aliquota: z3.number().nonnegative(),
  valorServicos: z3.number().positive(),
  valorDeducoes: z3.number().nonnegative().default(0),
  valorIss: z3.number().nonnegative().optional()
});
var identificationSchema = z3.object({
  numero: z3.string().min(1),
  serie: z3.string().min(1),
  competencia: z3.string().regex(/^\d{4}-\d{2}$/, "Competencia no formato YYYY-MM"),
  dataEmissao: z3.string().optional()
});
var regimeSchema = z3.object({
  regimeEspecialTributacao: z3.string().min(1),
  optanteSimples: z3.boolean(),
  incentivoFiscal: z3.boolean().default(false)
});
var obraSchema = z3.object({
  codigoObra: z3.string().min(1),
  cep: z3.string().min(8).max(8),
  municipio: z3.string().min(1),
  bairro: z3.string().min(1),
  logradouro: z3.string().min(1),
  numero: z3.string().min(1),
  complemento: z3.string().optional(),
  inscricaoImobiliaria: z3.string().min(1)
}).optional();
var eventoSchema = z3.object({
  identificacao: z3.string().min(1),
  dataInicial: z3.string().min(10),
  dataFinal: z3.string().min(10),
  descricao: z3.string().min(3),
  cep: z3.string().min(8).max(8),
  municipio: z3.string().min(1),
  bairro: z3.string().min(1),
  logradouro: z3.string().min(1),
  numero: z3.string().min(1),
  complemento: z3.string().optional()
}).optional();
var exportacaoSchema = z3.object({
  modalidade: z3.string().min(1),
  vinculo: z3.string().min(1),
  moeda: z3.string().min(3).max(3),
  valorServicoMoedaEstrangeira: z3.number().nonnegative(),
  paisResultado: z3.string().min(1),
  mecanismoApoio: z3.string().min(1),
  mecanismoApoioTomador: z3.string().min(1),
  vinculoOperacao: z3.string().min(1),
  numeroDeclaracaoImportacao: z3.string().optional(),
  numeroRegistroExportacao: z3.string().optional(),
  compartilharComMDIC: z3.boolean()
}).optional();
var deducaoSchema = z3.object({
  tipoDocumento: z3.string().min(1),
  chaveAcesso: z3.string().min(1),
  dataEmissao: z3.string().min(10),
  valorDedutivel: z3.number().nonnegative(),
  valorDeducao: z3.number().nonnegative()
});
var beneficioMunicipalSchema = z3.object({
  identificacao: z3.string().min(1),
  valorReducao: z3.number().nonnegative(),
  percentualReducao: z3.number().min(0).max(100)
}).optional();
var retencaoIssqnSchema = z3.object({
  retidoPor: z3.string().min(1),
  valorRetido: z3.number().nonnegative()
}).optional();
var createDpsSchema = z3.object({
  userId: z3.string().uuid(),
  identification: identificationSchema,
  prestador: prestadorSchema,
  tomador: tomadorSchema,
  servico: servicoSchema,
  regime: regimeSchema,
  referencias: z3.object({
    codigoMunicipioIncidencia: z3.string().length(7),
    naturezaOperacao: z3.string().min(1)
  }).optional(),
  obra: obraSchema,
  evento: eventoSchema,
  exportacao: exportacaoSchema,
  deducoes: z3.array(deducaoSchema).optional(),
  beneficioMunicipal: beneficioMunicipalSchema,
  retencaoIssqn: retencaoIssqnSchema
});
var cancelSchema = z3.object({ protocolo: z3.string().min(1) });
var emitNfseSchema = z3.object({
  userId: z3.string().uuid(),
  versao: z3.string().min(1),
  dps_xml_gzip_b64: z3.string().min(1)
});

// src/nfse/controllers/nfse.controller.ts
async function registerNfseController(app) {
  const service = new NfseService();
  app.post("/nfse", async (request, reply) => {
    const contentType = request.headers["content-type"] ?? "";
    if (!contentType.includes("application/json")) {
      return reply.code(415).send({
        error: "Unsupported Media Type",
        message: "Content-Type deve ser application/json"
      });
    }
    const parseResult = emitNfseSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.code(400).send({
        error: "Payload invalido",
        details: parseResult.error.flatten()
      });
    }
    try {
      const result = await service.emit(parseResult.data);
      request.log.info({
        scope: "nfse:emit",
        protocolo: result.protocolo,
        situacao: result.situacao
      });
      return reply.code(201).send(result);
    } catch (error) {
      request.log.error({ err: error, scope: "nfse:emit" });
      if (error instanceof Error && error.message.includes("Payload DPS invalido")) {
        return reply.code(400).send({ error: "Bad Request", message: error.message });
      }
      const statusCode = error?.statusCode;
      if (statusCode) {
        return reply.code(statusCode).send({
          error: "Upstream Error",
          message: error.message,
          details: error?.data ?? null
        });
      }
      throw error;
    }
  });
  app.post("/services/nfse", async (_request, reply) => {
    return reply.code(410).send({ error: "Endpoint substituido", message: "Utilize POST /nfse com payload JSON (dps_xml_gzip_b64)." });
  });
  const handleCredentialUpload = async (request, reply) => {
    const body = request.body;
    const dto = (await import("./credential.dto-YGHOUM6L.js")).credentialSchema.parse(body);
    if (!dto.pfxBase64) {
      return reply.badRequest("Arquivo PFX nao enviado");
    }
    const pfxBuffer = Buffer.from(dto.pfxBase64, "base64");
    if (pfxBuffer.length < 1e3 || pfxBuffer.length > 3e4) {
      return reply.badRequest("Arquivo PFX fora do tamanho esperado (1KB ~ 30KB)");
    }
    try {
      const forge = await import("node-forge");
      const f = forge.default ?? forge;
      const asn1 = f.asn1.fromDer(pfxBuffer.toString("binary"));
      f.pkcs12.pkcs12FromAsn1(asn1, dto.pass);
    } catch {
      return reply.badRequest("Arquivo nao e um PFX valido ou senha incorreta");
    }
    const { storeCredential } = await import("./credentials.repo-YZM3WJWG.js");
    const created = await storeCredential({
      userId: dto.userId,
      type: dto.type,
      subject: dto.subject,
      document: dto.document,
      notAfter: dto.notAfter,
      pfxBase64: dto.pfxBase64,
      pass: dto.pass
    });
    return created;
  };
  app.post("/nfse/credentials", handleCredentialUpload);
  app.post("/services/nfse/credentials", handleCredentialUpload);
  app.get("/nfse/:id", async (request) => {
    const { id } = request.params;
    return service.pollStatus(id);
  });
  app.post("/nfse/:id/cancel", async (request) => {
    const { id } = request.params;
    const body = request.body;
    const dto = cancelSchema.parse({ protocolo: id, ...body ?? {} });
    return { canceled: true, protocolo: dto.protocolo };
  });
  app.get("/nfse/:id/pdf", async (request, reply) => {
    const { id } = request.params;
    const pdf = await service.downloadDanfe(id);
    reply.type("application/pdf");
    reply.header("Content-Disposition", `inline; filename=NFSe-${id}.pdf`);
    return reply.send(pdf);
  });
  app.get("/nfse/:id/storage-pdf", async (request, reply) => {
    const { id } = request.params;
    const { getEmissionPdfStoragePath, downloadPdfFromStorage } = await import("./nfse-emissions.repo-ES3EDD3O.js");
    const storagePath = await getEmissionPdfStoragePath(id);
    if (!storagePath) {
      return reply.notFound("PDF nao disponivel para esta emissao");
    }
    const pdf = await downloadPdfFromStorage(storagePath);
    reply.type("application/pdf");
    reply.header("Content-Disposition", `inline; filename=NFSe-${id}.pdf`);
    return reply.send(pdf);
  });
  app.get("/nfse/metrics", async (request, reply) => {
    try {
      const metrics = service.getMetrics();
      return reply.send(metrics);
    } catch (error) {
      request.log.error({ err: error, scope: "nfse:metrics" });
      return reply.code(500).send({
        error: "Internal Server Error",
        message: "Erro ao obter m\xE9tricas do sistema NFSe"
      });
    }
  });
}

// routes/nfse.ts
import { z as z4 } from "zod";
var nfseSchema = z4.object({
  userId: z4.string().uuid(),
  value: z4.number().positive(),
  serviceDescription: z4.string().min(3),
  tomador: z4.object({
    nome: z4.string(),
    documento: z4.string(),
    email: z4.string().email().optional()
  })
});
var getQuerySchema = z4.object({ userId: z4.string().uuid() });
async function registerNfseRoutes(app) {
  const supabase = createSupabaseClients();
  app.post("/nfse/emit", async (request, reply) => {
    try {
      const { NfseService: NfseService2 } = await import("./nfse.service-DUHN7OXG.js");
      const service = new NfseService2();
      const body = request.body;
      if (!body?.dps_xml_gzip_b64) {
        return reply.status(400).send({ ok: false, error: "Campo dps_xml_gzip_b64 ausente no corpo da requisi\xE7\xE3o." });
      }
      const result = await service.emit({
        versao: body.versao,
        userId: body.userId,
        dps_xml_gzip_b64: body.dps_xml_gzip_b64
      });
      return reply.send(result);
    } catch (err) {
      return reply.status(500).send({ ok: false, error: err.message });
    }
  });
  app.post("/nfse/test-sim", async (request, reply) => {
    try {
      const { NfseService: NfseService2 } = await import("./nfse.service-DUHN7OXG.js");
      const service = new NfseService2();
      const body = request.body;
      if (!body?.dpsXml) {
        return reply.status(400).send({ ok: false, error: "Campo dpsXml ausente no corpo da requisi\xE7\xE3o." });
      }
      const result = await service.testSimNfse({ dpsXml: body.dpsXml });
      return reply.send(result);
    } catch (err) {
      return reply.status(500).send({ ok: false, error: err.message });
    }
  });
}

// src/nfse/workers/scheduler.ts
import cron from "node-cron";

// src/nfse/workers/status-poller.ts
async function pollPendingEmissions() {
  const service = new NfseService();
  const pendentes = await listPendingEmissions();
  for (const emission of pendentes) {
    try {
      const status = await service.pollStatus(emission.protocolo);
      const situacao = status?.situacao ?? status?.status;
      if (situacao === "AUTORIZADA") {
        const chave = status?.chaveAcesso || status?.nfse?.chaveAcesso || status?.chaveNfse || status?.chave || emission.protocolo;
        const pdf = await service.downloadDanfe(chave);
        await service.attachPdf(emission.id, pdf);
      }
    } catch (error) {
      console.error(error);
    }
  }
}

// src/nfse/services/certificate-monitor.service.ts
var { admin } = createSupabaseClients();
async function checkCertificatesExpiry() {
  const { data } = await admin.from("nfse_credentials").select("id, user_id, not_after").lte("not_after", new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3).toISOString());
  if (!data || data.length === 0)
    return;
  for (const cert of data) {
    console.log("Cert expiring soon:", cert.id, cert.not_after);
  }
}

// src/nfse/workers/scheduler.ts
function startScheduler() {
  cron.schedule("*/5 * * * *", async () => {
    try {
      await pollPendingEmissions();
    } catch (err) {
      console.error("Error polling emissions:", err);
    }
  });
  cron.schedule("30 0 * * *", async () => {
    try {
      await checkCertificatesExpiry();
    } catch (err) {
      console.error("Error checking certificate expiry:", err);
    }
  });
}

// routes/gps.ts
import { z as z5 } from "zod";
var gpsSchema = z5.object({
  userId: z5.string().uuid(),
  monthRef: z5.string().regex(/^\d{4}-\d{2}$/),
  value: z5.number().positive(),
  inssCode: z5.string().optional()
});
async function registerGpsRoutes(app) {
  const supabase = createSupabaseClients();
  app.post("/gps", async (request, reply) => {
    const body = gpsSchema.parse(request.body);
    const barcode = `8368${Date.now()}${Math.random().toString().slice(2, 10)}`;
    const { error } = await supabase.admin.from("gps_emissions").insert({
      user_id: body.userId,
      month_ref: body.monthRef,
      value: body.value,
      inss_code: body.inssCode ?? null,
      barcode,
      status: "issued",
      pdf_url: `https://files.guiasmei.com/gps/${barcode}.pdf`
    });
    if (error) {
      request.log.error({ err: error }, "failed to insert gps");
      return reply.internalServerError("N\xE3o foi poss\xEDvel registrar a guia");
    }
    return {
      linhaDigitavel: barcode,
      pdfUrl: `https://files.guiasmei.com/gps/${barcode}.pdf`
    };
  });
}

// routes/payments.ts
import { z as z6 } from "zod";
var checkoutSchema = z6.object({
  userId: z6.string().uuid(),
  successUrl: z6.string().url().optional(),
  cancelUrl: z6.string().url().optional()
});
async function registerPaymentRoutes(app) {
  app.post("/payments/checkout", async (request) => {
    const body = checkoutSchema.parse(request.body);
    const checkoutUrl = env.FRONTEND_URL ? `${env.FRONTEND_URL}/pagamentos?user_id=${body.userId}` : `https://checkout.guiasmei.com/session/${body.userId}`;
    return {
      checkoutUrl
    };
  });
}

// routes/whatsapp.ts
import { z as z7 } from "zod";
var messageSchema = z7.object({
  to: z7.string().min(8),
  message: z7.string().min(1),
  cobrancaId: z7.string().optional(),
  // ID da cobrança relacionada
  tipo: z7.enum(["info", "cobranca", "notificacao"]).optional()
});
async function registerWhatsappRoutes(app) {
  app.post("/whatsapp", async (request) => {
    const payload = messageSchema.parse(request.body);
    request.log.info({ payload }, "WhatsApp message dispatched");
    if (payload.cobrancaId) {
      try {
        const { getCobrancaService: getCobrancaService3 } = await import("./cobranca-db.service-LK2LPX5V.js");
        const cobrancaService2 = getCobrancaService3();
        await cobrancaService2.adicionarHistorico(payload.cobrancaId, {
          tipo: "whatsapp_enviado",
          dados: {
            destinatario: payload.to,
            mensagem: payload.message,
            tipo: payload.tipo || "info"
          }
        });
        request.log.info({ cobrancaId: payload.cobrancaId }, "Hist\xF3rico de WhatsApp registrado");
      } catch (error) {
        request.log.error({ error }, "Erro ao registrar hist\xF3rico de WhatsApp");
      }
    }
    return { ok: true };
  });
  app.post("/whatsapp/webhook", async (request) => {
    request.log.info({ body: request.body }, "WhatsApp webhook received");
    return { ok: true };
  });
}

// src/services/sicoob/auth.service.ts
import * as https from "https";
import * as http from "http";
import axios from "axios";

// src/services/sicoob/types.ts
var SicoobError = class extends Error {
  constructor(message, statusCode, code, details) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.name = "SicoobError";
  }
};
var SicoobAuthError = class extends SicoobError {
  constructor(message, details) {
    super(message, 401, "AUTH_ERROR", details);
    this.name = "SicoobAuthError";
  }
};
var SicoobValidationError = class extends SicoobError {
  constructor(message, details) {
    super(message, 400, "VALIDATION_ERROR", details);
    this.name = "SicoobValidationError";
  }
};
var SicoobNotFoundError = class extends SicoobError {
  constructor(message, details) {
    super(message, 404, "NOT_FOUND_ERROR", details);
    this.name = "SicoobNotFoundError";
  }
};
var SicoobServerError = class extends SicoobError {
  constructor(message, statusCode, details) {
    super(message, statusCode, "SERVER_ERROR", details);
    this.name = "SicoobServerError";
  }
};
var SicoobCertificateError = class extends SicoobError {
  constructor(message, details) {
    super(message, 500, "CERTIFICATE_ERROR", details);
    this.name = "SicoobCertificateError";
  }
};

// src/utils/sicoob-cache.ts
var SicoobCache = class {
  // milliseconds
  constructor(ttlSeconds = 3600) {
    this.cache = /* @__PURE__ */ new Map();
    this.ttl = ttlSeconds * 1e3;
  }
  set(key, value, ttlSeconds) {
    const expiresAt = Date.now() + (ttlSeconds ? ttlSeconds * 1e3 : this.ttl);
    this.cache.set(key, { value, expiresAt });
  }
  get(key) {
    const entry = this.cache.get(key);
    if (!entry)
      return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }
  has(key) {
    const entry = this.cache.get(key);
    if (!entry)
      return false;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }
  delete(key) {
    return this.cache.delete(key);
  }
  clear() {
    this.cache.clear();
  }
  getTimeToExpire(key) {
    const entry = this.cache.get(key);
    if (!entry)
      return null;
    const timeToExpire = entry.expiresAt - Date.now();
    if (timeToExpire <= 0) {
      this.cache.delete(key);
      return null;
    }
    return timeToExpire;
  }
  shouldRefresh(key, refreshBeforeSeconds = 300) {
    const timeToExpire = this.getTimeToExpire(key);
    if (timeToExpire === null)
      return true;
    return timeToExpire < refreshBeforeSeconds * 1e3;
  }
};
var TokenCache = class {
  // Refresh 5 minutes before expiry
  constructor() {
    this.REFRESH_BEFORE_SECONDS = 300;
    this.cache = new SicoobCache(3600);
  }
  setToken(token, expiresInSeconds) {
    this.cache.set("access_token", token, expiresInSeconds);
  }
  getToken() {
    return this.cache.get("access_token");
  }
  hasValidToken() {
    return this.cache.has("access_token");
  }
  shouldRefreshToken() {
    return this.cache.shouldRefresh(
      "access_token",
      this.REFRESH_BEFORE_SECONDS
    );
  }
  clearToken() {
    this.cache.delete("access_token");
  }
  getTimeToExpire() {
    return this.cache.getTimeToExpire("access_token");
  }
};

// src/services/sicoob/certificate.util.ts
import * as fs from "fs";
function loadFile(path, description) {
  if (!fs.existsSync(path)) {
    throw new SicoobCertificateError(`${description} n\xE3o encontrado: ${path}`);
  }
  return fs.readFileSync(path, "utf8");
}
function buildCertificateConfig(config) {
  try {
    if (config.pfxBase64 && config.pfxPassphrase) {
      const buffer = Buffer.from(config.pfxBase64, "base64");
      const { certificatePem, privateKeyPem } = pfxToPem(buffer, config.pfxPassphrase);
      const ca2 = config.caBase64 ? Buffer.from(config.caBase64, "base64").toString("utf8") : config.caPath ? loadFile(config.caPath, "CA Sicoob") : void 0;
      return {
        cert: certificatePem,
        key: privateKeyPem,
        ca: ca2
      };
    }
    if (!config.certPath || !config.keyPath) {
      throw new SicoobCertificateError(
        "Configura\xE7\xE3o de certificado inv\xE1lida. Defina SICOOB_CERT_PFX_BASE64/SICOOB_CERT_PFX_PASS ou SICOOB_CERT_PATH/SICOOB_KEY_PATH."
      );
    }
    const cert = loadFile(config.certPath, "Certificado Sicoob");
    const key = loadFile(config.keyPath, "Chave privada Sicoob");
    const ca = config.caBase64 ? Buffer.from(config.caBase64, "base64").toString("utf8") : config.caPath ? loadFile(config.caPath, "CA Sicoob") : void 0;
    return { cert, key, ca };
  } catch (error) {
    if (error instanceof SicoobCertificateError) {
      throw error;
    }
    throw new SicoobCertificateError(
      `Falha ao preparar certificados Sicoob: ${error.message}`,
      { cause: error }
    );
  }
}

// src/services/sicoob/auth.service.ts
var SicoobAuthService = class {
  constructor(config) {
    this.config = config;
    this.tokenCache = new TokenCache();
    this.maxRetries = config.retryAttempts || 3;
    this.retryDelay = config.retryDelay || 1e3;
    this.axiosInstance = this.setupHttpClient();
    sicoobLogger.info("SicoobAuthService inicializado", {
      environment: config.environment,
      baseUrl: config.baseUrl
    });
  }
  setupHttpClient() {
    const certificates = this.loadCertificates();
    const httpsAgent = this.setupMTLS(certificates);
    return axios.create({
      httpAgent: new http.Agent({ keepAlive: true }),
      httpsAgent,
      timeout: this.config.timeout || 1e4
    });
  }
  loadCertificates() {
    sicoobLogger.debug("Carregando certificados mTLS", {
      certPath: this.config.certPath,
      keyPath: this.config.keyPath,
      caPath: this.config.caPath,
      pfx: Boolean(this.config.pfxBase64)
    });
    return buildCertificateConfig(this.config);
  }
  setupMTLS(certificates) {
    try {
      const agentOptions = {
        cert: certificates.cert,
        key: certificates.key,
        ca: certificates.ca ? [certificates.ca] : void 0,
        rejectUnauthorized: this.config.environment === "production"
      };
      sicoobLogger.info("Agente HTTPS mTLS configurado", {
        rejectUnauthorized: agentOptions.rejectUnauthorized
      });
      return new https.Agent(agentOptions);
    } catch (error) {
      sicoobLogger.error("Erro ao configurar mTLS", error, certificates);
      throw new SicoobCertificateError(
        `Falha ao configurar mTLS: ${error.message}`
      );
    }
  }
  /**
   * Obter token de acesso com retry automático
   */
  async getAccessToken() {
    if (this.tokenCache.hasValidToken()) {
      if (!this.tokenCache.shouldRefreshToken()) {
        const cached = this.tokenCache.getToken();
        if (cached) {
          sicoobLogger.debug("Token v\xE1lido em cache");
          return cached;
        }
      } else {
        sicoobLogger.debug("Token ser\xE1 renovado antecipadamente");
      }
    }
    return this.requestToken();
  }
  async requestToken(attempt = 1) {
    try {
      sicoobLogger.debug(`Requisitando token (tentativa ${attempt})`);
      const tokenEndpoint = this.getTokenEndpoint();
      const params = new URLSearchParams();
      params.append("grant_type", "client_credentials");
      params.append("client_id", this.config.clientId);
      if (this.config.clientSecret) {
        params.append("client_secret", this.config.clientSecret);
      }
      const scopes = this.config.scopes && this.config.scopes.length ? this.config.scopes : ["pix", "boleto", "cobranca"];
      params.append("scope", scopes.join(" "));
      const response = await this.axiosInstance.post(
        tokenEndpoint,
        params.toString(),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          }
        }
      );
      const { access_token, expires_in } = response.data;
      this.tokenCache.setToken(access_token, expires_in);
      sicoobLogger.info("Token obtido com sucesso", {
        expiresIn: expires_in,
        attemptUsed: attempt
      });
      return access_token;
    } catch (error) {
      sicoobLogger.warn(
        `Erro ao requisitar token (tentativa ${attempt}/${this.maxRetries})`,
        error
      );
      if (attempt < this.maxRetries) {
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        sicoobLogger.debug("Aguardando para nova tentativa", { delay });
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.requestToken(attempt + 1);
      }
      throw new SicoobAuthError(
        `Falha ao obter token ap\xF3s ${this.maxRetries} tentativas`,
        { error: error.message }
      );
    }
  }
  /**
   * Renovar token manualmente
   */
  async refreshToken() {
    sicoobLogger.info("Renovando token manualmente");
    this.tokenCache.clearToken();
    return this.requestToken();
  }
  /**
   * Validar se um token é válido
   */
  async validateToken(token) {
    try {
      const validationUrl = this.getTokenValidationEndpoint();
      if (!validationUrl) {
        sicoobLogger.warn("Endpoint de valida\xE7\xE3o de token n\xE3o configurado");
        return true;
      }
      const params = new URLSearchParams();
      params.append("token", token);
      params.append("client_id", this.config.clientId);
      if (this.config.clientSecret) {
        params.append("client_secret", this.config.clientSecret);
      }
      await this.axiosInstance.post(validationUrl, params.toString(), {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      });
      sicoobLogger.debug("Token validado com sucesso");
      return true;
    } catch (error) {
      sicoobLogger.warn("Token inv\xE1lido ou expirado", error);
      return false;
    }
  }
  /**
   * Obter informações do cliente autenticado
   */
  async getClientInfo() {
    try {
      const token = await this.getAccessToken();
      const clientInfoUrl = new URL(
        "/client/info",
        this.getAuthBaseUrl()
      ).toString();
      const response = await this.axiosInstance.get(clientInfoUrl, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      sicoobLogger.debug("Informa\xE7\xF5es do cliente obtidas");
      return response.data;
    } catch (error) {
      sicoobLogger.error(
        "Erro ao obter informa\xE7\xF5es do cliente",
        error
      );
      throw new SicoobAuthError(
        `Falha ao obter informa\xE7\xF5es do cliente: ${error.message}`
      );
    }
  }
  /**
   * Limpar cache de token
   */
  clearCache() {
    this.tokenCache.clearToken();
    sicoobLogger.info("Cache de token limpo");
  }
  getTokenEndpoint() {
    return this.config.authUrl;
  }
  getAuthBaseUrl() {
    try {
      const url = new URL(this.config.authUrl);
      if (url.pathname.endsWith("/token")) {
        url.pathname = url.pathname.slice(
          0,
          url.pathname.length - "/token".length
        );
      }
      if (!url.pathname.endsWith("/")) {
        url.pathname += "/";
      }
      url.search = "";
      url.hash = "";
      return url.toString();
    } catch (error) {
      sicoobLogger.warn("N\xE3o foi poss\xEDvel derivar auth base URL", {
        authUrl: this.config.authUrl
      });
      return this.config.authUrl;
    }
  }
  getTokenValidationEndpoint() {
    if (this.config.authValidateUrl) {
      return this.config.authValidateUrl;
    }
    try {
      const url = new URL(this.config.authUrl);
      if (url.pathname.endsWith("/token")) {
        url.pathname = url.pathname.replace(/\/token$/, "/token/validate");
        return url.toString();
      }
    } catch (error) {
      sicoobLogger.warn("N\xE3o foi poss\xEDvel derivar endpoint de valida\xE7\xE3o", {
        authUrl: this.config.authUrl
      });
    }
    return null;
  }
};

// src/services/sicoob/pix.service.ts
import axios2 from "axios";
import * as https2 from "https";
import * as http2 from "http";
var SicoobPixService = class {
  constructor(config, authService2) {
    this.config = config;
    this.authService = authService2;
    this.axiosInstance = this.setupHttpClient();
    sicoobLogger.info("SicoobPixService inicializado");
  }
  setupHttpClient() {
    const httpsAgent = this.setupMTLS();
    return axios2.create({
      baseURL: this.config.baseUrl,
      // URL já inclui o path completo
      httpAgent: new http2.Agent({ keepAlive: true }),
      httpsAgent,
      timeout: this.config.timeout || 3e4
    });
  }
  setupMTLS() {
    try {
      const certificates = buildCertificateConfig(this.config);
      return new https2.Agent({
        cert: certificates.cert,
        key: certificates.key,
        ca: certificates.ca ? [certificates.ca] : void 0,
        rejectUnauthorized: this.config.environment === "production"
      });
    } catch (error) {
      sicoobLogger.error("Erro ao configurar mTLS para PIX", error);
      throw error;
    }
  }
  /**
   * Criar cobrança PIX imediata
   */
  async criarCobrancaImediata(dados) {
    try {
      this.validarDadosCobranca(dados);
      sicoobLogger.debug("Criando cobran\xE7a PIX imediata", { valor: dados.valor });
      const token = await this.authService.getAccessToken();
      const response = await this.axiosInstance.post(
        "/cob",
        dados,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );
      sicoobLogger.info("Cobran\xE7a PIX imediata criada", {
        txid: response.data.txid,
        valor: response.data.valor
      });
      return response.data;
    } catch (error) {
      this.handleError(error, "Erro ao criar cobran\xE7a PIX imediata");
      throw error;
    }
  }
  /**
   * Criar cobrança PIX com vencimento
   */
  async criarCobrancaComVencimento(dados) {
    try {
      this.validarDadosCobranca(dados);
      sicoobLogger.debug("Criando cobran\xE7a PIX com vencimento", {
        valor: dados.valor,
        dataVencimento: dados.data_vencimento
      });
      const token = await this.authService.getAccessToken();
      const response = await this.axiosInstance.post(
        "/cobv",
        dados,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );
      sicoobLogger.info("Cobran\xE7a PIX com vencimento criada", {
        txid: response.data.txid,
        valor: response.data.valor,
        dataVencimento: response.data.data_vencimento
      });
      return response.data;
    } catch (error) {
      this.handleError(
        error,
        "Erro ao criar cobran\xE7a PIX com vencimento"
      );
      throw error;
    }
  }
  /**
   * Consultar cobrança PIX por TXID
   */
  async consultarCobranca(txid) {
    try {
      if (!txid || txid.trim() === "") {
        throw new SicoobValidationError("TXID \xE9 obrigat\xF3rio");
      }
      sicoobLogger.debug("Consultando cobran\xE7a PIX", { txid });
      const token = await this.authService.getAccessToken();
      const response = await this.axiosInstance.get(
        `/cob/${txid}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      sicoobLogger.debug("Cobran\xE7a consultada com sucesso", {
        txid,
        status: response.data.status
      });
      return response.data;
    } catch (error) {
      if (axios2.isAxiosError(error) && error.response?.status === 404) {
        throw new SicoobNotFoundError(`Cobran\xE7a n\xE3o encontrada: ${txid}`);
      }
      this.handleError(error, "Erro ao consultar cobran\xE7a");
      throw error;
    }
  }
  /**
   * Listar cobranças PIX com filtros
   */
  async listarCobrancas(filtros) {
    try {
      sicoobLogger.debug("Listando cobran\xE7as PIX", filtros);
      const token = await this.authService.getAccessToken();
      const params = new URLSearchParams();
      if (filtros?.status)
        params.append("status", filtros.status);
      const toRfc3339 = (d, endOfDay = false) => {
        if (!d.includes("T")) {
          return endOfDay ? `${d}T23:59:59Z` : `${d}T00:00:00Z`;
        }
        return d;
      };
      if (filtros?.inicio)
        params.append("inicio", toRfc3339(filtros.inicio));
      if (filtros?.fim)
        params.append("fim", toRfc3339(filtros.fim, true));
      if (typeof filtros?.paginaAtual === "number") {
        params.append("paginacao.paginaAtual", filtros.paginaAtual.toString());
      }
      if (typeof filtros?.itensPorPagina === "number") {
        params.append("paginacao.itensPorPagina", filtros.itensPorPagina.toString());
      }
      const response = await this.axiosInstance.get(
        "/cob",
        {
          params: Object.fromEntries(params),
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      const totalItens = response.data?.paginacao?.total_itens ?? 0;
      sicoobLogger.debug("Cobran\xE7as listadas", { total: totalItens });
      return response.data;
    } catch (error) {
      this.handleError(error, "Erro ao listar cobran\xE7as");
      throw error;
    }
  }
  /**
   * Cancelar ou devolver cobrança PIX
   */
  async cancelarCobranca(txid) {
    try {
      if (!txid || txid.trim() === "") {
        throw new SicoobValidationError("TXID \xE9 obrigat\xF3rio");
      }
      sicoobLogger.debug("Cancelando cobran\xE7a PIX", { txid });
      const token = await this.authService.getAccessToken();
      await this.axiosInstance.delete(
        `/cob/${txid}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      sicoobLogger.info("Cobran\xE7a cancelada com sucesso", { txid });
    } catch (error) {
      if (axios2.isAxiosError(error) && error.response?.status === 404) {
        throw new SicoobNotFoundError(`Cobran\xE7a n\xE3o encontrada: ${txid}`);
      }
      this.handleError(error, "Erro ao cancelar cobran\xE7a");
      throw error;
    }
  }
  /**
   * Consultar QR Code de cobrança
   */
  async consultarQRCode(txid) {
    try {
      if (!txid || txid.trim() === "") {
        throw new SicoobValidationError("TXID \xE9 obrigat\xF3rio");
      }
      sicoobLogger.debug("Consultando QR Code", { txid });
      const token = await this.authService.getAccessToken();
      const response = await this.axiosInstance.get(
        `/qrcode/${txid}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      sicoobLogger.debug("QR Code obtido com sucesso", { txid });
      return response.data;
    } catch (error) {
      if (axios2.isAxiosError(error) && error.response?.status === 404) {
        throw new SicoobNotFoundError(
          `QR Code n\xE3o encontrado para TXID: ${txid}`
        );
      }
      this.handleError(error, "Erro ao consultar QR Code");
      throw error;
    }
  }
  /**
   * Validar dados de cobrança
   */
  validarDadosCobranca(dados) {
    if (!dados.chave || dados.chave.trim() === "") {
      throw new SicoobValidationError("Chave PIX \xE9 obrigat\xF3ria");
    }
    if (!dados.valor || !dados.valor.original) {
      throw new SicoobValidationError("Valor \xE9 obrigat\xF3rio");
    }
    const valorNum = parseFloat(dados.valor.original);
    if (isNaN(valorNum) || valorNum <= 0) {
      throw new SicoobValidationError("Valor deve ser maior que 0");
    }
  }
  /**
   * Tratar erros da API
   */
  handleError(error, defaultMessage) {
    if (axios2.isAxiosError(error)) {
      const status = error.response?.status;
      const data = error.response?.data;
      if (status === 400) {
        sicoobLogger.warn(defaultMessage, {
          error: data,
          status
        });
        throw new SicoobValidationError(defaultMessage, data);
      }
      if (status === 429) {
        sicoobLogger.warn("Rate limit atingido", {
          retryAfter: error.response?.headers["retry-after"]
        });
      }
      if (status && status >= 500) {
        sicoobLogger.error(defaultMessage, error, {
          status,
          data
        });
        throw new SicoobServerError(defaultMessage, status, data);
      }
    }
    sicoobLogger.error(defaultMessage, error);
  }
};

// src/services/sicoob/boleto.service.ts
import axios3 from "axios";
import pLimit from "p-limit";
import * as https3 from "https";
import * as http3 from "http";
var SicoobBoletoService = class {
  // Max 2 req/s for POST /boletos
  constructor(config, authService2) {
    this.limitPostBoleto = pLimit(2);
    this.config = config;
    this.authService = authService2;
    this.axiosInstance = this.setupHttpClient();
    sicoobLogger.info("SicoobBoletoService inicializado");
  }
  setupHttpClient() {
    const httpsAgent = this.setupMTLS();
    const boletoBaseUrl = process.env.SICOOB_BOLETO_BASE_URL || `${this.config.baseUrl}/cobranca-bancaria/v3`;
    return axios3.create({
      baseURL: boletoBaseUrl,
      httpAgent: new http3.Agent({ keepAlive: true }),
      httpsAgent,
      timeout: this.config.timeout || 3e4
    });
  }
  setupMTLS() {
    try {
      const certificates = buildCertificateConfig(this.config);
      return new https3.Agent({
        cert: certificates.cert,
        key: certificates.key,
        ca: certificates.ca ? [certificates.ca] : void 0,
        rejectUnauthorized: this.config.environment === "production"
      });
    } catch (error) {
      sicoobLogger.error("Erro ao configurar mTLS para Boleto", error);
      throw error;
    }
  }
  /**
   * Gerar boleto bancário
   */
  async gerarBoleto(dados) {
    try {
      this.validarDadosBoleto(dados);
      sicoobLogger.debug("Gerando boleto", {
        valor: dados.valor,
        dataVencimento: dados.data_vencimento
      });
      const token = await this.authService.getAccessToken();
      const response = await this.axiosInstance.post(
        "/boletos",
        dados,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );
      sicoobLogger.info("Boleto gerado com sucesso", {
        nossoNumero: response.data.nosso_numero,
        valor: response.data.valor
      });
      return response.data;
    } catch (error) {
      this.handleError(error, "Erro ao gerar boleto");
      throw error;
    }
  }
  /**
   * Criar boleto (API V3) usando payload estrito e limpeza de campos
   */
  async criarBoleto(dados) {
    this.validarCamposObrigatorios(dados);
    this.validarFormatos(dados);
    const payloadLimpo = this.cleanPayload(dados);
    const url = new URL("boletos", (this.axiosInstance.defaults.baseURL || "").replace(/\/$/, "/")).toString();
    sicoobLogger.debug("=== REQUISI\xC7\xC3O BOLETO SICOOB V3 ===", {
      url,
      method: "POST",
      headers: {
        Authorization: "Bearer [REDACTED]",
        "Content-Type": "application/json"
      },
      payload: JSON.stringify(payloadLimpo, null, 2),
      payloadSize: JSON.stringify(payloadLimpo).length,
      propriedades: Object.keys(payloadLimpo)
    });
    const token = await this.authService.getAccessToken();
    await this.verificarEscopos(token, ["boletos_inclusao"]);
    const doPost = (body) => this.axiosInstance.post(
      "/boletos",
      body,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        timeout: 3e4
      }
    );
    try {
      const response = await this.limitPostBoleto(() => doPost(payloadLimpo));
      sicoobLogger.info("Boleto criado com sucesso", {
        nossoNumero: response.data?.nosso_numero,
        linhaDigitavel: response.data?.numero_boleto
      });
      return response.data;
    } catch (error) {
      if (axios3.isAxiosError(error)) {
        sicoobLogger.error("=== ERRO BOLETO SICOOB V3 ===", error, {
          status: error.response?.status,
          statusText: error.response?.statusText,
          errorData: JSON.stringify(error.response?.data, null, 2),
          headers: error.response?.headers,
          requestPayload: JSON.stringify(payloadLimpo, null, 2)
        });
        if (error.response?.status === 406) {
          const raw = error.response?.data;
          const rawStr = typeof raw === "string" ? raw : JSON.stringify(raw);
          const indicaContrato = /numeroContrato/i.test(rawStr);
          const indicaModalidade = /modalidade/i.test(rawStr);
          if (indicaContrato || indicaModalidade) {
            const payloadCompat = { ...payloadLimpo };
            delete payloadCompat.numeroContrato;
            delete payloadCompat.modalidade;
            const compatLimpo = this.cleanPayload(payloadCompat);
            sicoobLogger.warn("Reenviando sem campos rejeitados (compat)", {
              removidos: {
                numeroContrato: indicaContrato,
                modalidade: indicaModalidade
              },
              payload: JSON.stringify(compatLimpo, null, 2)
            });
            try {
              const retryResp = await this.limitPostBoleto(() => doPost(compatLimpo));
              sicoobLogger.info("Boleto criado ap\xF3s compatibilidade", {
                nossoNumero: retryResp.data?.nosso_numero
              });
              return retryResp.data;
            } catch (e2) {
              sicoobLogger.error("Falha tamb\xE9m no modo compat", e2, {
                status: e2?.response?.status,
                data: e2?.response?.data
              });
            }
          }
          throw new SicoobValidationError(
            "Payload inv\xE1lido - verifique propriedades enviadas",
            error.response?.data
          );
        }
      }
      this.handleError(error, "Erro ao criar boleto");
      throw error;
    }
  }
  /**
   * Consultar boleto por nosso número
   */
  async consultarBoleto(nossoNumero) {
    try {
      if (!nossoNumero || nossoNumero.trim() === "") {
        throw new SicoobValidationError("Nosso n\xFAmero \xE9 obrigat\xF3rio");
      }
      sicoobLogger.debug("Consultando boleto", { nossoNumero });
      const token = await this.authService.getAccessToken();
      const response = await this.axiosInstance.get(
        `/boletos/${nossoNumero}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      sicoobLogger.debug("Boleto consultado com sucesso", {
        nossoNumero,
        status: response.data.status
      });
      return response.data;
    } catch (error) {
      if (axios3.isAxiosError(error) && error.response?.status === 404) {
        throw new SicoobNotFoundError(`Boleto n\xE3o encontrado: ${nossoNumero}`);
      }
      this.handleError(error, "Erro ao consultar boleto");
      throw error;
    }
  }
  /**
   * Cancelar boleto
   */
  async cancelarBoleto(nossoNumero) {
    try {
      if (!nossoNumero || nossoNumero.trim() === "") {
        throw new SicoobValidationError("Nosso n\xFAmero \xE9 obrigat\xF3rio");
      }
      sicoobLogger.debug("Cancelando boleto", { nossoNumero });
      const token = await this.authService.getAccessToken();
      await this.axiosInstance.delete(
        `/boletos/${nossoNumero}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      sicoobLogger.info("Boleto cancelado com sucesso", { nossoNumero });
    } catch (error) {
      if (axios3.isAxiosError(error) && error.response?.status === 404) {
        throw new SicoobNotFoundError(`Boleto n\xE3o encontrado: ${nossoNumero}`);
      }
      this.handleError(error, "Erro ao cancelar boleto");
      throw error;
    }
  }
  /**
   * Listar boletos com filtros
   */
  async listarBoletos(filtros) {
    try {
      sicoobLogger.debug("Listando boletos", filtros);
      const token = await this.authService.getAccessToken();
      const params = new URLSearchParams();
      if (filtros?.status)
        params.append("status", filtros.status);
      if (filtros?.data_inicio)
        params.append("data_inicio", filtros.data_inicio);
      if (filtros?.data_fim)
        params.append("data_fim", filtros.data_fim);
      if (filtros?.pagina)
        params.append("pagina", filtros.pagina.toString());
      if (filtros?.limite)
        params.append("limite", filtros.limite.toString());
      const response = await this.axiosInstance.get(
        "/boletos",
        {
          params: Object.fromEntries(params),
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      sicoobLogger.debug("Boletos listados", {
        total: response.data.paginacao.total_itens
      });
      return response.data;
    } catch (error) {
      this.handleError(error, "Erro ao listar boletos");
      throw error;
    }
  }
  /**
   * Baixar PDF do boleto
   */
  async baixarPDF(nossoNumero) {
    try {
      if (!nossoNumero || nossoNumero.trim() === "") {
        throw new SicoobValidationError("Nosso n\xFAmero \xE9 obrigat\xF3rio");
      }
      sicoobLogger.debug("Baixando PDF do boleto", { nossoNumero });
      const token = await this.authService.getAccessToken();
      const response = await this.axiosInstance.get(
        `/boletos/${nossoNumero}/pdf`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          },
          responseType: "arraybuffer"
        }
      );
      sicoobLogger.info("PDF do boleto baixado com sucesso", { nossoNumero });
      return Buffer.from(response.data);
    } catch (error) {
      if (axios3.isAxiosError(error) && error.response?.status === 404) {
        throw new SicoobNotFoundError(`Boleto n\xE3o encontrado: ${nossoNumero}`);
      }
      this.handleError(error, "Erro ao baixar PDF do boleto");
      throw error;
    }
  }
  /**
   * Validar dados do boleto
   */
  validarDadosBoleto(dados) {
    if (!dados.modalidade || ![1].includes(dados.modalidade)) {
      throw new SicoobValidationError("Modalidade inv\xE1lida (use 1 para Simples)");
    }
    if (!dados.numeroTituloCliente || dados.numeroTituloCliente.trim() === "") {
      throw new SicoobValidationError("N\xFAmero do t\xEDtulo do cliente (seu n\xFAmero) \xE9 obrigat\xF3rio");
    }
    if (!dados.pagador || !dados.pagador.nome) {
      throw new SicoobValidationError("Nome do pagador \xE9 obrigat\xF3rio");
    }
    if (!dados.pagador.numeroCpfCnpj) {
      throw new SicoobValidationError("CPF/CNPJ do pagador \xE9 obrigat\xF3rio");
    }
    if (!dados.pagador.tipoPessoa || ![1, 2].includes(dados.pagador.tipoPessoa)) {
      throw new SicoobValidationError("Tipo de pessoa do pagador inv\xE1lido (1 = F\xEDsica, 2 = Jur\xEDdica)");
    }
    if (!dados.valorTitulo || dados.valorTitulo <= 0) {
      throw new SicoobValidationError("Valor do t\xEDtulo deve ser maior que 0");
    }
    if (!dados.dataVencimento) {
      throw new SicoobValidationError("Data de vencimento \xE9 obrigat\xF3ria");
    }
    const dataVencimento = new Date(dados.dataVencimento);
    if (isNaN(dataVencimento.getTime())) {
      throw new SicoobValidationError("Data de vencimento inv\xE1lida");
    }
    const hoje = /* @__PURE__ */ new Date();
    hoje.setHours(0, 0, 0, 0);
    if (dataVencimento < hoje) {
      throw new SicoobValidationError(
        "Data de vencimento n\xE3o pode ser no passado"
      );
    }
  }
  // ---------------- V3 Helpers -----------------
  /**
   * Remove undefined, null, empty strings, and empties in arrays/objects
   */
  cleanPayload(obj) {
    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value === void 0 || value === null || typeof value === "string" && value.trim() === "") {
        continue;
      }
      if (Array.isArray(value)) {
        const cleanedArray = value.map((item) => typeof item === "object" && item !== null ? this.cleanPayload(item) : item).filter((item) => item !== null && item !== void 0);
        if (cleanedArray.length > 0)
          cleaned[key] = cleanedArray;
        continue;
      }
      if (typeof value === "object") {
        const cleanedObj = this.cleanPayload(value);
        if (Object.keys(cleanedObj).length > 0)
          cleaned[key] = cleanedObj;
        continue;
      }
      cleaned[key] = value;
    }
    return cleaned;
  }
  validarCamposObrigatorios(dados) {
    const camposObrigatorios = [
      "numeroContrato",
      "modalidade",
      "numeroContaCorrente",
      "especieDocumento",
      "dataEmissao",
      "dataVencimento",
      "valorNominal",
      "pagador"
    ];
    const faltando = [];
    for (const campo of camposObrigatorios) {
      if (!dados[campo])
        faltando.push(String(campo));
    }
    if (dados.pagador) {
      const camposPagador = [
        "numeroCpfCnpj",
        "nome",
        "endereco",
        "cidade",
        "cep",
        "uf"
      ];
      for (const c of camposPagador) {
        if (!dados.pagador[c])
          faltando.push(`pagador.${String(c)}`);
      }
    } else {
      faltando.push("pagador");
    }
    if (faltando.length > 0) {
      throw new SicoobValidationError(
        `Campos obrigat\xF3rios faltando: ${faltando.join(", ")}`
      );
    }
  }
  validarFormatos(dados) {
    const cpfCnpj = (dados.pagador.numeroCpfCnpj || "").replace(/\D/g, "");
    if (cpfCnpj.length !== 11 && cpfCnpj.length !== 14) {
      throw new SicoobValidationError("CPF/CNPJ inv\xE1lido");
    }
    const cep = (dados.pagador.cep || "").replace(/\D/g, "");
    if (cep.length !== 8) {
      throw new SicoobValidationError("CEP deve ter 8 d\xEDgitos");
    }
    if (!dados.pagador.uf || dados.pagador.uf.length !== 2) {
      throw new SicoobValidationError("UF deve ter 2 caracteres");
    }
    const regexData = /^\d{4}-\d{2}-\d{2}$/;
    if (!regexData.test(dados.dataEmissao)) {
      throw new SicoobValidationError("dataEmissao deve estar no formato YYYY-MM-DD");
    }
    if (!regexData.test(dados.dataVencimento)) {
      throw new SicoobValidationError("dataVencimento deve estar no formato YYYY-MM-DD");
    }
    if (dados.valorNominal <= 0) {
      throw new SicoobValidationError("valorNominal deve ser maior que zero");
    }
  }
  async verificarEscopos(token, necessarios) {
    try {
      const parts = token.split(".");
      if (parts.length < 2)
        return;
      const payloadJson = Buffer.from(parts[1], "base64").toString();
      const payload = JSON.parse(payloadJson);
      const presentes = Array.isArray(payload.scp) ? payload.scp : typeof payload.scope === "string" ? String(payload.scope).split(/[\s]+/) : [];
      const faltando = necessarios.filter((s) => !presentes.includes(s));
      if (faltando.length > 0) {
        throw new SicoobValidationError(
          `Escopos faltando no token: ${faltando.join(", ")}`
        );
      }
      sicoobLogger.info("Escopos validados", { escopos: presentes });
    } catch (e) {
      sicoobLogger.warn("N\xE3o foi poss\xEDvel validar escopos do token (seguindo)", {
        detalhe: e.message
      });
    }
  }
  /**
   * Tratar erros da API
   */
  handleError(error, defaultMessage) {
    if (axios3.isAxiosError(error)) {
      const status = error.response?.status;
      const data = error.response?.data;
      if (status === 400) {
        sicoobLogger.warn(defaultMessage, {
          error: data,
          status
        });
        throw new SicoobValidationError(defaultMessage, data);
      }
      if (status && status >= 500) {
        sicoobLogger.error(defaultMessage, error, {
          status,
          data
        });
        throw new SicoobServerError(defaultMessage, status, data);
      }
    }
    sicoobLogger.error(defaultMessage, error);
  }
};

// src/services/sicoob/cobranca.service.ts
var SicoobCobrancaService = class {
  constructor(pixService2, boletoService2) {
    this.pixService = pixService2;
    this.boletoService = boletoService2;
    sicoobLogger.info("SicoobCobrancaService inicializado");
  }
  /**
   * Criar cobrança genérica (delegando para PIX ou Boleto).
   */
  async criarCobranca(dados) {
    try {
      this.validarDadosCobranca(dados);
      sicoobLogger.debug("Criando cobran\xE7a", { tipo: dados.tipo });
      if (dados.tipo === "PIX") {
        return this.criarCobrancaPix(dados);
      }
      return this.criarCobrancaBoleto(dados);
    } catch (error) {
      sicoobLogger.error("Erro ao criar cobran\xE7a", error, {
        tipo: dados.tipo
      });
      throw error;
    }
  }
  /**
   * Consultar cobrança por identificador.
   */
  async consultarCobranca(id, tipo) {
    try {
      sicoobLogger.debug("Consultando cobran\xE7a", { id, tipo });
      if (tipo === "PIX") {
        return this.pixService.consultarCobranca(id);
      }
      if (tipo === "BOLETO") {
        return this.boletoService.consultarBoleto(id);
      }
      throw new SicoobValidationError(`Tipo de cobran\xE7a inv\xE1lido: ${tipo}`);
    } catch (error) {
      sicoobLogger.error("Erro ao consultar cobran\xE7a", error, {
        id,
        tipo
      });
      throw error;
    }
  }
  /**
   * Cancelar cobrança.
   */
  async cancelarCobranca(id, tipo) {
    try {
      sicoobLogger.debug("Cancelando cobran\xE7a", { id, tipo });
      if (tipo === "PIX") {
        await this.pixService.cancelarCobranca(id);
        return;
      }
      if (tipo === "BOLETO") {
        await this.boletoService.cancelarBoleto(id);
        return;
      }
      throw new SicoobValidationError(`Tipo de cobran\xE7a inv\xE1lido: ${tipo}`);
    } catch (error) {
      sicoobLogger.error("Erro ao cancelar cobran\xE7a", error, {
        id,
        tipo
      });
      throw error;
    }
  }
  /**
   * Atualizar cobrança. Implementado como cancelamento seguido de nova criação.
   */
  async atualizarCobranca(id, tipo, dados) {
    try {
      sicoobLogger.debug("Atualizando cobran\xE7a", { id, tipo });
      if (tipo === "PIX") {
        if (!dados.pix) {
          throw new SicoobValidationError(
            "Dados PIX s\xE3o obrigat\xF3rios para atualiza\xE7\xE3o"
          );
        }
        await this.cancelarCobranca(id, tipo);
        return this.criarCobranca({
          tipo: "PIX",
          descricao: dados.descricao,
          pix: dados.pix,
          metadados: dados.metadados
        });
      }
      if (tipo === "BOLETO") {
        if (!dados.boleto) {
          throw new SicoobValidationError(
            "Dados de boleto s\xE3o obrigat\xF3rios para atualiza\xE7\xE3o"
          );
        }
        await this.cancelarCobranca(id, tipo);
        return this.criarCobranca({
          tipo: "BOLETO",
          descricao: dados.descricao,
          boleto: dados.boleto,
          metadados: dados.metadados
        });
      }
      throw new SicoobValidationError(`Tipo de cobran\xE7a inv\xE1lido: ${tipo}`);
    } catch (error) {
      sicoobLogger.error("Erro ao atualizar cobran\xE7a", error, {
        id,
        tipo
      });
      throw error;
    }
  }
  /**
   * Listar cobranças com paginação.
   */
  async listarCobrancas(tipo, pagina = 1) {
    try {
      sicoobLogger.debug("Listando cobran\xE7as", { tipo, pagina });
      if (tipo === "PIX") {
        return this.pixService.listarCobrancas({
          pagina,
          limite: 20
        });
      }
      if (tipo === "BOLETO") {
        return this.boletoService.listarBoletos({
          pagina,
          limite: 20
        });
      }
      throw new SicoobValidationError(`Tipo de cobran\xE7a inv\xE1lido: ${tipo}`);
    } catch (error) {
      sicoobLogger.error("Erro ao listar cobran\xE7as", error, { tipo });
      throw error;
    }
  }
  getPixService() {
    return this.pixService;
  }
  getBoletoService() {
    return this.boletoService;
  }
  validarDadosCobranca(dados) {
    if (dados.tipo !== "PIX" && dados.tipo !== "BOLETO") {
      throw new SicoobValidationError(
        "Tipo de cobran\xE7a deve ser PIX ou BOLETO"
      );
    }
    if (dados.tipo === "PIX") {
      if (!dados.pix) {
        throw new SicoobValidationError("Payload PIX \xE9 obrigat\xF3rio");
      }
      if (!dados.pix.modalidade) {
        throw new SicoobValidationError("Modalidade do PIX \xE9 obrigat\xF3ria");
      }
      if (dados.pix.modalidade === "IMEDIATA" && !dados.pix.imediata) {
        throw new SicoobValidationError(
          "Dados para cobran\xE7a PIX imediata s\xE3o obrigat\xF3rios"
        );
      }
      if (dados.pix.modalidade === "COM_VENCIMENTO" && !dados.pix.comVencimento) {
        throw new SicoobValidationError(
          "Dados para cobran\xE7a PIX com vencimento s\xE3o obrigat\xF3rios"
        );
      }
      return;
    }
    if (dados.tipo === "BOLETO") {
      if (!dados.boleto || !dados.boleto.dados) {
        throw new SicoobValidationError("Dados de boleto s\xE3o obrigat\xF3rios");
      }
    }
  }
  criarCobrancaPix(dados) {
    if (!dados.pix) {
      throw new SicoobValidationError("Payload PIX \xE9 obrigat\xF3rio");
    }
    if (dados.pix.modalidade === "IMEDIATA") {
      return this.pixService.criarCobrancaImediata(
        dados.pix.imediata
      );
    }
    if (dados.pix.modalidade === "COM_VENCIMENTO") {
      return this.pixService.criarCobrancaComVencimento(
        dados.pix.comVencimento
      );
    }
    throw new SicoobValidationError(
      `Modalidade PIX inv\xE1lida: ${dados.pix.modalidade}`
    );
  }
  criarCobrancaBoleto(dados) {
    if (!dados.boleto) {
      throw new SicoobValidationError("Dados de boleto s\xE3o obrigat\xF3rios");
    }
    return this.boletoService.gerarBoleto(dados.boleto.dados);
  }
};

// src/services/sicoob/webhook.service.ts
import * as crypto from "crypto";
var SicoobWebhookService = class {
  constructor(webhookSecret) {
    this.handlers = /* @__PURE__ */ new Map();
    this.eventQueue = [];
    this.isProcessing = false;
    this.webhookSecret = webhookSecret;
    sicoobLogger.info("SicoobWebhookService inicializado");
  }
  /**
   * Validar assinatura HMAC do webhook
   */
  validateSignature(payload, signature) {
    try {
      const expectedSignature = crypto.createHmac("sha256", this.webhookSecret).update(payload).digest("hex");
      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
      if (isValid) {
        sicoobLogger.debug("Assinatura do webhook validada com sucesso");
      } else {
        sicoobLogger.warn("Assinatura do webhook inv\xE1lida");
      }
      return isValid;
    } catch (error) {
      sicoobLogger.error("Erro ao validar assinatura do webhook", error);
      return false;
    }
  }
  /**
   * Verificar timestamp para evitar replay attacks
   */
  validateTimestamp(timestamp, toleranceSeconds = 300) {
    try {
      const eventTime = new Date(timestamp).getTime();
      const currentTime = Date.now();
      const timeDiff = Math.abs(currentTime - eventTime) / 1e3;
      if (timeDiff > toleranceSeconds) {
        sicoobLogger.warn("Timestamp fora da toler\xE2ncia", {
          timeDiff,
          tolerance: toleranceSeconds
        });
        return false;
      }
      sicoobLogger.debug("Timestamp validado com sucesso", { timeDiff });
      return true;
    } catch (error) {
      sicoobLogger.error("Erro ao validar timestamp", error);
      return false;
    }
  }
  /**
   * Processar webhook recebido
   */
  async processWebhook(payload, signature) {
    try {
      sicoobLogger.debug("Processando webhook", {
        eventoId: payload.evento_id,
        tipo: payload.tipo_evento
      });
      if (signature) {
        const isValid = this.validateSignature(
          JSON.stringify(payload),
          signature
        );
        if (!isValid) {
          throw new Error("Assinatura do webhook inv\xE1lida");
        }
      }
      if (!this.validateTimestamp(payload.timestamp)) {
        throw new Error("Timestamp do webhook fora da toler\xE2ncia");
      }
      const event = {
        id: payload.evento_id,
        timestamp: payload.timestamp,
        tipo: payload.tipo_evento,
        dados: payload.dados
      };
      this.eventQueue.push(event);
      await this.processQueue();
      sicoobLogger.info("Webhook processado com sucesso", {
        eventoId: event.id,
        tipo: event.tipo
      });
    } catch (error) {
      sicoobLogger.error("Erro ao processar webhook", error, payload);
      throw error;
    }
  }
  /**
   * Registrar handler para tipo de evento
   */
  on(eventType, handler) {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType).push(handler);
    sicoobLogger.debug("Handler registrado para evento", { eventType });
  }
  /**
   * Remover handler
   */
  off(eventType, handler) {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }
  /**
   * Processar fila de eventos
   */
  async processQueue() {
    if (this.isProcessing || this.eventQueue.length === 0) {
      return;
    }
    this.isProcessing = true;
    try {
      while (this.eventQueue.length > 0) {
        const event = this.eventQueue.shift();
        if (!event)
          break;
        await this.executeHandlers(event);
      }
    } finally {
      this.isProcessing = false;
    }
  }
  /**
   * Executar handlers para evento
   */
  async executeHandlers(event) {
    const handlers = this.handlers.get(event.tipo) || [];
    sicoobLogger.debug("Executando handlers", {
      tipo: event.tipo,
      quantidade: handlers.length
    });
    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (error) {
        sicoobLogger.error("Erro ao executar handler de webhook", error, {
          eventoId: event.id,
          tipo: event.tipo
        });
        await this.retryHandler(handler, event);
      }
    }
  }
  /**
   * Retry automático com backoff exponencial
   */
  async retryHandler(handler, event, maxRetries = 3, delayMs = 1e3) {
    for (let i = 1; i <= maxRetries; i++) {
      try {
        sicoobLogger.debug(`Retry do handler (tentativa ${i}/${maxRetries})`, {
          eventoId: event.id
        });
        await new Promise((resolve) => setTimeout(resolve, delayMs * i));
        await handler(event);
        return;
      } catch (error) {
        sicoobLogger.warn(`Retry falhou (tentativa ${i}/${maxRetries})`, {
          error: error.message,
          eventoId: event.id
        });
        if (i === maxRetries) {
          sicoobLogger.error("M\xE1ximo de retries atingido para handler", error, {
            eventoId: event.id,
            tipo: event.tipo
          });
        }
      }
    }
  }
  /**
   * Handlers padrão de eventos
   */
  setupDefaultHandlers() {
    this.on("pix.received", async (event) => {
      sicoobLogger.info("PIX recebido", {
        txid: event.dados.txid,
        valor: event.dados.valor
      });
      await this.persistirEvento(event, "pix_received");
      await this.atualizarStatusCobranca(event.dados.txid, "PAGO", {
        valor_pago: event.dados.valor,
        data_pagamento: event.timestamp
      });
      await this.acionarNotificacao(event.dados.txid, "pagamento_recebido", event.dados);
    });
    this.on("pix.returned", async (event) => {
      sicoobLogger.info("PIX devolvido", {
        txid: event.dados.txid,
        motivo: event.dados.motivo
      });
      await this.persistirEvento(event, "pix_returned");
      await this.atualizarStatusCobranca(event.dados.txid, "DEVOLVIDO", {
        motivo_devolucao: event.dados.motivo,
        data_devolucao: event.timestamp
      });
      await this.acionarNotificacao(event.dados.txid, "pagamento_devolvido", event.dados);
    });
    this.on("boleto.paid", async (event) => {
      sicoobLogger.info("Boleto pago", {
        nossoNumero: event.dados.nosso_numero,
        valor: event.dados.valor
      });
      await this.persistirEvento(event, "boleto_paid");
      await this.atualizarStatusCobranca(event.dados.nosso_numero, "PAGO", {
        valor_pago: event.dados.valor,
        data_pagamento: event.timestamp
      });
      await this.acionarNotificacao(event.dados.nosso_numero, "boleto_pago", event.dados);
    });
    this.on("boleto.expired", async (event) => {
      sicoobLogger.warn("Boleto vencido", {
        nossoNumero: event.dados.nosso_numero
      });
      await this.persistirEvento(event, "boleto_expired");
      await this.atualizarStatusCobranca(event.dados.nosso_numero, "VENCIDO", {
        data_vencimento: event.timestamp
      });
      await this.acionarNotificacao(event.dados.nosso_numero, "boleto_vencido", event.dados);
    });
    this.on("cobranca.paid", async (event) => {
      sicoobLogger.info("Cobran\xE7a paga", {
        id: event.dados.id,
        valor: event.dados.valor
      });
      await this.persistirEvento(event, "cobranca_paid");
      await this.atualizarStatusCobranca(event.dados.id, "PAGO", {
        valor_pago: event.dados.valor,
        data_pagamento: event.timestamp
      });
      await this.acionarNotificacao(event.dados.id, "cobranca_paga", event.dados);
    });
    this.on("cobranca.cancelled", async (event) => {
      sicoobLogger.info("Cobran\xE7a cancelada", {
        id: event.dados.id
      });
      await this.persistirEvento(event, "cobranca_cancelled");
      await this.atualizarStatusCobranca(event.dados.id, "CANCELADO", {
        data_cancelamento: event.timestamp,
        motivo: event.dados.motivo
      });
      await this.acionarNotificacao(event.dados.id, "cobranca_cancelada", event.dados);
    });
    sicoobLogger.info("Handlers padr\xE3o de webhooks registrados");
  }
  /**
   * Obter fila de eventos
   */
  getEventQueue() {
    return [...this.eventQueue];
  }
  /**
   * Limpar fila de eventos
   */
  clearEventQueue() {
    this.eventQueue = [];
    sicoobLogger.debug("Fila de eventos limpa");
  }
  /**
   * Persistir evento no Supabase
   */
  async persistirEvento(event, tipo) {
    try {
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!supabaseUrl || !supabaseKey) {
        sicoobLogger.warn("Supabase n\xE3o configurado, pulando persist\xEAncia de evento");
        return;
      }
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { error } = await supabase.from("sicoob_webhook_events").insert({
        evento_id: event.id,
        tipo_evento: tipo,
        timestamp: event.timestamp,
        dados: event.dados,
        processado_em: (/* @__PURE__ */ new Date()).toISOString()
      });
      if (error) {
        sicoobLogger.error("Erro ao persistir evento no Supabase", error);
      } else {
        sicoobLogger.debug("Evento persistido no Supabase", { eventoId: event.id });
      }
    } catch (error) {
      sicoobLogger.error("Erro ao conectar com Supabase para persistir evento", error);
    }
  }
  /**
   * Atualizar status da cobrança no Supabase
   */
  async atualizarStatusCobranca(identificador, novoStatus, dadosAdicionais) {
    try {
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!supabaseUrl || !supabaseKey) {
        sicoobLogger.warn("Supabase n\xE3o configurado, pulando atualiza\xE7\xE3o de status");
        return;
      }
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { error } = await supabase.from("sicoob_cobrancas").update({
        status: novoStatus,
        historico: dadosAdicionais,
        atualizado_em: (/* @__PURE__ */ new Date()).toISOString()
      }).eq("identificador", identificador);
      if (error) {
        sicoobLogger.error("Erro ao atualizar status da cobran\xE7a", error);
      } else {
        sicoobLogger.debug("Status da cobran\xE7a atualizado", { identificador, novoStatus });
      }
    } catch (error) {
      sicoobLogger.error("Erro ao atualizar status da cobran\xE7a", error);
    }
  }
  /**
   * Acionar fila de notificação
   */
  async acionarNotificacao(identificador, tipoNotificacao, dados) {
    try {
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!supabaseUrl || !supabaseKey) {
        sicoobLogger.warn("Supabase n\xE3o configurado, pulando notifica\xE7\xE3o");
        return;
      }
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { error } = await supabase.from("sicoob_notificacoes").insert({
        identificador_cobranca: identificador,
        tipo_notificacao: tipoNotificacao,
        dados_notificacao: dados,
        status: "PENDENTE",
        criado_em: (/* @__PURE__ */ new Date()).toISOString()
      });
      if (error) {
        sicoobLogger.error("Erro ao acionar notifica\xE7\xE3o", error);
      } else {
        sicoobLogger.debug("Notifica\xE7\xE3o acionada", { identificador, tipoNotificacao });
      }
    } catch (error) {
      sicoobLogger.error("Erro ao acionar notifica\xE7\xE3o", error);
    }
  }
};

// src/services/sicoob/index.ts
var authService = null;
var pixService = null;
var boletoService = null;
var cobrancaService = null;
var webhookService = null;
function initializeSicoobServices(config) {
  authService = new SicoobAuthService(config);
  pixService = new SicoobPixService(config, authService);
  boletoService = new SicoobBoletoService(config, authService);
  cobrancaService = new SicoobCobrancaService(pixService, boletoService);
  if (config.webhookSecret) {
    webhookService = new SicoobWebhookService(config.webhookSecret);
    webhookService.setupDefaultHandlers();
  }
  return {
    authService,
    pixService,
    boletoService,
    cobrancaService,
    webhookService
  };
}
function getAuthService() {
  if (!authService) {
    throw new Error(
      "Sicoob services not initialized. Call initializeSicoobServices() first."
    );
  }
  return authService;
}
function getPixService() {
  if (!pixService) {
    throw new Error(
      "Sicoob services not initialized. Call initializeSicoobServices() first."
    );
  }
  return pixService;
}
function getBoletoService() {
  if (!boletoService) {
    throw new Error(
      "Sicoob services not initialized. Call initializeSicoobServices() first."
    );
  }
  return boletoService;
}
function getCobrancaService2() {
  if (!cobrancaService) {
    throw new Error(
      "Sicoob services not initialized. Call initializeSicoobServices() first."
    );
  }
  return cobrancaService;
}
function getWebhookService() {
  if (!webhookService) {
    throw new Error(
      "Sicoob webhook service not initialized. Ensure webhookSecret is configured."
    );
  }
  return webhookService;
}

// src/routes/sicoob.routes.ts
var import_express = __toESM(require_express(), 1);

// src/controllers/sicoob.controller.ts
var SicoobController = class _SicoobController {
  /**
   * PIX - Criar cobrança imediata
   */
  static async criarCobrancaPixImediata(req, res) {
    try {
      const dados = req.body;
      const pixService2 = getPixService();
      const resultado = await pixService2.criarCobrancaImediata(dados);
      try {
        const cobrancaDbService = getCobrancaService();
        await cobrancaDbService.criarCobranca({
          user_id: req.user?.id,
          // Se houver autenticação
          identificador: resultado.txid,
          tipo: "PIX_IMEDIATA",
          status: "PENDENTE",
          pagador_nome: resultado.pagador?.nome,
          pagador_cpf_cnpj: resultado.pagador?.cpf || resultado.pagador?.cnpj,
          valor_original: dados.valor,
          qrcode_url: resultado.qr_code,
          qrcode_base64: resultado.qr_code,
          metadados: { dados_originais: dados }
        });
      } catch (dbError) {
        sicoobLogger.error("Erro ao salvar cobran\xE7a no banco", dbError);
      }
      res.status(201).json({
        sucesso: true,
        dados: resultado
      });
    } catch (error) {
      _SicoobController.handleError(res, error);
    }
  }
  /**
   * PIX - Criar cobrança com vencimento
   */
  static async criarCobrancaPixVencimento(req, res) {
    try {
      const dados = req.body;
      const pixService2 = getPixService();
      const resultado = await pixService2.criarCobrancaComVencimento(dados);
      try {
        const cobrancaDbService = getCobrancaService();
        await cobrancaDbService.criarCobranca({
          user_id: req.user?.id,
          identificador: resultado.txid,
          tipo: "PIX_VENCIMENTO",
          status: "PENDENTE",
          pagador_nome: resultado.pagador?.nome,
          pagador_cpf_cnpj: resultado.pagador?.cpf || resultado.pagador?.cnpj,
          valor_original: dados.valor,
          data_vencimento: dados.data_vencimento,
          qrcode_url: resultado.qr_code,
          qrcode_base64: resultado.qr_code,
          metadados: { dados_originais: dados }
        });
      } catch (dbError) {
        sicoobLogger.error("Erro ao salvar cobran\xE7a no banco", dbError);
      }
      res.status(201).json({
        sucesso: true,
        dados: resultado
      });
    } catch (error) {
      _SicoobController.handleError(res, error);
    }
  }
  /**
   * PIX - Consultar cobrança
   */
  static async consultarCobrancaPix(req, res) {
    try {
      const { txid } = req.params;
      const pixService2 = getPixService();
      const resultado = await pixService2.consultarCobranca(txid);
      res.status(200).json({
        sucesso: true,
        dados: resultado
      });
    } catch (error) {
      _SicoobController.handleError(res, error);
    }
  }
  /**
   * PIX - Listar cobranças
   */
  static async listarCobrancasPix(req, res) {
    try {
      const { status, data_inicio, data_fim, pagina, limite } = req.query;
      const pixService2 = getPixService();
      const filtros = {
        status,
        data_inicio,
        data_fim,
        pagina: pagina ? parseInt(pagina) : 1,
        limite: limite ? parseInt(limite) : 20
      };
      const resultado = await pixService2.listarCobrancas(filtros);
      res.status(200).json({
        sucesso: true,
        dados: resultado
      });
    } catch (error) {
      _SicoobController.handleError(res, error);
    }
  }
  /**
   * PIX - Cancelar cobrança
   */
  static async cancelarCobrancaPix(req, res) {
    try {
      const { txid } = req.params;
      const pixService2 = getPixService();
      await pixService2.cancelarCobranca(txid);
      res.status(204).send();
    } catch (error) {
      _SicoobController.handleError(res, error);
    }
  }
  /**
   * PIX - Consultar QR Code
   */
  static async consultarQRCode(req, res) {
    try {
      const { txid } = req.params;
      const pixService2 = getPixService();
      const resultado = await pixService2.consultarQRCode(txid);
      res.status(200).json({
        sucesso: true,
        dados: resultado
      });
    } catch (error) {
      _SicoobController.handleError(res, error);
    }
  }
  /**
   * Boleto - Gerar boleto
   */
  static async gerarBoleto(req, res) {
    try {
      const dados = req.body;
      const boletoService2 = getBoletoService();
      const resultado = await boletoService2.gerarBoleto(dados);
      try {
        const cobrancaDbService = getCobrancaService();
        await cobrancaDbService.criarCobranca({
          user_id: req.user?.id,
          identificador: resultado.nosso_numero,
          tipo: "BOLETO",
          status: "PENDENTE",
          pagador_nome: resultado.pagador?.nome,
          pagador_cpf_cnpj: resultado.pagador?.cpf_cnpj,
          valor_original: resultado.valor,
          data_vencimento: resultado.data_vencimento,
          linha_digitavel: resultado.numero_boleto,
          pdf_url: void 0,
          metadados: { dados_originais: dados }
        });
      } catch (dbError) {
        sicoobLogger.error("Erro ao salvar boleto no banco", dbError);
      }
      res.status(201).json({
        sucesso: true,
        dados: resultado
      });
    } catch (error) {
      _SicoobController.handleError(res, error);
    }
  }
  /**
   * Boleto - Consultar boleto
   */
  static async consultarBoleto(req, res) {
    try {
      const { nossoNumero } = req.params;
      const boletoService2 = getBoletoService();
      const resultado = await boletoService2.consultarBoleto(nossoNumero);
      res.status(200).json({
        sucesso: true,
        dados: resultado
      });
    } catch (error) {
      _SicoobController.handleError(res, error);
    }
  }
  /**
   * Boleto - Listar boletos
   */
  static async listarBoletos(req, res) {
    try {
      const { status, data_inicio, data_fim, pagina, limite } = req.query;
      const boletoService2 = getBoletoService();
      const filtros = {
        status,
        data_inicio,
        data_fim,
        pagina: pagina ? parseInt(pagina) : 1,
        limite: limite ? parseInt(limite) : 20
      };
      const resultado = await boletoService2.listarBoletos(filtros);
      res.status(200).json({
        sucesso: true,
        dados: resultado
      });
    } catch (error) {
      _SicoobController.handleError(res, error);
    }
  }
  /**
   * Boleto - Cancelar boleto
   */
  static async cancelarBoleto(req, res) {
    try {
      const { nossoNumero } = req.params;
      const boletoService2 = getBoletoService();
      await boletoService2.cancelarBoleto(nossoNumero);
      res.status(204).send();
    } catch (error) {
      _SicoobController.handleError(res, error);
    }
  }
  /**
   * Boleto - Baixar PDF
   */
  static async baixarPDFBoleto(req, res) {
    try {
      const { nossoNumero } = req.params;
      const boletoService2 = getBoletoService();
      const buffer = await boletoService2.baixarPDF(nossoNumero);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="boleto-${nossoNumero}.pdf"`
      );
      res.send(buffer);
    } catch (error) {
      _SicoobController.handleError(res, error);
    }
  }
  /**
   * Cobrança - Criar cobrança genérica
   */
  static async criarCobranca(req, res) {
    try {
      const dados = req.body;
      const cobrancaService2 = getCobrancaService2();
      const resultado = await cobrancaService2.criarCobranca(dados);
      res.status(201).json({
        sucesso: true,
        dados: resultado
      });
    } catch (error) {
      _SicoobController.handleError(res, error);
    }
  }
  /**
   * Cobrança - Consultar cobrança
   */
  static async consultarCobranca(req, res) {
    try {
      const { id } = req.params;
      const { tipo } = req.query;
      const cobrancaService2 = getCobrancaService2();
      const resultado = await cobrancaService2.consultarCobranca(
        id,
        tipo || "PIX"
      );
      res.status(200).json({
        sucesso: true,
        dados: resultado
      });
    } catch (error) {
      _SicoobController.handleError(res, error);
    }
  }
  /**
   * Cobrança - Atualizar cobrança
   */
  static async atualizarCobranca(req, res) {
    try {
      const { id } = req.params;
      const { tipo } = req.query;
      const dados = req.body;
      const cobrancaService2 = getCobrancaService2();
      const resultado = await cobrancaService2.atualizarCobranca(
        id,
        tipo || "PIX",
        dados
      );
      res.status(200).json({
        sucesso: true,
        dados: resultado
      });
    } catch (error) {
      _SicoobController.handleError(res, error);
    }
  }
  /**
   * Cobrança - Cancelar cobrança
   */
  static async cancelarCobranca(req, res) {
    try {
      const { id } = req.params;
      const { tipo } = req.query;
      const cobrancaService2 = getCobrancaService2();
      await cobrancaService2.cancelarCobranca(id, tipo || "PIX");
      res.status(204).send();
    } catch (error) {
      _SicoobController.handleError(res, error);
    }
  }
  /**
   * Cobrança - Listar cobranças
   */
  static async listarCobrancas(req, res) {
    try {
      const { tipo, pagina } = req.query;
      const cobrancaService2 = getCobrancaService2();
      const resultado = await cobrancaService2.listarCobrancas(
        tipo || "PIX",
        pagina ? parseInt(pagina) : 1
      );
      res.status(200).json({
        sucesso: true,
        dados: resultado
      });
    } catch (error) {
      _SicoobController.handleError(res, error);
    }
  }
  /**
   * Webhook - Receber webhook
   */
  static async receberWebhook(req, res) {
    try {
      const webhookService2 = getWebhookService();
      const payload = req.body;
      const signature = req.sicoobSignature;
      await webhookService2.processWebhook(payload, signature);
      res.status(200).json({
        sucesso: true,
        mensagem: "Webhook processado"
      });
    } catch (error) {
      sicoobLogger.error("Erro ao processar webhook", error);
      res.status(500).json({
        sucesso: false,
        erro: "Erro ao processar webhook"
      });
    }
  }
  /**
   * Health Check
   */
  static async healthCheck(req, res) {
    try {
      const authService2 = getAuthService();
      const isHealthy = await authService2.validateToken(
        await authService2.getAccessToken()
      );
      res.status(isHealthy ? 200 : 503).json({
        status: isHealthy ? "ok" : "degraded",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (error) {
      sicoobLogger.error("Health check falhou", error);
      res.status(503).json({
        status: "down",
        erro: error.message
      });
    }
  }
  /**
   * Tratador de erros centralizado
   */
  static handleError(res, error) {
    if (error instanceof SicoobError) {
      res.status(error.statusCode).json({
        sucesso: false,
        erro: error.message,
        codigo: error.code,
        detalhes: error.details
      });
    } else {
      sicoobLogger.error("Erro n\xE3o tratado", error);
      res.status(500).json({
        sucesso: false,
        erro: "Erro interno do servidor"
      });
    }
  }
};

// src/middleware/sicoob-webhook.middleware.ts
function sicoobWebhookMiddleware(webhookSecret) {
  return (req, res, next) => {
    try {
      let payload;
      if (typeof req.body === "string") {
        payload = req.body;
      } else {
        payload = JSON.stringify(req.body);
      }
      const signature = req.headers["x-sicoob-signature"];
      const timestamp = req.headers["x-sicoob-timestamp"];
      if (!signature) {
        sicoobLogger.warn("Webhook recebido sem assinatura");
        res.status(401).json({ error: "Assinatura n\xE3o fornecida" });
        return;
      }
      if (!timestamp) {
        sicoobLogger.warn("Webhook recebido sem timestamp");
        res.status(401).json({ error: "Timestamp n\xE3o fornecido" });
        return;
      }
      const eventTime = new Date(timestamp).getTime();
      const currentTime = Date.now();
      const timeDiffSeconds = Math.abs(currentTime - eventTime) / 1e3;
      const toleranceSeconds = 300;
      if (timeDiffSeconds > toleranceSeconds) {
        sicoobLogger.warn("Webhook com timestamp fora da toler\xE2ncia", {
          timeDiff: timeDiffSeconds,
          tolerance: toleranceSeconds
        });
        res.status(401).json({ error: "Timestamp fora da toler\xE2ncia" });
        return;
      }
      const crypto2 = __require("crypto");
      const expectedSignature = crypto2.createHmac("sha256", webhookSecret).update(payload).digest("hex");
      let isValid = false;
      try {
        isValid = crypto2.timingSafeEqual(
          Buffer.from(signature),
          Buffer.from(expectedSignature)
        );
      } catch (error) {
        isValid = false;
      }
      if (!isValid) {
        sicoobLogger.warn("Webhook com assinatura inv\xE1lida");
        res.status(401).json({ error: "Assinatura inv\xE1lida" });
        return;
      }
      req.sicoobPayload = payload;
      req.sicoobSignature = signature;
      sicoobLogger.debug("Webhook validado com sucesso");
      next();
    } catch (error) {
      sicoobLogger.error("Erro ao validar webhook", error);
      res.status(500).json({ error: "Erro ao validar webhook" });
    }
  };
}
function sicoobWebhookBodyParser() {
  const bodyParser = require_body_parser();
  return bodyParser.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString("utf8");
    }
  });
}

// src/middleware/sicoob-auth.middleware.ts
import { createHmac as createHmac2, timingSafeEqual as cryptoTimingSafeEqual } from "crypto";
function createSicoobJwtMiddleware(options) {
  const secret = process.env.SICOOB_JWT_SECRET?.trim();
  if (!secret) {
    sicoobLogger.debug("SICOOB_JWT_SECRET n\xE3o configurado; middleware JWT ser\xE1 ignorado");
  }
  const headerName = options?.headerName ?? "authorization";
  return (req, res, next) => {
    if (!secret) {
      next();
      return;
    }
    try {
      const header = req.headers[headerName];
      if (!header || Array.isArray(header) && header.length === 0) {
        res.status(401).json({ error: "Token JWT ausente" });
        return;
      }
      const rawToken = Array.isArray(header) ? header[0] : header;
      const token = rawToken.startsWith("Bearer ") ? rawToken.slice(7).trim() : rawToken.trim();
      if (!token) {
        res.status(401).json({ error: "Token JWT inv\xE1lido" });
        return;
      }
      const payload = verifyJwt(token, secret, {
        issuer: options?.issuer,
        audience: options?.audience
      });
      req.authContext = payload;
      next();
    } catch (error) {
      sicoobLogger.warn("Token JWT inv\xE1lido", {
        reason: error.message,
        path: req.path
      });
      res.status(401).json({ error: "Token JWT inv\xE1lido" });
    }
  };
}
function verifyJwt(token, secret, {
  issuer,
  audience
} = {}) {
  const segments = token.split(".");
  if (segments.length !== 3) {
    throw new Error("Formato JWT inv\xE1lido");
  }
  const [encodedHeader, encodedPayload, signature] = segments;
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = createHmac2("sha256", secret).update(signingInput).digest("base64url");
  if (!timingSafeEqual2(signature, expectedSignature)) {
    throw new Error("Assinatura inv\xE1lida");
  }
  const header = decodeSegment(encodedHeader);
  if (header.alg !== "HS256") {
    throw new Error(`Algoritmo n\xE3o suportado: ${header.alg}`);
  }
  const payload = decodeSegment(encodedPayload);
  const now = Math.floor(Date.now() / 1e3);
  if (payload.exp && now >= payload.exp) {
    throw new Error("Token expirado");
  }
  if (payload.nbf && now < payload.nbf) {
    throw new Error("Token ainda n\xE3o \xE9 v\xE1lido");
  }
  if (issuer && payload.iss !== issuer) {
    throw new Error("Issuer inv\xE1lido");
  }
  if (audience) {
    const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!aud.includes(audience)) {
      throw new Error("Audience inv\xE1lida");
    }
  }
  return payload;
}
function decodeSegment(segment) {
  const decoded = Buffer.from(segment, "base64url").toString("utf8");
  return JSON.parse(decoded);
}
function timingSafeEqual2(a, b) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) {
    return false;
  }
  return cryptoTimingSafeEqual(aBuffer, bBuffer);
}

// src/middleware/sicoob-rate-limit.middleware.ts
function createSicoobRateLimitMiddleware(options) {
  const store = /* @__PURE__ */ new Map();
  const windowMs = options.windowMs;
  const max = options.max;
  const keyGenerator = options.keyGenerator || ((req) => req.ip ?? "unknown");
  return (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();
    const existing = store.get(key);
    if (!existing || existing.expiresAt <= now) {
      store.set(key, {
        hits: 1,
        expiresAt: now + windowMs
      });
      res.setHeader("X-RateLimit-Limit", max.toString());
      res.setHeader("X-RateLimit-Remaining", (max - 1).toString());
      return next();
    }
    if (existing.hits >= max) {
      const retryAfter = Math.ceil((existing.expiresAt - now) / 1e3);
      res.setHeader("Retry-After", retryAfter.toString());
      res.setHeader("X-RateLimit-Limit", max.toString());
      res.setHeader("X-RateLimit-Remaining", "0");
      sicoobLogger.warn("Rate limit atingido", {
        key,
        retryAfter,
        path: req.path
      });
      res.status(429).json({ error: "Too many requests" });
      return;
    }
    existing.hits += 1;
    res.setHeader("X-RateLimit-Limit", max.toString());
    res.setHeader("X-RateLimit-Remaining", (max - existing.hits).toString());
    next();
  };
}

// src/routes/sicoob.validators.ts
import { z as z8 } from "zod";
var pixStatusEnum = z8.enum(["VIGENTE", "RECEBIDA", "CANCELADA", "DEVOLVIDA", "EXPIRADA"]).optional();
var boletoStatusEnum = z8.enum(["ATIVO", "PAGO", "CANCELADO", "VENCIDO"]).optional();
var criarPixImediataSchema = z8.object({
  chave_pix: z8.string().min(1),
  solicitacao_pagador: z8.string().optional(),
  valor: z8.number().positive(),
  expiracao: z8.number().int().positive().optional(),
  abatimento: z8.object({
    tipo: z8.enum(["FIXO", "PERCENTUAL"]),
    valor_abatimento: z8.number().positive()
  }).optional(),
  juros: z8.object({
    tipo: z8.enum(["SIMPLES", "COMPOSTO"]),
    valor_juros: z8.number().nonnegative()
  }).optional(),
  multa: z8.object({
    tipo: z8.enum(["FIXO", "PERCENTUAL"]),
    valor_multa: z8.number().nonnegative()
  }).optional(),
  desconto: z8.object({
    tipo: z8.enum(["FIXO", "PERCENTUAL"]),
    valor_desconto: z8.number().nonnegative()
  }).optional(),
  infoAdicionais: z8.array(
    z8.object({
      nome: z8.string(),
      valor: z8.string()
    })
  ).optional()
});
var criarPixComVencimentoSchema = criarPixImediataSchema.extend({
  data_vencimento: z8.string().min(1)
});
var listarPixQuerySchema = z8.object({
  status: pixStatusEnum,
  data_inicio: z8.string().optional(),
  data_fim: z8.string().optional(),
  pagina: z8.coerce.number().int().min(1).optional(),
  limite: z8.coerce.number().int().min(1).max(100).optional()
});
var criarBoletoSchema = z8.object({
  beneficiario: z8.object({
    nome: z8.string().min(1),
    cpf_cnpj: z8.string().min(11).max(14)
  }),
  pagador: z8.object({
    nome: z8.string().min(1),
    cpf_cnpj: z8.string().min(11).max(14)
  }),
  valor: z8.number().positive(),
  data_vencimento: z8.string().min(1),
  descricao: z8.string().optional(),
  multa: z8.number().nonnegative().optional(),
  juros: z8.number().nonnegative().optional(),
  desconto: z8.object({
    valor: z8.number().nonnegative(),
    data_limite: z8.string().optional()
  }).optional()
});
var listarBoletosQuerySchema = z8.object({
  status: boletoStatusEnum,
  data_inicio: z8.string().optional(),
  data_fim: z8.string().optional(),
  pagina: z8.coerce.number().int().min(1).optional(),
  limite: z8.coerce.number().int().min(1).max(100).optional()
});
var cobrancaGenericaSchema = z8.object({
  tipo: z8.enum(["PIX", "BOLETO"]),
  descricao: z8.string().optional(),
  metadados: z8.record(z8.any()).optional(),
  pix: z8.object({
    modalidade: z8.enum(["IMEDIATA", "COM_VENCIMENTO"]),
    imediata: criarPixImediataSchema.optional(),
    comVencimento: criarPixComVencimentoSchema.optional()
  }).optional(),
  boleto: z8.object({
    dados: criarBoletoSchema
  }).optional()
});
var txidParamSchema = z8.object({
  txid: z8.string().min(1)
});
var nossoNumeroParamSchema = z8.object({
  nossoNumero: z8.string().min(1)
});
var cobrancaIdParamSchema = z8.object({
  id: z8.string().min(1)
});
function validateParams(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      res.status(400).json({
        erro: "Valida\xE7\xE3o de par\xE2metros falhou",
        detalhes: result.error.flatten()
      });
      return;
    }
    req.params = result.data;
    next();
  };
}
function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        erro: "Valida\xE7\xE3o falhou",
        detalhes: result.error.flatten()
      });
      return;
    }
    req.body = result.data;
    next();
  };
}
function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      res.status(400).json({
        erro: "Valida\xE7\xE3o de query falhou",
        detalhes: result.error.flatten()
      });
      return;
    }
    req.query = result.data;
    next();
  };
}

// src/routes/sicoob.routes.ts
function createSicoobRoutes(webhookSecret) {
  const router = (0, import_express.Router)();
  const authenticate = createSicoobJwtMiddleware();
  const rateLimiter = createSicoobRateLimitMiddleware({
    windowMs: 6e4,
    max: 60
  });
  const webhookRateLimiter = createSicoobRateLimitMiddleware({
    windowMs: 6e4,
    max: 120,
    keyGenerator: (req) => req.ip ?? "unknown"
  });
  router.use((req, res, next) => {
    sicoobLogger.debug(`${req.method} ${req.path}`);
    next();
  });
  router.get("/health", SicoobController.healthCheck);
  router.post(
    "/pix/cobranca-imediata",
    rateLimiter,
    authenticate,
    validateBody(criarPixImediataSchema),
    SicoobController.criarCobrancaPixImediata
  );
  router.post(
    "/pix/cobranca-vencimento",
    rateLimiter,
    authenticate,
    validateBody(criarPixComVencimentoSchema),
    SicoobController.criarCobrancaPixVencimento
  );
  router.get(
    "/pix/cobranca/:txid",
    rateLimiter,
    authenticate,
    validateParams(txidParamSchema),
    SicoobController.consultarCobrancaPix
  );
  router.get(
    "/pix/cobracas",
    rateLimiter,
    authenticate,
    validateQuery(listarPixQuerySchema),
    SicoobController.listarCobrancasPix
  );
  router.delete(
    "/pix/cobranca/:txid",
    rateLimiter,
    authenticate,
    validateParams(txidParamSchema),
    SicoobController.cancelarCobrancaPix
  );
  router.get(
    "/pix/qrcode/:txid",
    rateLimiter,
    authenticate,
    validateParams(txidParamSchema),
    SicoobController.consultarQRCode
  );
  router.post(
    "/boleto",
    rateLimiter,
    authenticate,
    validateBody(criarBoletoSchema),
    SicoobController.gerarBoleto
  );
  router.get(
    "/boleto/:nossoNumero",
    rateLimiter,
    authenticate,
    validateParams(nossoNumeroParamSchema),
    SicoobController.consultarBoleto
  );
  router.get(
    "/boletos",
    rateLimiter,
    authenticate,
    validateQuery(listarBoletosQuerySchema),
    SicoobController.listarBoletos
  );
  router.delete(
    "/boleto/:nossoNumero",
    rateLimiter,
    authenticate,
    validateParams(nossoNumeroParamSchema),
    SicoobController.cancelarBoleto
  );
  router.get(
    "/boleto/:nossoNumero/pdf",
    rateLimiter,
    authenticate,
    validateParams(nossoNumeroParamSchema),
    SicoobController.baixarPDFBoleto
  );
  router.post(
    "/cobranca",
    rateLimiter,
    authenticate,
    validateBody(cobrancaGenericaSchema),
    SicoobController.criarCobranca
  );
  router.get(
    "/cobranca/:id",
    rateLimiter,
    authenticate,
    validateParams(cobrancaIdParamSchema),
    SicoobController.consultarCobranca
  );
  router.put(
    "/cobranca/:id",
    rateLimiter,
    authenticate,
    validateParams(cobrancaIdParamSchema),
    validateBody(cobrancaGenericaSchema.partial()),
    SicoobController.atualizarCobranca
  );
  router.delete(
    "/cobranca/:id",
    rateLimiter,
    authenticate,
    validateParams(cobrancaIdParamSchema),
    SicoobController.cancelarCobranca
  );
  router.get(
    "/cobrancas",
    rateLimiter,
    authenticate,
    SicoobController.listarCobrancas
  );
  router.post(
    "/webhook",
    webhookRateLimiter,
    sicoobWebhookBodyParser(),
    sicoobWebhookMiddleware(webhookSecret),
    SicoobController.receberWebhook
  );
  return router;
}
function registerSicoobRoutes(app, webhookSecret, basePath = "/api/sicoob") {
  const router = createSicoobRoutes(webhookSecret);
  app.use(basePath, router);
  sicoobLogger.info("Rotas Sicoob registradas", { basePath });
}

// src/index.ts
function hasSicoobConfiguration() {
  const hasFileCert = env.SICOOB_CERT_PATH && env.SICOOB_KEY_PATH;
  const hasPfx = env.SICOOB_CERT_PFX_BASE64 && env.SICOOB_CERT_PFX_PASS;
  return Boolean(
    env.SICOOB_API_BASE_URL && env.SICOOB_AUTH_URL && env.SICOOB_CLIENT_ID && env.SICOOB_WEBHOOK_SECRET && (hasFileCert || hasPfx)
  );
}
async function buildServer() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === "development" ? "debug" : "info"
    }
  });
  await app.register(fastifyCors, {
    origin: "*",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  });
  await app.register(fastifySensible);
  app.get("/health", async () => {
    return { status: "healthy" };
  });
  await registerAuthRoutes(app);
  await registerDashboardRoutes(app);
  await registerNfseController(app);
  await registerNfseRoutes(app);
  await registerGpsRoutes(app);
  await registerPaymentRoutes(app);
  await registerWhatsappRoutes(app);
  if (hasSicoobConfiguration()) {
    await app.register(fastifyExpress);
    const express = (await import("./express-HEUDQNPQ.js")).default;
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    initializeSicoobServices({
      environment: env.SICOOB_ENVIRONMENT ?? "sandbox",
      baseUrl: env.SICOOB_API_BASE_URL,
      authUrl: env.SICOOB_AUTH_URL,
      authValidateUrl: env.SICOOB_AUTH_VALIDATE_URL,
      clientId: env.SICOOB_CLIENT_ID,
      clientSecret: env.SICOOB_CLIENT_SECRET || void 0,
      certPath: env.SICOOB_CERT_PATH || void 0,
      keyPath: env.SICOOB_KEY_PATH || void 0,
      caPath: env.SICOOB_CA_PATH || void 0,
      caBase64: env.SICOOB_CA_BASE64 || void 0,
      pfxBase64: env.SICOOB_CERT_PFX_BASE64 || void 0,
      pfxPassphrase: env.SICOOB_CERT_PFX_PASS || void 0,
      webhookSecret: env.SICOOB_WEBHOOK_SECRET,
      cooperativa: env.SICOOB_COOPERATIVA,
      conta: env.SICOOB_CONTA,
      scopes: env.SICOOB_SCOPES ? env.SICOOB_SCOPES.split(/[,\s]+/).filter(Boolean) : void 0
    });
    registerSicoobRoutes(
      app,
      env.SICOOB_WEBHOOK_SECRET,
      "/api/sicoob"
    );
    app.log.info("Integra\uFFFD\uFFFDo Sicoob inicializada");
  } else {
    app.log.warn(
      "Vari\uFFFDveis de ambiente Sicoob ausentes. Rotas Sicoob n\uFFFDo foram registradas."
    );
  }
  return app;
}
buildServer().then(async (app) => {
  app.listen({ port: env.PORT, host: "127.0.0.1" }, (error, address) => {
    if (error) {
      app.log.error(error, "Falha ao iniciar servidor");
      process.exit(1);
    }
    app.log.info(`API GuiasMEI escutando em ${address}`);
    if (env.NODE_ENV !== "test") {
      try {
        startScheduler();
        app.log.info("NFSe scheduler started");
      } catch (err) {
        app.log.error(err, "Failed to start NFSe scheduler");
      }
    }
  });
}).catch((error) => {
  console.error("Erro ao iniciar servidor", error);
  process.exit(1);
});
