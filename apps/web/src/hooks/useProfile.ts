import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { profileService } from "@/services";
import type { Profile } from "@/types";

export function useProfile(userId: string) {
  return useQuery({
    queryKey: ["profile", userId],
    queryFn: () => profileService.getProfile(userId),
    enabled: !!userId,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, updates }: { userId: string; updates: Partial<Profile> }) =>
      profileService.updateProfile(userId, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["profile", data.id] });
    },
  });
}

export function useCompleteOnboarding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => profileService.completeOnboarding(userId),
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
    },
  });
}

export function useAcceptContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => profileService.acceptContract(userId),
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
    },
  });
}
