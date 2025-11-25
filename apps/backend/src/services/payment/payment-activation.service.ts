// apps/backend/src/services/payment/payment-activation.service.ts
// Service para geração de PIX para ativação do sistema (Autônomo)

import { getPixService } from "../sicoob";
import type { CobrancaPixImediata, CobrancaResponse } from "../sicoob/types";
import { createSupabaseClients } from "../../../services/supabase";
import { getValorAtivacaoAutonomo } from "../system-config.service";

const { admin } = createSupabaseClients();

export interface GerarPixAtivacaoInput {
  userId: string;
  nome: string;
  cpf_cnpj: string; // somente dígitos
  userType: "autonomo" | "mei";
}

export interface GerarPixAtivacaoOutput {
  txid: string;
  qr_code: string;
  qr_code_url?: string;
  valor: number;
}

export class PaymentActivationService {
  /**
   * Gerar cobrança PIX para ativação do sistema.
   * - Salva registro em payments com payment_type = 'activation'
   * - Valor é buscado do banco de dados (configurável pelo admin)
   */
  async gerarCobrancaPIX(input: GerarPixAtivacaoInput): Promise<GerarPixAtivacaoOutput> {
    // Buscar valor de ativação do banco (configurável pelo admin)
    const valorAtivacao = await getValorAtivacaoAutonomo();
    const pixService = getPixService();

    const chavePix = process.env.SICOOB_PIX_CHAVE;
    if (!chavePix) {
      throw new Error("Variável de ambiente SICOOB_PIX_CHAVE não configurada");
    }

    // Monta payload no padrão PADI PIX (Bacen)
    const payload: CobrancaPixImediata = {
      calendario: { expiracao: 3600 }, // 1h para pagar
      devedor: this.toDevedor(input.nome, input.cpf_cnpj),
      valor: { original: valorAtivacao.toFixed(2) },
      chave: chavePix,
      solicitacaoPagador: `Ativação Sistema GuiasMEI - ${input.userType === "autonomo" ? "Autônomo" : "MEI"}`,
      infoAdicionais: [
        { nome: "produto", valor: "ativacao_sistema" },
        { nome: "plataforma", valor: "guiasmei" },
        { nome: "tipo_usuario", valor: input.userType }
      ]
    };

    // Cria cobrança na API Sicoob
    const cobranca: CobrancaResponse = await pixService.criarCobrancaImediata(payload);

    // Persistir cobrança na tabela payments
    await admin
      .from("payments")
      .insert({
        user_id: input.userId,
        amount: valorAtivacao,
        type: "activation",
        status: "pending",
        stripe_session_id: cobranca.txid, // Reutilizando campo para txid do PIX
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    return {
      txid: cobranca.txid,
      qr_code: cobranca.qr_code || "",
      qr_code_url: cobranca.qr_code_url,
      valor: valorAtivacao
    };
  }

  /**
   * Verifica se o usuário já tem ativação paga (nos últimos 365 dias)
   */
  async verificarAtivacaoAtiva(userId: string): Promise<boolean> {
    const umAnoAtras = new Date();
    umAnoAtras.setFullYear(umAnoAtras.getFullYear() - 1);

    const { data, error } = await admin
      .from("payments")
      .select("id, created_at")
      .eq("user_id", userId)
      .eq("type", "activation")
      .eq("status", "completed")
      .gte("created_at", umAnoAtras.toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return false;
    }

    return true;
  }

  /**
   * Atualiza pagamento como confirmado
   */
  async marcarPagamentoComoPago(txid: string): Promise<void> {
    await admin
      .from("payments")
      .update({ 
        status: "completed", 
        updated_at: new Date().toISOString()
      })
      .eq("stripe_session_id", txid) // txid está salvo em stripe_session_id
      .eq("type", "activation");
  }

  private toDevedor(nome: string, cpfOuCnpj: string) {
    const onlyDigits = cpfOuCnpj.replace(/\D+/g, "");
    if (onlyDigits.length <= 11) {
      return { nome, cpf: onlyDigits };
    }
    return { nome, cnpj: onlyDigits };
  }
}

// Singleton
let instance: PaymentActivationService | null = null;
export function getPaymentActivationService(): PaymentActivationService {
  if (!instance) instance = new PaymentActivationService();
  return instance;
}

