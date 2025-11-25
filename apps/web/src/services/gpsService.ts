import { supabase } from "@/supabase/client";
import type { GpsEmission } from "@/types";

export const gpsService = {
  async getGpsEmissions(userId: string): Promise<GpsEmission[]> {
    const { data, error } = await supabase
      .from("gps_emissions")
      .select("*")
      .eq("user_id", userId)
      .order("reference_month", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getGpsById(gpsId: string): Promise<GpsEmission> {
    const { data, error } = await supabase
      .from("gps_emissions")
      .select("*")
      .eq("id", gpsId)
      .single();

    if (error) throw error;
    return data;
  },

  async createGpsEmission(
    emission: Omit<GpsEmission, "id" | "created_at" | "updated_at">
  ): Promise<GpsEmission> {
    const { data, error } = await supabase
      .from("gps_emissions")
      .insert(emission)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async markAsPaid(gpsId: string): Promise<GpsEmission> {
    const { data, error } = await supabase
      .from("gps_emissions")
      .update({ status: "paid" })
      .eq("id", gpsId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
