import { createContext, useContext, useMemo, ReactNode } from "react";
import { createSdk } from "@sdk";

type Sdk = ReturnType<typeof createSdk>;

const SdkContext = createContext<Sdk | null>(null);

interface SdkProviderProps {
  children: ReactNode;
}

export function SdkProvider({ children }: SdkProviderProps) {
  const sdk = useMemo(() => {
    const apiUrl = import.meta.env.VITE_API_URL;
    const appMode = import.meta.env.VITE_APP_MODE;
    
    // SEMPRE usar modo "production" se estamos em desenvolvimento local
    // Isso força chamadas reais ao backend
    // O modo "mock" só deve ser usado em testes unitários
    const defaultMode = "production"; // Mudança: padrão é production, não mock
    const mode = appMode === "mock" ? "mock" : (appMode || defaultMode);
    
    const baseUrl = apiUrl || "http://localhost:3000";
    
    console.log("[SDK PROVIDER] Configuração:", {
      apiUrl,
      baseUrl,
      mode,
      appMode,
      "VITE_API_URL definido": !!apiUrl
    });
    
    return createSdk({
      baseUrl: baseUrl,
      mode: mode,
    });
  }, []);

  return <SdkContext.Provider value={sdk}>{children}</SdkContext.Provider>;
}

export function useSdk() {
  const sdk = useContext(SdkContext);
  if (!sdk) {
    throw new Error("useSdk deve ser usado dentro de SdkProvider");
  }
  return sdk;
}
