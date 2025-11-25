import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useSdk } from "./sdk-provider";
import { supabase } from "../supabase/client";
import { Session } from "@supabase/supabase-js";

interface Challenge {
  identifier: string;
}

interface Profile {
  id: string;
  email: string;
  name?: string;
  role?: string;
}

interface LoginResult {
  challengeRequired?: boolean;
  session?: Session;
  profile?: Profile;
}

interface RegisterPayload {
  email: string;
  password: string;
  name?: string;
  role?: string;
  [key: string]: any;
}

interface RegisterResult {
  session?: Session;
}


interface AuthContextValue {
  session: Session | null;
  challenge: Challenge | null;
  login: (identifier: string, password: string) => Promise<LoginResult>;
  register: (payload: RegisterPayload) => Promise<RegisterResult>;
  verify2fa: (code: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const sdk = useSdk();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session ?? null);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
    });

    return () => {
      mounted = false;
      subscription.subscription?.unsubscribe?.();
    };
  }, []);

  const value = useMemo(
    () => ({
      session,
      challenge,
      async login(identifier: string, password: string): Promise<LoginResult> {
        const result = (await sdk.auth.login({ identifier, password })) as LoginResult;
        if (result.challengeRequired) {
          setChallenge({ identifier });
          navigate("/auth/2fa");
          return result;
        }
        if (result.session) {
          await supabase.auth.setSession({
            access_token: result.session.access_token,
            refresh_token: result.session.refresh_token,
          });
          setSession(result.session);
        }

        setProfile(result.profile ?? null);
        return result;
      },
      async register(payload: RegisterPayload): Promise<RegisterResult> {
        const apiUrl = import.meta.env.VITE_API_URL;
        const supabaseConfigured =
          import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;

        // PRIORIDADE 1: Sempre tentar chamar o backend primeiro
        // Isso garante que o perfil seja criado corretamente via backend
        // Tentar mesmo se apiUrl não estiver definido (usará localhost:3000 como padrão)
        const shouldCallBackend = !apiUrl || (apiUrl.trim() !== "" && apiUrl !== "mock");
        
        if (shouldCallBackend) {
          try {
            const backendUrl = apiUrl || "http://localhost:3000";
            console.log("[AUTH PROVIDER] 🔄 Chamando backend para registro:", { 
              backendUrl, 
              payload: { 
                email: payload.email, 
                role: payload.role,
                phone: payload.phone,
                hasName: !!payload.name,
                hasDocument: !!payload.document,
                hasPis: !!payload.pis
              }
            });
            
            const response = (await sdk.auth.register(payload)) as any;

            console.log("[AUTH PROVIDER] ✅ Resposta do backend recebida:", { 
              hasSession: !!response?.session, 
              hasWhatsappLink: !!response?.whatsappLink,
              userId: response?.userId,
              responseType: typeof response,
              responseKeys: response ? Object.keys(response) : []
            });

            if (response?.session) {
              console.log("[AUTH PROVIDER] Definindo sessão no Supabase...");
              await supabase.auth.setSession({
                access_token: response.session.access_token,
                refresh_token: response.session.refresh_token,
              });
              setSession(response.session);
              console.log("[AUTH PROVIDER] ✅ Sessão definida com sucesso");
              
              // ✅ CORREÇÃO: Carregar perfil após definir sessão
              if (response.session.user?.id) {
                try {
                  const { data: profileData } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', response.session.user.id)
                    .single();
                  
                  if (profileData) {
                    setProfile(profileData as any);
                    console.log("[AUTH PROVIDER] ✅ Perfil carregado:", profileData.user_type);
                  }
                } catch (profileError) {
                  console.warn("[AUTH PROVIDER] ⚠️ Erro ao carregar perfil:", profileError);
                }
              }
            } else {
              console.warn("[AUTH PROVIDER] ⚠️ Resposta do backend não contém sessão");
            }

            // Retornar resposta completa incluindo whatsappLink
            return response;
          } catch (error: any) {
            console.error("[AUTH PROVIDER] ❌ ERRO ao registrar via backend:", {
              error,
              message: error?.message,
              stack: error?.stack,
              name: error?.name,
              status: error?.status,
              statusText: error?.statusText,
              response: error?.response
            });
            // Se falhar, tentar criar direto no Supabase como fallback
          }
        }

        // Fallback: Criar usuário direto no Supabase se backend não disponível
        if (supabaseConfigured) {
          try {
            console.log("[AUTH PROVIDER] 🔄 Usando fallback: criando usuário direto no Supabase");
            
            // Normalizar telefone (garantir formato 55XXXXXXXXXXX)
            let normalizedPhone = payload.phone?.replace(/\D/g, '') || '';
            if (normalizedPhone && !normalizedPhone.startsWith('55')) {
              normalizedPhone = '55' + normalizedPhone;
            }
            
            console.log("[AUTH PROVIDER] Telefone normalizado:", {
              original: payload.phone,
              normalized: normalizedPhone
            });
            
            const { data: authData, error: authError } = await supabase.auth.signUp({
              email: payload.email,
              password: payload.password,
              options: {
                data: {
                  name: payload.name,
                  phone: normalizedPhone, // Telefone normalizado
                  role: payload.role,
                  user_type: payload.role,
                  document: payload.document,
                  businessName: payload.businessName,
                },
                emailRedirectTo: `${window.location.origin}/dashboard`
              }
            });

            if (authError) {
              console.error("[AUTH PROVIDER] ❌ Erro ao criar usuário no Supabase:", {
                error: authError,
                message: authError.message,
                status: authError.status,
                name: authError.name
              });
              throw authError;
            }
            
            console.log("[AUTH PROVIDER] ✅ Usuário criado no Supabase:", {
              userId: authData?.user?.id,
              email: authData?.user?.email,
              hasSession: !!authData?.session,
              confirmed: authData?.user?.confirmed_at ? 'sim' : 'não'
            });

            // SEMPRE tentar criar perfil manualmente (garantia dupla)
            // Isso garante que mesmo se o trigger falhar, o perfil será criado
            if (authData?.user?.id) {
              // Aguardar um pouco para garantir que o usuário está disponível no banco
              console.log("[AUTH PROVIDER] Aguardando 1 segundo antes de criar perfil...");
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              try {
                const profileData: any = {
                  id: authData.user.id,
                  name: payload.name || authData.user.user_metadata?.name,
                  email: payload.email || authData.user.email,
                  whatsapp_phone: normalizedPhone || null,
                  user_type: payload.role || authData.user.user_metadata?.user_type || authData.user.user_metadata?.role || 'common',
                  onboarding_completed: false,
                  contract_accepted: false,
                };
                
                // Adicionar campos opcionais
                if (payload.document) {
                  profileData.document = payload.document;
                }
                if (payload.pis) {
                  profileData.pis = payload.pis;
                }
                if (payload.businessName) {
                  profileData.business_name = payload.businessName;
                }
                
                console.log("[AUTH PROVIDER] 🔄 Tentando criar perfil manualmente:", {
                  userId: profileData.id,
                  email: profileData.email,
                  phone: profileData.whatsapp_phone,
                  userType: profileData.user_type,
                  hasDocument: !!profileData.document,
                  hasPis: !!profileData.pis,
                  profileDataKeys: Object.keys(profileData)
                });
                
                const { data: profileResult, error: profileError } = await supabase
                  .from('profiles')
                  .upsert(profileData, { onConflict: 'id' })
                  .select();
                
                if (profileError) {
                  console.error("[AUTH PROVIDER] ❌ ERRO ao criar perfil:", {
                    error: profileError,
                    code: profileError.code,
                    message: profileError.message,
                    details: profileError.details,
                    hint: profileError.hint,
                    userId: profileData.id
                  });
                  
                  // Se o erro for foreign key constraint, aguardar mais e tentar novamente
                  if (profileError.code === '23503' || profileError.message?.includes('foreign key')) {
                    console.log("[AUTH PROVIDER] ⏳ Erro de foreign key - aguardando 2 segundos e tentando novamente...");
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    const { data: retryResult, error: retryError } = await supabase
                      .from('profiles')
                      .upsert(profileData, { onConflict: 'id' })
                      .select();
                    
                    if (retryError) {
                      console.error("[AUTH PROVIDER] ❌ ERRO ao criar perfil (tentativa 2):", retryError);
                    } else {
                      console.log("[AUTH PROVIDER] ✅ Perfil criado na segunda tentativa:", retryResult);
                    }
                  }
                  // Não lançar erro - o trigger pode ter criado
                } else {
                  console.log("[AUTH PROVIDER] ✅ Perfil criado/atualizado com sucesso:", {
                    profileResult,
                    count: profileResult?.length || 0
                  });
                }
              } catch (profileErr: any) {
                console.error("[AUTH PROVIDER] ❌ EXCEÇÃO ao criar perfil:", {
                  error: profileErr,
                  message: profileErr?.message,
                  stack: profileErr?.stack,
                  name: profileErr?.name,
                  userId: authData?.user?.id
                });
                // Não lançar erro - continuar com o fluxo
              }
            } else {
              console.warn("[AUTH PROVIDER] ⚠️ Usuário criado mas sem ID:", authData);
            }

            if (authData?.session) {
              setSession(authData.session);
              return { session: authData.session };
            }

            // Se não houver sessão (email confirmation necessário), criar sessão mock temporária
            if (authData?.user) {
              const tempSession: any = {
                access_token: `temp_${Math.random()}`,
                refresh_token: `temp_${Math.random()}`,
                user: authData.user,
              };
              setSession(tempSession);
              return { session: tempSession };
            }
          } catch (supabaseError: any) {
            console.error("[AUTH PROVIDER] Erro ao criar usuário no Supabase:", supabaseError);
            throw supabaseError;
          }
        }

        // Último fallback: modo mock apenas se não houver configuração
        const mockSession: any = {
          access_token: `mock_access_token_${Math.random()}`,
          refresh_token: `mock_refresh_token_${Math.random()}`,
          user: {
            id: `mock-user-id-${Math.random()}`,
            email: payload.email,
            app_metadata: { provider: "email" },
            user_metadata: {
              name: payload.name,
              role: payload.role ?? "partner",
              user_type: payload.role ?? "partner",
            },
          },
        };
        await supabase.auth.setSession(mockSession);
        setSession(mockSession);
        return { session: mockSession };
      },
      async verify2fa(code: string): Promise<void> {
        const result = (await sdk.auth.verify2fa({ code })) as Session;
        setSession(result);
        setChallenge(null);
        navigate("/dashboard");
      },
      logout() {
        setSession(null);
        navigate("/");
        setProfile(null);
      },
    }),
    [sdk, navigate, session, challenge, profile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }
  return value;
}
