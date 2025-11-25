// apps/backend/src/services/whatsapp/conversation-state.service.ts
// Serviço para gerenciar estado de conversas do WhatsApp

interface ConversationState {
  phone: string;
  state: "waiting_cadastro_response" | "first_interaction" | "normal";
  timestamp: number;
  userType?: "mei" | "autonomo" | "partner" | "admin";
}

class ConversationStateService {
  private states: Map<string, ConversationState> = new Map();
  private processingLocks: Map<string, boolean> = new Map(); // Lock para evitar processamento simultâneo
  private readonly TTL = 30 * 60 * 1000; // 30 minutos

  /**
   * Verifica se o usuário está aguardando resposta sobre cadastro
   */
  isWaitingCadastroResponse(phone: string): boolean {
    const state = this.states.get(phone);
    if (!state) return false;
    
    // Verificar se o estado expirou
    if (Date.now() - state.timestamp > this.TTL) {
      this.states.delete(phone);
      return false;
    }
    
    return state.state === "waiting_cadastro_response";
  }

  /**
   * Define que o usuário está aguardando resposta sobre cadastro
   */
  setWaitingCadastroResponse(phone: string): void {
    this.states.set(phone, {
      phone,
      state: "waiting_cadastro_response",
      timestamp: Date.now()
    });
  }

  /**
   * Limpa o estado de conversa (usuário respondeu ou cadastrou)
   */
  clearState(phone: string): void {
    this.states.delete(phone);
  }

  /**
   * Marca que é a primeira interação após cadastro
   */
  setFirstInteraction(phone: string, userType?: "mei" | "autonomo" | "partner" | "admin"): void {
    this.states.set(phone, {
      phone,
      state: "first_interaction",
      timestamp: Date.now(),
      userType
    });
  }

  /**
   * Verifica se é primeira interação após cadastro
   */
  isFirstInteraction(phone: string): boolean {
    const state = this.states.get(phone);
    if (!state) return false;
    
    // Verificar se o estado expirou
    if (Date.now() - state.timestamp > this.TTL) {
      this.states.delete(phone);
      return false;
    }
    
    return state.state === "first_interaction";
  }

  /**
   * Marca que primeira interação foi processada
   */
  markInteractionProcessed(phone: string): void {
    const state = this.states.get(phone);
    if (state && state.state === "first_interaction") {
      this.states.set(phone, {
        ...state,
        state: "normal"
      });
    }
    // Remover lock após processar
    this.processingLocks.delete(phone);
  }

  /**
   * Verifica se a primeira interação já foi processada (estado é "normal")
   */
  wasFirstInteractionProcessed(phone: string): boolean {
    const state = this.states.get(phone);
    if (!state) return false;
    
    // Se o estado é "normal", significa que já foi processado
    return state.state === "normal";
  }

  /**
   * Tenta adquirir lock para processar primeira interação (evita duplicação)
   * Retorna true se conseguiu adquirir o lock, false se já está sendo processado
   */
  tryAcquireFirstInteractionLock(phone: string): boolean {
    if (this.processingLocks.get(phone)) {
      return false; // Já está sendo processado
    }
    this.processingLocks.set(phone, true);
    return true;
  }

  /**
   * Libera o lock (caso não tenha sido liberado por markInteractionProcessed)
   */
  releaseLock(phone: string): void {
    this.processingLocks.delete(phone);
  }

  /**
   * Limpa estados expirados (chamado periodicamente)
   */
  cleanup(): void {
    const now = Date.now();
    for (const [phone, state] of this.states.entries()) {
      if (now - state.timestamp > this.TTL) {
        this.states.delete(phone);
      }
    }
  }
}

// Instância singleton
let instance: ConversationStateService | null = null;

export function getConversationStateService(): ConversationStateService {
  if (!instance) {
    instance = new ConversationStateService();
    // Limpar estados expirados a cada 10 minutos
    setInterval(() => instance?.cleanup(), 10 * 60 * 1000);
  }
  return instance;
}

