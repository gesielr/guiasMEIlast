import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { getCertWhatsappService } from "../src/services/whatsapp/cert-whatsapp.service";

const outboundSchema = z.object({
  to: z.string().min(8),
  message: z.string().min(1),
  cobrancaId: z.string().optional(),
  tipo: z.enum(["info", "cobranca", "notificacao"]).optional()
});

type OutboundPayload = z.infer<typeof outboundSchema>;

function extractWhatsappNumber(body: any): string | null {
  // Z-API envia como "phone"
  // Twilio envia como "From" no formato "whatsapp:+5511999999999"
  const from = body?.phone ?? body?.From ?? body?.from ?? body?.telefone;
  if (typeof from === "string" && from.length > 0) {
    // Remove o prefixo "whatsapp:" se existir, mantendo o "+" e o número
    // Retorna no formato "+5511999999999" ou "554891589495"
    return from.replace(/^whatsapp:/, "").trim();
  }
  return null;
}

function extractMessage(body: any): string {
  // Z-API envia como "text.message"
  // Twilio envia como "Body"
  const message = body?.text?.message ?? body?.Body ?? body?.body ?? body?.mensagem ?? "";
  return message.toString().trim();
}

export async function registerWhatsappRoutes(app: FastifyInstance) {
  const whatsappService = getCertWhatsappService();

  console.log("🔵 Rotas WhatsApp registradas - código atualizado!");

  // Endpoint de teste super simples - sem depender de body parsing
  app.get("/whatsapp/ping", async () => {
    console.log("PING RECEBIDO!");
    return { pong: true, timestamp: new Date().toISOString() };
  });

  // Endpoint de teste para debug
  app.post("/whatsapp/test", async (request: FastifyRequest) => {
    console.log("🟢🟢🟢 POST TESTE - Handler chamado!");
    console.log("Body:", JSON.stringify(request.body));
    return { ok: true, received: request.body };
  });

  app.post("/whatsapp", async (request: FastifyRequest<{ Body: OutboundPayload }>) => {
    const payload = outboundSchema.parse(request.body);
    request.log.info({ payload }, "Enviando mensagem WhatsApp manual");

    await whatsappService.enviarMensagemDireta(payload.to, payload.message);

    if (payload.cobrancaId) {
      try {
        const { getCobrancaService } = await import("../src/services/sicoob/cobranca-db.service");
        const cobrancaService = getCobrancaService();
        await cobrancaService.adicionarHistorico(payload.cobrancaId, {
          tipo: "whatsapp_enviado",
          dados: {
            destinatario: payload.to,
            mensagem: payload.message,
            tipo: payload.tipo || "info"
          }
        });
      } catch (error) {
        request.log.error({ error }, "Erro ao registrar histórico de WhatsApp");
      }
    }

    return { ok: true };
  });

  app.post("/whatsapp/webhook", async (request: FastifyRequest) => {
    // Log completo do payload recebido para debug
    console.log("\n=== WEBHOOK RECEBIDO ===");
    console.log("Tipo do body:", typeof request.body);
    console.log("Body é null?:", request.body === null);
    console.log("Body é undefined?:", request.body === undefined);
    console.log("Body completo:", JSON.stringify(request.body, null, 2));
    console.log("Content-Type:", request.headers["content-type"]);
    console.log("Keys do body:", request.body ? Object.keys(request.body) : "sem keys");
    console.log("========================\n");

    request.log.info({
      body: request.body,
      headers: request.headers,
      contentType: request.headers["content-type"]
    }, "Webhook WhatsApp recebido - payload completo");

    const from = extractWhatsappNumber(request.body);
    const message = extractMessage(request.body);

    console.log("From extraído:", from);
    console.log("Message extraído:", message);

    request.log.info({ from, message, bodyKeys: Object.keys(request.body || {}) }, "Webhook WhatsApp - dados extraídos");

    if (!from || !message) {
      request.log.warn({ 
        body: request.body, 
        from, 
        message 
      }, "Webhook WhatsApp - payload inválido");
      return { ok: false, reason: "payload inválido", received: { from, message } };
    }

    const normalized = message.toLowerCase();
    let resposta: string;

    if (normalized.includes("certificado") && normalized.includes("status")) {
      resposta = [
        "🧾 *Status do Certificado Digital*",
        "1. Gere o pagamento PIX de R$150 no painel ou peça o link por aqui.",
        "2. Após o pagamento enviaremos seu agendamento com a Certisign.",
        "3. Quando o certificado estiver ativo você receberá uma notificação automática.",
        "Deseja que eu gere o QR Code novamente?"
      ].join("\n\n");
    } else if (normalized.includes("pagar") || normalized.includes("pix")) {
      resposta = [
        "🔗 *Pagamento do Certificado*",
        "Enviei um novo QR Code PIX de R$150 para você completar o processo.",
        "Depois do pagamento acompanhe por aqui. Qualquer dúvida é só responder."
      ].join("\n\n");
    } else if (normalized.includes("ajuda") || normalized.includes("suporte")) {
      resposta = [
        "👋 *Equipe GuiasMEI*",
        "Estou aqui para ajudar com certificado, NFSe e INSS.",
        "Para falar com um especialista humano basta responder \"humano\" e encaminharemos o atendimento."
      ].join("\n\n");
    } else {
      resposta = [
        "🙋 *Fluxo Certificado GuiasMEI*",
        "1. Gere o pagamento PIX de R$150.",
        "2. Aguarde o contato da Certisign para validar seus documentos.",
        "3. Assim que estiver ativo liberamos a emissão de NFS-e.",
        "Precisa refazer alguma etapa? É só me contar."
      ].join("\n\n");
    }

    try {
      await whatsappService.enviarMensagemDireta(from, resposta);
      request.log.info({ from, respostaLength: resposta.length }, "Resposta enviada com sucesso via WhatsApp");
      return { ok: true };
    } catch (error) {
      request.log.error({ error, from, message }, "Erro ao enviar resposta via WhatsApp");
      return { ok: false, reason: "erro ao enviar resposta", error: (error as Error).message };
    }
  });
}

export default registerWhatsappRoutes;
