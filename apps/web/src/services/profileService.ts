import { supabase } from "@/supabase/client";
import type { Profile } from "@/types";

export const profileService = {
  async getProfile(userId: string): Promise<Profile> {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) throw error;
    return data;
  },

  async updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile> {
    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async completeOnboarding(userId: string): Promise<void> {
    const { error } = await supabase
      .from("profiles")
      .update({ onboarding_completed: true })
      .eq("id", userId);

    if (error) throw error;
  },

  async acceptContract(userId: string): Promise<void> {
    const { error } = await supabase
      .from("profiles")
      .update({ contract_accepted: true })
      .eq("id", userId);

    if (error) throw error;
  },
};
