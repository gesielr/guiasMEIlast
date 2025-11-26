// apps/backend/src/services/ai/ai-agent.service.ts
// Serviço de IA para processar mensagens do WhatsApp usando OpenAI GPT

import OpenAI from "openai";
import { env } from "../../env";
import { createSupabaseClients } from "../../../services/supabase";
import { getSalarioMinimo, getTetoInss, getValorCertificadoMei, getValorAtivacaoAutonomo, getPorcentagemTaxaGps, getTaxaNfsePorNota, getPorcentagemComissaoParceiro } from "../system-config.service";

const { admin } = createSupabaseClients();

interface UserContext {
  userId?: string;
  nome?: string;
  userType?: "mei" | "autonomo" | "partner" | "admin";
  telefone?: string;
  onboardingCompleted?: boolean;
  document?: string; // Documento criptografado (para gerar PIX)
}

interface AIContext {
  user: UserContext | null;
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
}

class GuiasMEIAgent {
  private openai: OpenAI | null = null;
  private enabled: boolean = false;

  constructor() {
    const apiKey = (env.OPENAI_API_KEY || "").trim();

    if (apiKey.length > 0) {
      try {
        this.openai = new OpenAI({
          apiKey
        });
        this.enabled = true;
        console.log("[AI AGENT] OpenAI configurado com sucesso");
      } catch (error) {
        console.error("[AI AGENT] Erro ao inicializar OpenAI:", error);
        this.enabled = false;
      }
    } else {
      console.warn("[AI AGENT] OPENAI_API_KEY não configurada. IA desabilitada.");
    }
  }

  private async getSystemPrompt(userContext: UserContext | null): Promise<string> {
    const userType = userContext?.userType || "default";
    const userName = userContext?.nome || "usuário";
    
    // Buscar valores atualizados do banco
    const salarioMinimo = await getSalarioMinimo();
    const tetoInss = await getTetoInss();
    const valorSimplificado = (salarioMinimo * 0.11).toFixed(2);
    const valorCertificadoMei = await getValorCertificadoMei();
    const valorAtivacaoAutonomo = await getValorAtivacaoAutonomo();
    const porcentagemTaxaGps = await getPorcentagemTaxaGps();
    const taxaNfsePorNota = await getTaxaNfsePorNota();
    const porcentagemComissaoParceiro = await getPorcentagemComissaoParceiro();
    
    const basePrompt = `Você é a assistente virtual do GuiasMEI, uma plataforma especializada em gestão fiscal para Microempreendedores Individuais (MEI), autônomos e contabilidades.

⚠️ REGRAS CRÍTICAS - LEIA COM ATENÇÃO:

1. VOCÊ PODE FALAR APENAS SOBRE O APLICATIVO GUIASMEI
   - NÃO fale sobre outros assuntos que não sejam relacionados ao GuiasMEI
   - NÃO dê orientações sobre cadastro como MEI no Portal do Empreendedor
   - NÃO explique processos externos ao GuiasMEI
   - NÃO forneça informações sobre outros sistemas ou plataformas
   - Se o usuário perguntar sobre algo fora do GuiasMEI, redirecione para o aplicativo

2. SE O USUÁRIO PERGUNTAR SOBRE CADASTRO COMO MEI:
   - NÃO explique o processo do Portal do Empreendedor
   - NÃO liste passos de formalização MEI
   - Diga apenas: "Para se cadastrar no GuiasMEI, você precisa primeiro estar formalizado como MEI. Se já está formalizado, acesse nosso site para fazer o cadastro na plataforma."

3. SE O USUÁRIO PERGUNTAR SOBRE OUTROS ASSUNTOS:
   - Redirecione para o aplicativo GuiasMEI
   - Se for MEI: "Sou especializada apenas no aplicativo GuiasMEI. Posso ajudar com certificado digital e emissão de notas fiscais (NFS-e)."
   - Se for Autônomo: "Sou especializada apenas no aplicativo GuiasMEI. Posso ajudar com emissão de guias de GPS (INSS)."
   - Caso contrário: "Sou especializada apenas no aplicativo GuiasMEI. Posso ajudar com certificado digital, NFS-e, GPS e outros serviços da nossa plataforma."

SEU PAPEL:
- Atender usuários via WhatsApp de forma profissional, amigável e objetiva
- Fornecer informações precisas sobre os serviços do GuiasMEI conforme o tipo de usuário
- Orientar sobre processos e fluxos do GuiasMEI
- Responder em português brasileiro, de forma clara e direta
- SEMPRE redirecionar conversas para o aplicativo GuiasMEI
- IMPORTANTE: Ajustar respostas conforme o tipo de usuário (MEI vs Autônomo)

CONHECIMENTO ESPECÍFICO:

1. CERTIFICADO DIGITAL ICP-Brasil:
   - Custo: R$ ${valorCertificadoMei.toFixed(2)} (pagamento único via PIX)
   - Fluxo: Pagamento → Contato Certisign → Validação documentos → Ativação → Liberação NFS-e
   - Status: Pendente, Em Processo, Ativo, Expirado
   - Necessário para emissão de NFS-e

2. EMISSÃO DE NFS-e (Nota Fiscal de Serviço):
   - Disponível APENAS para MEI com certificado ativo
   - NÃO disponível para Autônomos
   - Taxa: R$ ${taxaNfsePorNota.toFixed(2)} por nota emitida
   - Requisitos: Certificado digital ativo + onboarding completo
   - Processo: Dados do tomador → Descrição serviço → Valor → Emissão

3. GUIA GPS (INSS) - SISTEMA SAL (Sistema de Acréscimos Legais):
   - Disponível APENAS para Autônomos
   - NÃO disponível para MEI
   - Taxa: ${porcentagemTaxaGps}% sobre o valor da guia
   
   CÓDIGOS GPS DISPONÍVEIS:
   - 1007: Contribuinte Individual - Mensal (20%) - Valor entre R$${salarioMinimo.toFixed(2)} e R$${tetoInss.toFixed(2)}
   - 1104: Contribuinte Individual - Trimestral (20%) - Valor entre R$${salarioMinimo.toFixed(2)} e R$${tetoInss.toFixed(2)}
   - 1120: Contribuinte Individual - Mensal (11%) - R$${valorSimplificado} fixo (R$${salarioMinimo.toFixed(2)} × 11%)
   - 1147: Contribuinte Individual - Trimestral (11%) - R$${valorSimplificado} fixo
   - 1163: Alternativo para 11% (consultar normativa)
   - 1406: Facultativo - Mensal
   - 1457: Facultativo - Trimestral
   - 1473: Facultativo - Mensal (11%)
   - 1503: Produtor Rural (20% sobre valor declarado)
   - 1295: Complementação (11% → 20%) - Incide juros SELIC se atrasado
   
   REGRAS IMPORTANTES:
   - Valor base NUNCA pode ser inferior ao salário mínimo (R$${salarioMinimo.toFixed(2)})
   - Retrocesso máximo: 6 meses (com cálculo de juros/multas)
   - Plano 11% (Simplificado): NÃO dá direito a aposentadoria por tempo
   - Plano 20% (Normal): Dá direito a TODOS os benefícios, incluindo aposentadoria por tempo
   - Vencimento mensal: dia 15 do mês seguinte
   - Vencimento trimestral: dia 15 do mês seguinte ao trimestre
   - Pagamentos atrasados: multa + juros SELIC
   - Salário mínimo atual: R$${salarioMinimo.toFixed(2)}
   - Teto INSS atual: R$${tetoInss.toFixed(2)}

4. FLUXOS DE USUÁRIO:
   - MEI: Cadastro → Pagamento R$${valorCertificadoMei.toFixed(2)} → Certificado → NFS-e (NOTA: MEI não usa GPS, apenas NFS-e)
   - Autônomo: Cadastro → Pagamento R$${valorAtivacaoAutonomo.toFixed(2)} → GPS (NOTA: Autônomo não usa NFS-e, apenas GPS)
   - Parceiro: Gestão de clientes, comissões (${porcentagemComissaoParceiro}% das taxas)

5. TAXAS E VALORES:
   - Certificado Digital MEI: R$ ${valorCertificadoMei.toFixed(2)} (único)
   - Ativação Autônomo: R$ ${valorAtivacaoAutonomo.toFixed(2)} (único por ano)
   - NFS-e: R$ ${taxaNfsePorNota.toFixed(2)}/nota
   - GPS: ${porcentagemTaxaGps}% do valor da guia
   - Comissão Parceiro: ${porcentagemComissaoParceiro}% das taxas dos clientes

REGRAS FUNDAMENTAIS - O QUE A IA PODE E NÃO PODE FAZER:

✅ A IA PODE:
- Orientar sobre processos e fluxos do GuiasMEI
- Calcular valores de GPS e taxas
- Explicar diferenças entre planos (11% vs 20%)
- Informar sobre prazos, vencimentos e normas do SAL
- Consultar histórico do usuário (notas/guias emitidas)
- Gerar relatórios de notas/guias por data
- Enviar PDFs de documentos já emitidos
- Responder perguntas sobre certificado digital
- Orientar sobre complementação INSS
- Explicar regras do sistema SAL

❌ A IA NÃO PODE:
- Falar sobre assuntos que não sejam relacionados ao aplicativo GuiasMEI
- Explicar processos de cadastro como MEI no Portal do Empreendedor
- Fornecer informações sobre outros sistemas ou plataformas
- Orientar sobre processos externos ao GuiasMEI
- Emitir documentos sem confirmação explícita do usuário
- Processar pagamentos sem validação
- Acessar dados de outros usuários
- Modificar valores de guias/documentos já emitidos
- Inventar informações não verificadas
- Prometer funcionalidades não implementadas
- Armazenar senhas ou dados bancários
- Fazer alterações em cadastros sem confirmação
- Criar valores, datas ou dados fictícios

INSTRUÇÕES DE RESPOSTA:
- Seja conciso e direto (mensagens WhatsApp)
- Use formatação Markdown quando apropriado (*negrito*, listas)
- Se o usuário perguntar sobre algo fora do GuiasMEI, redirecione: "Sou especializada apenas no aplicativo GuiasMEI. Posso ajudar com certificado digital, NFS-e, GPS e outros serviços da nossa plataforma."
- Se perguntarem sobre cadastro como MEI, diga: "Para se cadastrar no GuiasMEI, você precisa primeiro estar formalizado como MEI. Se já está formalizado, acesse nosso site para fazer o cadastro na plataforma."
- Se não souber algo sobre o GuiasMEI, diga: "Não tenho essa informação no momento. Posso consultar para você?"
- SEMPRE valide dados antes de executar ações
- Peça confirmação antes de emitir documentos ou processar pagamentos
- Mantenha tom profissional mas amigável
- Evite respostas muito longas (máximo 300 palavras)
- NUNCA invente informações - sempre baseie em dados reais do sistema
- NUNCA fale sobre assuntos fora do aplicativo GuiasMEI`;

    const userSpecificPrompt = this.getUserSpecificPrompt(userType, userName);
    
    return `${basePrompt}\n\n${userSpecificPrompt}`;
  }

  private getUserSpecificPrompt(userType: string, userName: string): string {
    switch (userType) {
      case "mei":
        return `USUÁRIO ATUAL: ${userName} (MEI - Microempreendedor Individual)

⚠️ RESTRIÇÕES IMPORTANTES PARA MEI:
- Você NÃO deve falar sobre guias GPS (INSS) para usuários MEI
- Você NÃO deve mencionar "guias" ou "GPS" em nenhuma resposta
- Você DEVE focar APENAS em notas fiscais (NFS-e)

FUNCIONALIDADES DISPONÍVEIS PARA MEI:
✅ Emitir nota fiscal (NFS-e)
✅ Cancelar nota fiscal
✅ Ver notas canceladas
✅ Ver notas emitidas
✅ Reimprimir nota fiscal

COMANDOS QUE O MEI PODE USAR:
- "Emitir nota" ou "Quero emitir uma nota fiscal"
- "Cancelar nota" ou "Quero cancelar uma nota"
- "Ver minhas notas" ou "Notas emitidas"
- "Notas canceladas"
- "Ver nota [número]" ou "Reimprimir nota [número]"
- "PDF nota [número]"

O QUE NÃO FAZER:
❌ NÃO mencionar guias GPS
❌ NÃO falar sobre emissão de guias INSS
❌ NÃO oferecer serviços de GPS
❌ NÃO explicar sobre guias de contribuição`;
      
      case "autonomo":
        return `USUÁRIO ATUAL: ${userName} (Autônomo - Contribuinte Individual)

⚠️ RESTRIÇÕES IMPORTANTES PARA AUTÔNOMO:
- Você NÃO deve falar sobre notas fiscais (NFS-e) para usuários Autônomos
- Você NÃO deve mencionar "notas fiscais" ou "NFS-e" em nenhuma resposta
- Você DEVE focar APENAS em guias GPS (INSS)

FUNCIONALIDADES DISPONÍVEIS PARA AUTÔNOMO:
✅ Emitir guias de INSS (GPS)
✅ Ver guias de INSS emitidas
✅ Reimprimir guias (se passar do vencimento, a reimpressão deve vir com os juros)

COMANDOS QUE O AUTÔNOMO PODE USAR:
- "Emitir GPS" ou "Emitir guia de INSS"
- "Ver minhas guias" ou "Guias de INSS emitidas"
- "Ver guia [número]" ou "Reimprimir guia [número]"
- "PDF guia [número]"

IMPORTANTE SOBRE REIMPRESSÃO:
- Se a guia passou do vencimento, a reimpressão deve incluir cálculo de juros e multas (Sistema SAL)
- Sempre informar o valor atualizado com acréscimos legais quando houver

O QUE NÃO FAZER:
❌ NÃO mencionar notas fiscais
❌ NÃO falar sobre emissão de NFS-e
❌ NÃO oferecer serviços de certificado digital para emissão de notas
❌ NÃO explicar sobre notas fiscais de serviço`;
      
      case "partner":
        return `USUÁRIO ATUAL: ${userName} (Parceiro - Contabilidade)
FUNCIONALIDADES DISPONÍVEIS: Gestão de clientes, comissões, relatórios
FOCO: Acompanhamento de clientes e comissões`;
      
      default:
        return `USUÁRIO ATUAL: ${userName}
FUNCIONALIDADES: Informações gerais sobre o GuiasMEI`;
    }
  }

  async processarMensagem(
    mensagem: string,
    context: AIContext
  ): Promise<string> {
    // Se IA não está habilitada, retornar resposta padrão
    if (!this.enabled || !this.openai) {
      return this.getRespostaPadrao(mensagem, context.user);
    }

    try {
      const systemPrompt = await this.getSystemPrompt(context.user);
      
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: systemPrompt
        }
      ];

      // Adicionar histórico de conversa se disponível
      if (context.conversationHistory && context.conversationHistory.length > 0) {
        // Adicionar apenas últimas 5 mensagens para não exceder tokens
        const recentHistory = context.conversationHistory.slice(-5);
        for (const msg of recentHistory) {
          messages.push({
            role: msg.role,
            content: msg.content
          });
        }
      }

      // Adicionar mensagem atual do usuário
      messages.push({
        role: "user",
        content: mensagem
      });

      const completion = await this.openai.chat.completions.create({
        model: env.OPENAI_MODEL || "gpt-4o",
        messages,
        temperature: 0.3,
        max_tokens: 500 // Limitar resposta para WhatsApp
      });

      const resposta = completion.choices[0]?.message?.content || this.getRespostaPadrao(mensagem, context.user);
      
      return resposta.trim();
    } catch (error) {
      console.error("[AI AGENT] Erro ao processar mensagem com IA:", error);
      return this.getRespostaPadrao(mensagem, context.user);
    }
  }

  private getRespostaPadrao(mensagem: string, userContext: UserContext | null): string {
    const normalized = mensagem.toLowerCase().trim();
    
    // Respostas padrão baseadas em palavras-chave (fallback quando IA não disponível)
    if (normalized.includes("certificado") && (normalized.includes("status") || normalized.includes("como"))) {
      return `*Status do Certificado Digital*

1. Gere o pagamento PIX de R$150 no painel ou solicite o link por aqui.
2. Assim que o pagamento for confirmado enviaremos o agendamento com a Certisign.
3. Quando o certificado estiver ativo você recebe uma notificação automática.

Deseja que eu gere o QR Code novamente?`;
    }
    
    if (normalized.includes("pagar") || normalized.includes("pix") || normalized.includes("pagamento")) {
      return `*Pagamento do Certificado*

Enviei um novo QR Code PIX de R$150 para você completar o processo.
Depois do pagamento é só acompanhar por aqui. Qualquer dúvida é só responder.`;
    }
    
    if (normalized.includes("ajuda") || normalized.includes("suporte") || normalized.includes("help")) {
      return `*Equipe GuiasMEI*

Estou aqui para ajudar com certificado digital, NFS-e e INSS.

Para falar com um especialista humano basta responder "humano" que encaminhamos o atendimento.`;
    }
    
    // Resposta padrão genérica
    return `*Fluxo do Certificado GuiasMEI*

1. Gere o pagamento PIX de R$150.
2. Aguarde o contato da Certisign para validar seus documentos.
3. Assim que estiver ativo liberamos a emissão de NFS-e.

Precisa refazer alguma etapa? Só me contar.`;
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

// Instância singleton
let instance: GuiasMEIAgent | null = null;

export function getAIAgent(): GuiasMEIAgent {
  if (!instance) {
    instance = new GuiasMEIAgent();
  }
  return instance;
}

// Função auxiliar para buscar perfil do usuário pelo telefone
export async function buscarPerfilPorTelefone(telefone: string): Promise<UserContext | null> {
  try {
    // Normalizar telefone para sempre ter 13 dígitos (55 + 11 dígitos)
    let telefoneNormalizado = telefone.replace(/\D+/g, "");
    
    // Se já começa com 55, remover para normalizar
    if (telefoneNormalizado.startsWith("55")) {
      telefoneNormalizado = telefoneNormalizado.substring(2); // Remove o 55
    }
    
    // O WhatsApp pode enviar telefones com 10 ou 11 dígitos (sem o 55)
    // Se tiver 10 dígitos, pode ser um número que está faltando o primeiro dígito do DDD ou número
    // Se tiver 11 dígitos, está correto (2 DDD + 9 número)
    // Se tiver mais de 11, pegar os últimos 11
    if (telefoneNormalizado.length < 10) {
      console.warn(`[AI AGENT] Telefone do WhatsApp com menos de 10 dígitos: ${telefoneNormalizado.length}`);
      return null;
    }
    
    // Se tiver 10 dígitos, pode ser que o primeiro dígito do DDD ou do número está faltando
    // Vamos tentar adicionar um zero no início ou usar como está
    if (telefoneNormalizado.length === 10) {
      console.warn(`[AI AGENT] Telefone do WhatsApp com 10 dígitos (esperado 11), tentando normalizar: ${telefoneNormalizado}`);
      // Tentar adicionar um zero no início (caso comum: DDD sem o primeiro dígito)
      // Mas isso pode ser arriscado, então vamos usar os 10 dígitos e buscar também com 11
      // Na verdade, vamos usar os 10 dígitos como estão e fazer a busca mais flexível
    }
    
    if (telefoneNormalizado.length > 11) {
      console.warn(`[AI AGENT] Telefone do WhatsApp com mais de 11 dígitos, usando últimos 11: ${telefoneNormalizado}`);
      telefoneNormalizado = telefoneNormalizado.slice(-11); // Pega os últimos 11 dígitos
    }
    
    // Se tiver exatamente 10 dígitos, vamos tentar buscar tanto com 10 quanto com 11
    // Mas para normalizar, vamos usar os 10 dígitos como estão (sem adicionar dígito)
    // Sempre usar formato 55 + dígitos = 13 ou 12 dígitos
    const telefoneComPrefixo = `55${telefoneNormalizado}`;

    console.log("[AI AGENT] Buscando perfil por telefone:", {
      telefoneOriginal: telefone,
      telefoneNormalizado,
      telefoneComPrefixo
    });

    // Buscar no banco usando o formato normalizado
    // telefoneComPrefixo está no formato 55XXXXXXXXXXX (12 ou 13 dígitos)
    // telefoneNormalizado está no formato XXXXXXXXXX ou XXXXXXXXXXX (10 ou 11 dígitos)
    // Buscar também com variações possíveis
    let telefoneVariacoes = [telefoneComPrefixo, telefoneNormalizado];
    
    // Se tiver 10 dígitos, tentar também com 11 (adicionando zero no início)
    if (telefoneNormalizado.length === 10) {
      telefoneVariacoes.push(`550${telefoneNormalizado}`); // 55 + 0 + 10 dígitos
      telefoneVariacoes.push(`0${telefoneNormalizado}`); // 0 + 10 dígitos
    }
    
    // Se tiver 11 dígitos, tentar também com 10 (removendo primeiro dígito)
    if (telefoneNormalizado.length === 11) {
      telefoneVariacoes.push(`55${telefoneNormalizado.slice(1)}`); // 55 + últimos 10 dígitos
      telefoneVariacoes.push(telefoneNormalizado.slice(1)); // últimos 10 dígitos
    }
    
    // Remover duplicatas
    telefoneVariacoes = [...new Set(telefoneVariacoes)];
    
    console.log("[AI AGENT] Buscando no banco com variações:", telefoneVariacoes);
    
    let { data, error } = await admin
      .from("profiles")
      .select("id, name, whatsapp_phone, user_type, onboarding_completed, document")
      .in("whatsapp_phone", telefoneVariacoes)
      .maybeSingle();

    // Se não encontrou, tentar buscar usando os últimos 10 dígitos (mais tolerante)
    // Isso ajuda quando o WhatsApp envia o número sem o 9 do celular (10 dígitos) 
    // mas o banco tem o número completo (11 dígitos)
    if (!data && !error) {
      const ultimos10Digitos = telefoneNormalizado.length >= 10 
        ? telefoneNormalizado.slice(-10) 
        : telefoneNormalizado;
      
      console.log("[AI AGENT] Tentando buscar com últimos 10 dígitos:", {
        ultimos10Digitos,
        telefoneNormalizado,
        telefoneComPrefixo
      });
      
      // Buscar todos os perfis com telefone
      const { data: profilesData } = await admin
        .from("profiles")
        .select("id, name, whatsapp_phone, user_type, onboarding_completed, document")
        .not("whatsapp_phone", "is", null);
      
      if (profilesData) {
        // Filtrar manualmente para encontrar matches nos últimos dígitos
        const matchingProfile = profilesData.find((profile: any) => {
          if (!profile.whatsapp_phone) return false;
          const phoneDigits = profile.whatsapp_phone.replace(/\D+/g, "");
          
          // Remover o 55 se existir
          let phoneDigitsSem55 = phoneDigits.startsWith("55") 
            ? phoneDigits.substring(2) 
            : phoneDigits;
          
          // Comparar últimos 10 dígitos
          const phoneLast10 = phoneDigitsSem55.length >= 10 
            ? phoneDigitsSem55.slice(-10) 
            : phoneDigitsSem55;
          
          // Comparar últimos 9 dígitos (sem DDD e sem o 9 do celular)
          const phoneLast9 = phoneDigitsSem55.length >= 9 
            ? phoneDigitsSem55.slice(-9) 
            : phoneDigitsSem55;
          const ultimos9Digitos = telefoneNormalizado.length >= 9 
            ? telefoneNormalizado.slice(-9) 
            : telefoneNormalizado;
          
          // Se o telefone do banco tem 11 dígitos e o WhatsApp tem 10, tentar remover o 9 do meio
          // Formato: 48XXXXXXXXX (11 dígitos) -> remover o 9 do meio -> 4891589495 (10 dígitos)
          // WhatsApp: 4891589495 (10 dígitos)
          let phoneDigitsSem55Sem9 = phoneDigitsSem55;
          if (phoneDigitsSem55.length === 11 && telefoneNormalizado.length === 10) {
            // Tentar remover o 9 após o DDD (posição 2)
            // 48991589495 -> 4891589495 (remover o 9 na posição 2)
            phoneDigitsSem55Sem9 = phoneDigitsSem55.substring(0, 2) + phoneDigitsSem55.substring(3);
          }
          
          // Se o WhatsApp tem 10 dígitos e o banco tem 11, tentar adicionar o 9 no meio
          // WhatsApp: 4891589495 (10 dígitos) -> adicionar 9 após DDD -> 48991589495 (11 dígitos)
          let telefoneNormalizadoCom9 = telefoneNormalizado;
          if (telefoneNormalizado.length === 10 && phoneDigitsSem55.length === 11) {
            // Adicionar 9 após o DDD (posição 2)
            // 4891589495 -> 48991589495 (adicionar 9 na posição 2)
            telefoneNormalizadoCom9 = telefoneNormalizado.substring(0, 2) + "9" + telefoneNormalizado.substring(2);
          }
          
          const matches = 
            phoneDigits === telefoneComPrefixo ||                    // Exato com 55
            phoneDigits === telefoneNormalizado ||                    // Exato sem 55
            phoneDigitsSem55 === telefoneNormalizado ||              // Sem 55 comparado com sem 55
            phoneDigitsSem55Sem9 === telefoneNormalizado ||          // Banco sem 9 === WhatsApp sem 9
            phoneDigitsSem55 === telefoneNormalizadoCom9 ||          // Banco com 9 === WhatsApp com 9 adicionado
            phoneLast10 === ultimos10Digitos ||                      // Últimos 10 dígitos
            phoneLast9 === ultimos9Digitos;                          // Últimos 9 dígitos (mais tolerante)
          
          if (matches) {
            console.log("[AI AGENT] ✅ Match encontrado na busca por últimos dígitos:", {
              profilePhone: profile.whatsapp_phone,
              phoneDigits,
              phoneDigitsSem55,
              phoneLast10,
              phoneLast9,
              ultimos10Digitos,
              ultimos9Digitos,
              matchType: phoneLast10 === ultimos10Digitos ? "last10" : 
                        phoneLast9 === ultimos9Digitos ? "last9" : "exact"
            });
          }
          
          return matches;
        });
        
        if (matchingProfile) {
          console.log("[AI AGENT] ✅ Perfil encontrado usando busca por últimos dígitos!");
          data = matchingProfile;
        } else {
          console.log("[AI AGENT] ❌ Nenhum perfil encontrado mesmo com busca por últimos dígitos");
        }
      }
    }

    if (error) {
      console.error("[AI AGENT] Erro ao buscar perfil:", error);
      // Se o erro for de coluna não existir, tentar verificar se a coluna existe
      if (error.code === '42703' || error.message?.includes('does not exist')) {
        console.error("[AI AGENT] ERRO CRÍTICO: Coluna whatsapp_phone não existe no banco! Execute a migration.");
      }
      return null;
    }

    console.log("[AI AGENT] Resultado da busca:", {
      encontrouPerfil: !!data,
      userId: data?.id,
      whatsapp_phone_salvo: data?.whatsapp_phone,
      telefoneBuscado: telefoneComPrefixo,
      telefoneBuscado2: telefoneNormalizado,
      query_usada: `whatsapp_phone.eq.${telefoneComPrefixo} OR whatsapp_phone.eq.${telefoneNormalizado}`
    });

    // Se não encontrou perfil, tentar buscar em auth.users e criar automaticamente
    if (!data) {
      console.log("[AI AGENT] Nenhum perfil encontrado. Tentando buscar em auth.users e criar perfil...");
      
      try {
        // Buscar usuários em auth.users pelo telefone no metadata
        const { data: users, error: usersError } = await admin.auth.admin.listUsers();
        
        console.log("[AI AGENT] Busca em auth.users:", {
          totalUsuarios: users?.users?.length || 0,
          error: usersError?.message,
          telefoneBuscado: telefoneComPrefixo
        });
        
        if (!usersError && users?.users) {
          // Log dos primeiros 3 usuários para debug
          if (users.users.length > 0) {
            console.log("[AI AGENT] Primeiros usuários encontrados:", users.users.slice(0, 3).map((u: any) => ({
              id: u.id,
              email: u.email,
              phone_metadata: u.user_metadata?.phone || u.raw_user_meta_data?.phone,
              user_type: u.user_metadata?.user_type || u.raw_user_meta_data?.user_type
            })));
          }
          
          // Buscar usuário com telefone correspondente
          // telefoneComPrefixo já está no formato 55 + 11 dígitos (13 dígitos)
          const telefoneBuscadoSem55 = telefoneComPrefixo.replace(/^55/, ""); // 11 dígitos
          const telefoneBuscadoCom55 = telefoneComPrefixo; // 13 dígitos (já está normalizado)
          
          const userFound = users.users.find((u: any) => {
            const userPhone = u.user_metadata?.phone || u.raw_user_meta_data?.phone;
            if (!userPhone) return false;
            
            // Normalizar telefone do usuário para formato 13 dígitos (55 + 11 dígitos)
            let userPhoneDigits = userPhone.replace(/\D+/g, "");
            
            // Se já começa com 55, remover para normalizar
            if (userPhoneDigits.startsWith("55")) {
              userPhoneDigits = userPhoneDigits.substring(2); // Remove o 55
            }
            
            // Garantir que temos exatamente 11 dígitos
            if (userPhoneDigits.length < 11) {
              return false; // Número inválido, não faz match
            }
            
            if (userPhoneDigits.length > 11) {
              userPhoneDigits = userPhoneDigits.slice(-11); // Pega os últimos 11 dígitos
            }
            
            // Sempre usar formato 55 + 11 dígitos = 13 dígitos
            const userPhoneWith55 = `55${userPhoneDigits}`; // 13 dígitos
            const userPhoneSem55 = userPhoneDigits; // 11 dígitos
            
            // Comparar apenas no formato normalizado (13 dígitos com 55)
            // Ambos devem estar no formato 55 + 11 dígitos
            // userPhoneDigits e telefoneBuscadoSem55 já são os 11 dígitos (DDD + número)
            const matches = 
              userPhoneWith55 === telefoneBuscadoCom55 ||  // Ambos com 55 (13 dígitos) - EXATO
              userPhoneSem55 === telefoneBuscadoSem55;     // Ambos sem 55 (11 dígitos) - EXATO
            
            if (matches) {
              console.log("[AI AGENT] ✅ MATCH encontrado!", {
                userId: u.id,
                email: u.email,
                phoneOriginal: userPhone,
                phoneDigits: userPhoneDigits,
                phoneWith55: userPhoneWith55,
                phoneSem55: userPhoneSem55,
                telefoneBuscado: telefoneComPrefixo,
                telefoneBuscadoSem55: telefoneBuscadoSem55,
                telefoneBuscadoCom55: telefoneBuscadoCom55,
                matchType: userPhoneWith55 === telefoneBuscadoCom55 ? "with55_13digits" : "without55_11digits"
              });
            } else {
              // Log detalhado quando não encontra match para debug
              console.log("[AI AGENT] ❌ Match não encontrado - comparando:", {
                phoneOriginal: userPhone,
                phoneDigits: userPhoneDigits,
                phoneWith55: userPhoneWith55,
                phoneSem55: userPhoneSem55,
                telefoneBuscado: telefoneComPrefixo,
                telefoneBuscadoSem55: telefoneBuscadoSem55,
                telefoneBuscadoCom55: telefoneBuscadoCom55,
                comparacoes: {
                  with55: userPhoneWith55 === telefoneBuscadoCom55,
                  without55: userPhoneSem55 === telefoneBuscadoSem55
                }
              });
            }
            
            return matches;
          });

          if (userFound) {
            console.log("[AI AGENT] ✅ Usuário encontrado em auth.users, criando perfil automaticamente:", {
              userId: userFound.id,
              email: userFound.email,
              phone: userFound.user_metadata?.phone || userFound.raw_user_meta_data?.phone,
              telefoneBuscado: telefoneComPrefixo
            });

            // Normalizar telefone - usar o telefone buscado (que veio do WhatsApp) como fonte confiável
            // O telefone do metadata pode estar em formato diferente
            const phoneFromMeta = userFound.user_metadata?.phone || userFound.raw_user_meta_data?.phone;
            const phoneDigits = phoneFromMeta ? phoneFromMeta.replace(/\D+/g, "") : "";
            
            // Preferir usar o telefone buscado (do WhatsApp) que é mais confiável
            // Mas garantir que está no formato 55XXXXXXXXXXX
            const normalizedPhone = telefoneComPrefixo; // Usar o telefone que veio do WhatsApp

            // Criar perfil usando o service
            // IMPORTANTE: Usar o telefone que veio do WhatsApp (telefoneComPrefixo) como fonte confiável
            // O telefone do metadata pode estar em formato diferente (sem 55)
            const { upsertProfile } = await import("../../../services/profile-service");
            await upsertProfile(admin, {
              id: userFound.id,
              name: userFound.user_metadata?.name || userFound.raw_user_meta_data?.name || userFound.email?.split("@")[0] || "Usuário",
              email: userFound.email || "",
              phone: telefoneComPrefixo, // Usar telefone do WhatsApp (já está normalizado com 55)
              document: null,
              businessName: null,
              userType: userFound.user_metadata?.user_type || userFound.raw_user_meta_data?.user_type || userFound.user_metadata?.role || "common"
              // ✅ REMOVIDO: partnerId não existe na tabela profiles
            });
            
            console.log("[AI AGENT] Perfil criado/atualizado com telefone normalizado:", {
              userId: userFound.id,
              telefoneUsado: telefoneComPrefixo,
              telefoneOriginalMetadata: phoneFromMeta
            });

            // Buscar o perfil recém-criado
            const { data: newProfile } = await admin
              .from("profiles")
              .select("id, name, whatsapp_phone, user_type, onboarding_completed, document")
              .eq("id", userFound.id)
              .single();

            if (newProfile) {
              console.log("[AI AGENT] ✅ Perfil criado automaticamente com sucesso!");
              return {
                userId: newProfile.id,
                nome: newProfile.name || undefined,
                userType: newProfile.user_type as "mei" | "autonomo" | "partner" | "admin" | undefined,
                telefone: newProfile.whatsapp_phone || undefined,
                onboardingCompleted: newProfile.onboarding_completed || false,
                document: newProfile.document || undefined
              };
            }
          }
        }
      } catch (autoCreateError: any) {
        console.error("[AI AGENT] Erro ao tentar criar perfil automaticamente:", autoCreateError);
      }

      console.log("[AI AGENT] Nenhum perfil encontrado para o telefone:", telefoneComPrefixo);
      return null;
    }

    // ✅ NOVO: Se usuário tem cadastro duplo (MEI + Autônomo), usar nome do autônomo
    // Buscar se tem emissões de ambos os tipos
    let nomeFinal = data.name || undefined;
    
    try {
      const { isDualUser } = await import("../whatsapp/dual-menu.service");
      const isDual = await isDualUser(data.id, data.user_type);
      
      if (isDual) {
        // ✅ SEMPRE usar nome do autônomo (CPF) quando há cadastro duplo
        // Buscar perfil autônomo pelo mesmo telefone
        const { data: autonomoProfile } = await admin
          .from('profiles')
          .select('name, user_type')
          .eq('whatsapp_phone', data.whatsapp_phone)
          .eq('user_type', 'autonomo')
          .maybeSingle();
        
        if (autonomoProfile?.name) {
          nomeFinal = autonomoProfile.name;
          console.log("[AI AGENT] Usuário duplo detectado - usando nome do autônomo (CPF):", {
            userId: data.id,
            userTypeAtual: data.user_type,
            nomeOriginal: data.name,
            nomeAutonomo: nomeFinal
          });
        } else {
          // Se não encontrou perfil autônomo separado, mas é duplo, manter nome atual se já for autônomo
          if (data.user_type === 'autonomo') {
            nomeFinal = data.name; // Já é autônomo, manter nome
          }
        }
      }
    } catch (error) {
      console.warn("[AI AGENT] Erro ao verificar usuário duplo para nome:", error);
    }
    
    return {
      userId: data.id,
      nome: nomeFinal,
      userType: data.user_type as "mei" | "autonomo" | "partner" | "admin" | undefined,
      telefone: data.whatsapp_phone || undefined,
      onboardingCompleted: data.onboarding_completed || false,
      document: data.document || undefined
    };
  } catch (error) {
    console.error("[AI AGENT] Erro ao buscar perfil por telefone:", error);
    return null;
  }
}
