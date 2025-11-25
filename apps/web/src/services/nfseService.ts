import { supabase } from "@/supabase/client";
import type { NfseEmission } from "@/types";

export const nfseService = {
  async getNfseEmissions(userId: string): Promise<NfseEmission[]> {
    const { data, error } = await supabase
      .from("nfse_emissions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getNfseById(nfseId: string): Promise<NfseEmission> {
    const { data, error } = await supabase
      .from("nfse_emissions")
      .select("*")
      .eq("id", nfseId)
      .single();

    if (error) throw error;
    return data;
  },

  async createNfseEmission(
    emission: Omit<NfseEmission, "id" | "created_at" | "updated_at">
  ): Promise<NfseEmission> {
    const { data, error } = await supabase
      .from("nfse_emissions")
      .insert(emission)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async cancelNfse(nfseId: string): Promise<NfseEmission> {
    const { data, error } = await supabase
      .from("nfse_emissions")
      .update({ status: "cancelled" })
      .eq("id", nfseId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
