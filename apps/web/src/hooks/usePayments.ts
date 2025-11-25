import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { paymentService } from "@/services";
import type { Payment } from "@/types";

export function usePayments(userId: string) {
  return useQuery({
    queryKey: ["payments", userId],
    queryFn: () => paymentService.getPayments(userId),
    enabled: !!userId,
  });
}

export function usePayment(paymentId: string) {
  return useQuery({
    queryKey: ["payment", paymentId],
    queryFn: () => paymentService.getPaymentById(paymentId),
    enabled: !!paymentId,
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payment: Omit<Payment, "id" | "created_at" | "updated_at">) =>
      paymentService.createPayment(payment),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["payments", data.user_id] });
    },
  });
}

export function useUpdatePaymentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ paymentId, status }: { paymentId: string; status: Payment["status"] }) =>
      paymentService.updatePaymentStatus(paymentId, status),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["payment", data.id] });
      queryClient.invalidateQueries({ queryKey: ["payments", data.user_id] });
    },
  });
}
