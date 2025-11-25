import { supabase } from "@/supabase/client";
import type { Payment } from "@/types";

const API_URL = import.meta.env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const API_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;

export const paymentService = {
  async getPayments(userId: string): Promise<Payment[]> {
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getPaymentById(paymentId: string): Promise<Payment> {
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("id", paymentId)
      .single();

    if (error) throw error;
    return data;
  },

  async createPayment(payment: Omit<Payment, "id" | "created_at" | "updated_at">): Promise<Payment> {
    const { data, error } = await supabase
      .from("payments")
      .insert(payment)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updatePaymentStatus(
    paymentId: string,
    status: Payment["status"]
  ): Promise<Payment> {
    const { data, error } = await supabase
      .from("payments")
      .update({ status })
      .eq("id", paymentId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async createCheckoutSession(
    userId: string,
    amount: number = 120,
    description: string = "Adesão Rebelo App"
  ): Promise<string> {
    const response = await fetch(`${API_URL}/functions/v1/create-checkout-session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        user_id: userId,
        amount,
        description,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Erro ao criar sessão de pagamento");
    }

    const data = await response.json();
    return data.url;
  },
};
