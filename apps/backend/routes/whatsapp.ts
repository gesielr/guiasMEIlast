import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { getCertWhatsappService } from "../src/services/whatsapp/cert-whatsapp.service";
import { getAIAgent, buscarPerfilPorTelefone } from "../src/services/ai/ai-agent.service";
import { isDualUser, getDualMenuMessage, processDualMenuChoice, isShowingDualMenu, setShowingDualMenu, getDualMenuChoice } from "../src/services/whatsapp/dual-menu.service";

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
    console.log("Body completo:", JSON.stringify(request.body, null, 2));
    console.log("Content-Type:", request.headers["content-type"]);
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

    request.log.info({ from, message }, "Webhook WhatsApp - dados extraídos");

    if (!from || !message) {
      request.log.warn({ body: request.body, from, message }, "Webhook WhatsApp - payload inválido");
      return { ok: false, reason: "payload inválido", received: { from, message } };
    }

    try {
      // CORRIGIDO: Usar o sistema de agente IA que reconhece usuários cadastrados
      const aiAgent = getAIAgent();

      // Buscar perfil do usuário
      const userProfile = await buscarPerfilPorTelefone(from);

      request.log.info({ from, userProfile: userProfile ? { userId: userProfile.userId, userType: userProfile.userType } : null }, "Perfil de usuário encontrado");

      // Se usuário tem perfil e é duplo (MEI + Autônomo), mostrar menu duplo
      if (userProfile && userProfile.userId) {
        const isDual = await isDualUser(userProfile.userId, userProfile.userType || null);

        if (isDual) {
          // Verificar se está escolhendo do menu
          if (isShowingDualMenu(from)) {
            const choice = processDualMenuChoice(from, message);
            if (choice.valid && choice.response) {
              await whatsappService.enviarMensagemDireta(from, choice.response);
              request.log.info({ from, choice: choice.choice }, "Opção do menu duplo escolhida");
              return { ok: true, dualMenuChoice: choice.choice };
            }
          }

          // Se não tem escolha ativa, mostrar menu duplo
          const lastChoice = getDualMenuChoice(from);
          if (!lastChoice) {
            setShowingDualMenu(from, userProfile.nome);
            const menuMessage = getDualMenuMessage(userProfile.nome);
            await whatsappService.enviarMensagemDireta(from, menuMessage);
            request.log.info({ from }, "Menu duplo exibido para usuário MEI+Autônomo");
            return { ok: true, showedDualMenu: true };
          }
        }
      }

      // Processar mensagem com IA (inclui verificação de perfil, menu duplo, etc)
      const context = {
        user: userProfile,
        conversationHistory: [] // Pode ser expandido para incluir histórico do banco
      };

      const resposta = await aiAgent.processarMensagem(message, context);

      await whatsappService.enviarMensagemDireta(from, resposta);
      request.log.info({ from, respostaLength: resposta.length }, "Resposta enviada com sucesso via WhatsApp");
      return { ok: true };
    } catch (error) {
      request.log.error({ error, from, message }, "Erro ao processar mensagem via IA");

      // Fallback: resposta genérica em caso de erro
      const respostaFallback = "Desculpe, estou com dificuldades técnicas no momento. Por favor, tente novamente em alguns instantes.";
      try {
        await whatsappService.enviarMensagemDireta(from, respostaFallback);
      } catch (fallbackError) {
        request.log.error({ fallbackError }, "Erro ao enviar mensagem de fallback");
      }

      return { ok: false, reason: "erro ao processar mensagem", error: (error as Error).message };
    }
  });
}

export default registerWhatsappRoutes;
