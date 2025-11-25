// apps/backend/src/services/whatsapp/cert-whatsapp.service.ts
// Serviço especializado em notificações WhatsApp relacionadas ao fluxo de certificado digital

import axios from "axios";
import { createSupabaseClients } from "../../../services/supabase";

const { admin } = createSupabaseClients();

const ZAPI_BASE_URL = process.env.ZAPI_BASE_URL;
const ZAPI_INSTANCE_ID = process.env.ZAPI_INSTANCE_ID;
const ZAPI_TOKEN = process.env.ZAPI_TOKEN;
const ZAPI_CLIENT_TOKEN = process.env.ZAPI_CLIENT_TOKEN;

function sanitizeWhatsApp(number?: string | null): string | null {
  if (!number) return null;

  // Remove tudo que não for dígito
  const digits = number.replace(/\D+/g, "");
  if (digits.length < 10) return null;

  // Para Z-API, retorna apenas os dígitos
  // Assume número brasileiro (55) se vier com DDD
  const full = digits.startsWith("55") ? digits : `55${digits}`;
  return full;
}

export class CertWhatsappService {
  private enabled: boolean;

  constructor() {
    this.enabled = Boolean(ZAPI_BASE_URL && ZAPI_INSTANCE_ID && ZAPI_TOKEN);
    if (this.enabled) {
      console.log("[WHATSAPP] Z-API configurado para notificações de certificado.");
    } else {
      console.warn("[WHATSAPP] Variáveis Z-API ausentes. Notificações serão apenas logadas.");
    }
  }

  private async sendMessage(to: string, body: string): Promise<void> {
    if (!this.enabled) {
      console.log("[WHATSAPP:MOCK]", { to, body });
      return;
    }

    try {
      const response = await axios.post(
        `${ZAPI_BASE_URL}/send-text`,
        {
          phone: to,
          message: body
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Client-Token': ZAPI_CLIENT_TOKEN
          }
        }
      );
      console.log("[WHATSAPP] Mensagem enviada via Z-API", { to, response: response.data });
    } catch (error: any) {
      console.error("[WHATSAPP] Falha ao enviar mensagem via Z-API", {
        to,
        error: error?.response?.data || error?.message || error
      });
    }
  }

  /**
   * Notifica o usuário que o pagamento foi confirmado.
   */
  async notificarPagamentoConfirmado(userId: string): Promise<void> {
    const { data: profile } = await admin
      .from("profiles")
      .select("id, nome, telefone")
      .eq("id", userId)
      .single();

    const numero = sanitizeWhatsApp(profile?.telefone);
    if (!numero) {
      console.warn("[WHATSAPP] Telefone inválido ou ausente para enviar confirmação de pagamento.", {
        userId,
        telefone: profile?.telefone
      });
      return;
    }

    const mensagem = [
      `Olá, ${profile?.nome ?? "empreendedor(a)"}! 🎉`,
      "Recebemos o pagamento do seu Certificado Digital GuiasMEI.",
      "Nossa equipe e a Certisign vão entrar em contato em até 48h para agendar a validação.",
      "Assim que o certificado estiver ativo avisaremos por aqui."
    ].join("\n\n");

    await this.sendMessage(numero, mensagem);
  }

  /**
   * Dispara notificação quando o certificado entrar em estado ativo.
   */

  async notificarPagamentoExpirado(userId: string): Promise<void> {
    const { data: profile } = await admin
      .from("profiles")
      .select("id, nome, telefone")
      .eq("id", userId)
      .single();

    const numero = sanitizeWhatsApp(profile?.telefone);
    if (!numero) {
      console.warn("[WHATSAPP] Telefone inválido ao avisar pagamento expirado.", {
        userId,
        telefone: profile?.telefone
      });
      return;
    }

    const mensagem = [
      `Olá, ${profile?.nome ?? "empreendedor(a)"}!`,
      "O QR Code do seu certificado digital expirou.",
      "Você pode gerar um novo link no painel GuiasMEI ou chamar nossa equipe por aqui."
    ].join("\n\n");

    await this.sendMessage(numero, mensagem);
  }

  async notificarCertificadoExpirando(userId: string, diasRestantes: number): Promise<void> {
    const { data: profile } = await admin
      .from("profiles")
      .select("id, nome, telefone")
      .eq("id", userId)
      .single();

    const numero = sanitizeWhatsApp(profile?.telefone);
    if (!numero) {
      console.warn("[WHATSAPP] Telefone inválido ao avisar certificado expirando.", {
        userId,
        telefone: profile?.telefone
      });
      return;
    }

    const mensagem = [
      `Olá, ${profile?.nome ?? "empreendedor(a)"}!`,
      `Seu certificado digital expira em ${diasRestantes} dia(s).`,
      "Renove com antecedência para continuar emitindo NFS-e sem interrupções.",
      "Qualquer dúvida é só responder esta mensagem."
    ].join("\n\n");

    await this.sendMessage(numero, mensagem);
  }

  async enviarMensagemDireta(telefoneDestino: string, mensagem: string): Promise<void> {
    const numero = sanitizeWhatsApp(telefoneDestino);
    if (!numero) {
      console.warn('[WHATSAPP] Telefone inválido ao enviar mensagem direta.', { telefoneDestino });
      return;
    }

    await this.sendMessage(numero, mensagem);
  }

  async notificarCertificadoAtivo(userId: string): Promise<void> {
    const { data: profile } = await admin
      .from("profiles")
      .select("id, nome, telefone")
      .eq("id", userId)
      .single();

    const numero = sanitizeWhatsApp(profile?.telefone);
    if (!numero) {
      console.warn("[WHATSAPP] Telefone inválido ao avisar certificado ativo.", {
        userId,
        telefone: profile?.telefone
      });
      return;
    }

    const mensagem = [
      `Boa notícia, ${profile?.nome ?? "empreendedor(a)"}! ✅`,
      "Seu certificado digital GuiasMEI já está ativo e pronto para uso.",
      "Agora você pode emitir NFS-e diretamente pela plataforma.",
      "Se precisar de ajuda é só responder esta mensagem."
    ].join("\n\n");

    await this.sendMessage(numero, mensagem);
  }
}

let instance: CertWhatsappService | null = null;
export function getCertWhatsappService(): CertWhatsappService {
  if (!instance) instance = new CertWhatsappService();
  return instance;
}

