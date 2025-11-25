import { ReactNode } from "react";

export interface AuthContextType {
  session: any | null;
  challenge: any | null;
  profile: any | null;
  login: (identifier: string, password: string) => Promise<any>;
  register: (payload: RegisterPayload) => Promise<any>;
  verify2fa: (code: string) => Promise<void>;
  logout: () => void;
}

export interface RegisterPayload {
  email: string;
  password: string;
  name: string;
  document: string;
  phone?: string;
  role?: string;
  user_type?: string;
}

export interface ProviderProps {
  children: ReactNode;
}

export interface RouteGuardProps {
  children: ReactNode;
  allowedRoles?: string[];
}
