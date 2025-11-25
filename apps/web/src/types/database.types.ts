export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at?: string;
}

export interface Profile {
  id: string;
  name: string;
  document: string;
  pis?: string;
  phone?: string;
  user_type: "mei" | "autonomo" | "partner" | "admin";
  contract_accepted: boolean;
  onboarding_completed: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Partner {
  id: string;
  company_name: string;
  cnpj: string;
  email: string;
  phone?: string;
  commission_rate: number;
  created_at: string;
  updated_at?: string;
}

export interface Payment {
  id: string;
  user_id: string;
  amount: number;
  status: "pending" | "completed" | "failed" | "cancelled";
  payment_method?: string;
  stripe_session_id?: string;
  created_at: string;
  updated_at?: string;
}

export interface NfseEmission {
  id: string;
  user_id: string;
  value: number;
  service_description: string;
  issued_at: string;
  nfse_key?: string;
  status: "pending" | "issued" | "cancelled" | "error";
  tomador: {
    nome: string;
    documento: string;
    email?: string;
  };
  pdf_url?: string;
  created_at: string;
  updated_at?: string;
}

export interface GpsEmission {
  id: string;
  user_id: string;
  reference_month: string;
  value: number;
  barcode?: string;
  due_date: string;
  status: "pending" | "generated" | "paid" | "cancelled";
  pdf_url?: string;
  created_at: string;
  updated_at?: string;
}

export interface CertificateEnrollment {
  id: string;
  user_id: string;
  provider_id: string;
  status: "pending" | "payment_pending" | "processing" | "active" | "expired" | "cancelled";
  valid_until?: string;
  created_at: string;
  updated_at?: string;
}
