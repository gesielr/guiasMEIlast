import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./styles/global.css";
import { SdkProvider } from "./providers/sdk-provider";
import { AuthProvider as SdkAuthProvider } from "./providers/auth-provider";
import { AuthProvider as RoleAuthProvider } from "./auth/AuthProvider";

// ✅ Handler global para ignorar erros de extensões do navegador
// Este erro ocorre quando extensões do Chrome/Edge interceptam mensagens
// mas não afeta a funcionalidade da aplicação
window.addEventListener('error', (event: ErrorEvent) => {
  const errorMessage = event.message || event.error?.message || '';

  // Ignorar erro específico de extensões do navegador
  if (errorMessage.includes('message channel closed') ||
    errorMessage.includes('asynchronous response') ||
    errorMessage.includes('listener indicated')) {
    event.preventDefault();
    console.debug('[APP] Erro de extensão do navegador ignorado:', errorMessage);
    return false;
  }
});

// ✅ Handler para promessas rejeitadas não tratadas
window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
  const errorMessage = event.reason?.message || String(event.reason) || '';

  // Ignorar erro específico de extensões do navegador
  if (errorMessage.includes('message channel closed') ||
    errorMessage.includes('asynchronous response') ||
    errorMessage.includes('listener indicated')) {
    event.preventDefault();
    console.debug('[APP] Promise rejeitada de extensão ignorada:', errorMessage);
    return false;
  }
});

const queryClient = new QueryClient();

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find the root element");

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SdkProvider>
          <RoleAuthProvider>
            <SdkAuthProvider>
              <App />
            </SdkAuthProvider>
          </RoleAuthProvider>
        </SdkProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
