// apps/backend/src/services/whatsapp/report-service.ts
// Serviço para buscar e formatar relatórios de NFS-e e GPS para WhatsApp

import { createSupabaseClients } from "../../../services/supabase";

const { admin } = createSupabaseClients();

interface NfseEmission {
  id: string;
  protocolo?: string;
  nfse_key?: string;
  valor?: number;
  valores?: any; // JSONB que pode conter o valor
  created_at: string;
  tomador?: any;
  status?: string;
  pdf_url?: string;
  pdf_storage_path?: string; // Caminho no Supabase Storage
}

interface GpsEmission {
  id: string;
  competencia?: string;
  month_ref?: string;
  valor?: number;
  created_at: string;
  inss_code?: string;
  status?: string;
  pdf_url?: string;
}

interface DateFilter {
  startDate?: Date;
  endDate?: Date;
  month?: string; // "01/2025"
  tomadorDocumento?: string; // CPF ou CNPJ do tomador
}

/**
 * Busca notas fiscais do usuário com filtro opcional por data
 */
export async function buscarNotasFiscais(
  userId: string,
  filter?: DateFilter
): Promise<NfseEmission[]> {
  try {
    let query = admin
      .from("nfse_emissions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    // Aplicar filtros de data se fornecidos
    if (filter?.startDate) {
      query = query.gte("created_at", filter.startDate.toISOString());
    }
    if (filter?.endDate) {
      query = query.lte("created_at", filter.endDate.toISOString());
    }
    if (filter?.month) {
      // Formato: "01/2025" -> primeiro e último dia do mês
      const [month, year] = filter.month.split("/");
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      query = query.gte("created_at", startDate.toISOString());
      query = query.lte("created_at", endDate.toISOString());
    }
    // ✅ NOVO: Filtro por CNPJ/CPF do tomador
    if (filter?.tomadorDocumento) {
      // Buscar no campo JSONB tomador->documento
      query = query.contains("tomador", { documento: filter.tomadorDocumento });
    }

    const { data, error } = await query;

    if (error) {
      console.error("[REPORT SERVICE] Erro ao buscar notas fiscais:", error);
      return [];
    }

    return (data || []) as NfseEmission[];
  } catch (error) {
    console.error("[REPORT SERVICE] Erro ao buscar notas fiscais:", error);
    return [];
  }
}

/**
 * Busca notas fiscais canceladas do usuário com filtro opcional por data
 */
export async function buscarNotasFiscaisCanceladas(
  userId: string,
  filter?: DateFilter
): Promise<NfseEmission[]> {
  try {
    let query = admin
      .from("nfse_emissions")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "CANCELADA")
      .order("created_at", { ascending: false });

    // Aplicar filtros de data se fornecidos
    if (filter?.startDate) {
      query = query.gte("created_at", filter.startDate.toISOString());
    }
    if (filter?.endDate) {
      query = query.lte("created_at", filter.endDate.toISOString());
    }
    if (filter?.month) {
      // Formato: "01/2025" -> primeiro e último dia do mês
      const [month, year] = filter.month.split("/");
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      query = query.gte("created_at", startDate.toISOString());
      query = query.lte("created_at", endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error("[REPORT SERVICE] Erro ao buscar notas fiscais canceladas:", error);
      return [];
    }

    return (data || []) as NfseEmission[];
  } catch (error) {
    console.error("[REPORT SERVICE] Erro ao buscar notas fiscais canceladas:", error);
    return [];
  }
}

/**
 * Busca guias GPS do usuário com filtro opcional por data
 */
export async function buscarGuiasGPS(
  userId: string,
  filter?: DateFilter
): Promise<GpsEmission[]> {
  try {
    let query = admin
      .from("gps_emissions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    // Aplicar filtros de data se fornecidos
    if (filter?.startDate) {
      query = query.gte("created_at", filter.startDate.toISOString());
    }
    if (filter?.endDate) {
      query = query.lte("created_at", filter.endDate.toISOString());
    }
    if (filter?.month) {
      // Formato: "01/2025" -> primeiro e último dia do mês
      const [month, year] = filter.month.split("/");
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      query = query.gte("created_at", startDate.toISOString());
      query = query.lte("created_at", endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error("[REPORT SERVICE] Erro ao buscar guias GPS:", error);
      return [];
    }

    return (data || []) as GpsEmission[];
  } catch (error) {
    console.error("[REPORT SERVICE] Erro ao buscar guias GPS:", error);
    return [];
  }
}

/**
 * Busca uma nota fiscal específica por número ou ID
 */
export async function buscarNotaEspecifica(
  userId: string,
  numeroNota: string
): Promise<NfseEmission | null> {
  try {
    // A tabela nfse_emissions não possui campo numero_nota dedicado.
    // Tentar buscar pelos identificadores existentes: nfse_key, protocolo, nfse_number ou id.
    // ⚠️ IMPORTANTE: valores usados em filtros OR precisam estar codificados para lidar com caracteres especiais (/, :, etc)
    const trimmedValue = numeroNota?.trim();

    if (!trimmedValue) {
      return null;
    }

    const encodedValue = encodeURIComponent(trimmedValue);
    const orFilter = [
      `nfse_key.eq.${encodedValue}`,
      `protocolo.eq.${encodedValue}`,
      `nfse_number.eq.${encodedValue}`,
      `id.eq.${encodedValue}`
    ].join(",");

    let { data, error } = await admin
      .from("nfse_emissions")
      .select("*")
      .eq("user_id", userId)
      .or(orFilter)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      console.error("[REPORT SERVICE] Erro ao buscar nota específica:", error);
      return null;
    }

    if (data) {
      return data as NfseEmission;
    }

    return null;
  } catch (error) {
    console.error("[REPORT SERVICE] Erro ao buscar nota específica:", error);
    return null;
  }
}

/**
 * Busca uma guia GPS específica por ID ou número
 */
export async function buscarGuiaEspecifica(
  userId: string,
  numeroGuia: string
): Promise<GpsEmission | null> {
  try {
    const { data, error } = await admin
      .from("gps_emissions")
      .select("*")
      .eq("user_id", userId)
      .eq("id", numeroGuia)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      console.error("[REPORT SERVICE] Erro ao buscar guia específica:", error);
      return null;
    }

    return (data || null) as GpsEmission | null;
  } catch (error) {
    console.error("[REPORT SERVICE] Erro ao buscar guia específica:", error);
    return null;
  }
}

/**
 * Formata relatório de notas fiscais para WhatsApp
 */
export function formatarRelatorioNotas(
  notas: NfseEmission[],
  periodo?: string
): string {
  if (notas.length === 0) {
    return `*Relatório de NFS-e*

📅 ${periodo || "Período completo"}

Nenhuma nota fiscal encontrada.

Para emitir uma nova nota, digite "Emitir nota"`;
  }

  // Extrair valor de diferentes formatos possíveis
  const getValor = (nota: NfseEmission): number => {
    if (nota.valor) return nota.valor;
    if (nota.valores?.valor) return parseFloat(nota.valores.valor) || 0;
    if (nota.valores?.valorServico) return parseFloat(nota.valores.valorServico) || 0;
    return 0;
  };

  const total = notas.reduce((sum, nota) => sum + getValor(nota), 0);
  const notasEmitidas = notas.filter((n) => n.status === "issued" || n.status === "AUTORIZADA").length;

  let relatorio = `*Relatório de NFS-e Emitidas*\n\n`;
  relatorio += `📅 ${periodo || "Período completo"}\n\n`;

  notas.forEach((nota, index) => {
    // A tabela não tem numero_nota, usar nfse_key, protocolo ou índice
    const numero = nota.nfse_key?.slice(-8) || nota.protocolo?.slice(-8) || `#${String(index + 1).padStart(3, "0")}`;
    const data = new Date(nota.created_at).toLocaleDateString("pt-BR");
    const valor = getValor(nota).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
    const tomadorNome = nota.tomador?.nome || nota.tomador?.razaoSocial || "N/A";
    const status = nota.status === "issued" || nota.status === "AUTORIZADA" ? "✅ Emitida" : "⏳ Pendente";

    relatorio += `📄 Nota ${numero}\n`;
    relatorio += `   Data: ${data}\n`;
    relatorio += `   Valor: ${valor}\n`;
    relatorio += `   Tomador: ${tomadorNome}\n`;
    relatorio += `   Status: ${status}\n\n`;
  });

  relatorio += `Total: ${notasEmitidas} notas | ${total.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  })}\n\n`;
  relatorio += `Para ver o PDF de uma nota específica, digite:\n`;
  relatorio += `"Ver nota [número]" ou "PDF nota [número]"`;

  return relatorio;
}

/**
 * Formata relatório de notas fiscais canceladas para WhatsApp
 */
export function formatarRelatorioNotasCanceladas(notas: NfseEmission[], periodo?: string): string {
  if (notas.length === 0) {
    return `*Relatório de NFS-e Canceladas*

📅 ${periodo || "Período completo"}

Nenhuma nota fiscal cancelada encontrada.`;
  }

  // Extrair valor de diferentes formatos possíveis
  const getValor = (nota: NfseEmission): number => {
    if (nota.valor) return nota.valor;
    if (nota.valores?.valor) return parseFloat(nota.valores.valor) || 0;
    if (nota.valores?.valorServico) return parseFloat(nota.valores.valorServico) || 0;
    return 0;
  };

  const total = notas.reduce((sum, nota) => sum + getValor(nota), 0);

  let relatorio = `*Relatório de NFS-e Canceladas*\n\n`;
  relatorio += `📅 ${periodo || "Período completo"}\n\n`;

  notas.forEach((nota, index) => {
    const numero = nota.nfse_key?.slice(-8) || nota.protocolo?.slice(-8) || `#${String(index + 1).padStart(3, "0")}`;
    const data = new Date(nota.created_at).toLocaleDateString("pt-BR");
    const valor = getValor(nota).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
    const tomadorNome = nota.tomador?.nome || nota.tomador?.razaoSocial || "N/A";

    relatorio += `📄 Nota ${numero}\n`;
    relatorio += `   Data: ${data}\n`;
    relatorio += `   Valor: ${valor}\n`;
    relatorio += `   Tomador: ${tomadorNome}\n`;
    relatorio += `   Status: ❌ Cancelada\n\n`;
  });

  relatorio += `Total: ${notas.length} notas canceladas | ${total.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  })}`;

  return relatorio;
}

/**
 * Formata relatório de guias GPS para WhatsApp
 */
export function formatarRelatorioGuias(
  guias: GpsEmission[],
  periodo?: string
): string {
  if (guias.length === 0) {
    return `*Relatório de Guias GPS*

📅 ${periodo || "Período completo"}

Nenhuma guia encontrada.

Para emitir uma nova guia, digite "Emitir GPS"`;
  }

  const total = guias.reduce((sum, guia) => sum + (guia.valor || 0), 0);
  const guiasEmitidas = guias.filter((g) => g.status === "issued" || g.status === "paid").length;

  let relatorio = `*Relatório de Guias GPS Emitidas*\n\n`;
  relatorio += `📅 ${periodo || "Período completo"}\n\n`;

  guias.forEach((guia, index) => {
    const numero = `GPS${guia.id.slice(0, 8)}`;
    const competencia = guia.competencia || guia.month_ref || "N/A";
    const valor = (guia.valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
    const codigo = guia.inss_code || "N/A";
    const status = guia.status === "issued" || guia.status === "paid" ? "✅ Emitida" : "⏳ Pendente";

    relatorio += `📄 Guia ${numero}\n`;
    relatorio += `   Competência: ${competencia}\n`;
    relatorio += `   Valor: ${valor}\n`;
    relatorio += `   Código: ${codigo}\n`;
    relatorio += `   Status: ${status}\n\n`;
  });

  relatorio += `Total: ${guiasEmitidas} guias | ${total.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  })}\n\n`;
  relatorio += `Para ver o PDF de uma guia específica, digite:\n`;
  relatorio += `"Ver guia [número]" ou "PDF guia [número]"`;

  return relatorio;
}

/**
 * Formata detalhes de uma nota específica para WhatsApp
 */
export function formatarDetalhesNota(nota: NfseEmission): string {
  // A tabela não tem numero_nota, usar nfse_key ou protocolo
  const numero = nota.nfse_key?.slice(-8) || nota.protocolo?.slice(-8) || "N/A";
  const data = new Date(nota.created_at).toLocaleDateString("pt-BR");
  const getValor = (n: NfseEmission): number => {
    if (n.valor) return n.valor;
    if (n.valores?.valor) return parseFloat(n.valores.valor) || 0;
    if (n.valores?.valorServico) return parseFloat(n.valores.valorServico) || 0;
    return 0;
  };
  const valor = getValor(nota).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
  const tomadorNome = nota.tomador?.nome || nota.tomador?.razaoSocial || "N/A";
  const tomadorDoc = nota.tomador?.documento || nota.tomador?.cnpj || nota.tomador?.cpf || "N/A";

  let detalhes = `*NFS-e ${numero}*\n\n`;
  detalhes += `📄 Nota Fiscal de Serviço\n`;
  detalhes += `📅 Data: ${data}\n`;
  detalhes += `💰 Valor: ${valor}\n`;
  detalhes += `👤 Tomador: ${tomadorNome}\n`;
  detalhes += `📋 Documento: ${tomadorDoc}\n\n`;

  if (nota.pdf_url) {
    detalhes += `[PDF anexado - download automático]\n\n`;
  }

  detalhes += `Para emitir nova nota, digite "Emitir nota"`;

  return detalhes;
}

/**
 * Formata detalhes de uma guia GPS específica para WhatsApp
 */
export function formatarDetalhesGuia(guia: GpsEmission): string {
  const numero = `GPS${guia.id.slice(0, 8)}`;
  const competencia = guia.competencia || guia.month_ref || "N/A";
  const valor = (guia.valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
  const codigo = guia.inss_code || "N/A";

  let detalhes = `*Guia GPS ${numero}*\n\n`;
  detalhes += `📄 Guia de Previdência Social\n`;
  detalhes += `📅 Competência: ${competencia}\n`;
  detalhes += `💰 Valor: ${valor}\n`;
  detalhes += `📋 Código: ${codigo}\n\n`;

  if (guia.pdf_url) {
    detalhes += `[PDF anexado - download automático]\n\n`;
  }

  detalhes += `Para emitir nova guia, digite "Emitir GPS"`;

  return detalhes;
}

/**
 * Extrai filtro de data da mensagem do usuário
 */
export function extrairFiltroData(mensagem: string): DateFilter | null {
  const lower = mensagem.toLowerCase();

  // Padrão: "janeiro", "janeiro/2025", "01/2025"
  const mesAnoPattern = /(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s*\/?\s*(\d{4})?|(\d{1,2})\/(\d{4})/;
  const mesAnoMatch = mensagem.match(mesAnoPattern);

  if (mesAnoMatch) {
    let month: string;
    let year: string;

    if (mesAnoMatch[1]) {
      // Mês por extenso
      const meses = {
        janeiro: "01",
        fevereiro: "02",
        março: "03",
        abril: "04",
        maio: "05",
        junho: "06",
        julho: "07",
        agosto: "08",
        setembro: "09",
        outubro: "10",
        novembro: "11",
        dezembro: "12"
      };
      month = meses[mesAnoMatch[1].toLowerCase() as keyof typeof meses] || "01";
      year = mesAnoMatch[2] || new Date().getFullYear().toString();
    } else {
      month = mesAnoMatch[3]?.padStart(2, "0") || "01";
      year = mesAnoMatch[4] || new Date().getFullYear().toString();
    }

    return { month: `${month}/${year}` };
  }

  // Padrão: "01/01/2025 a 31/01/2025"
  const rangePattern = /(\d{1,2})\/(\d{1,2})\/(\d{4})\s*(?:a|até|até|to)\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/;
  const rangeMatch = mensagem.match(rangePattern);

  if (rangeMatch) {
    const startDate = new Date(
      parseInt(rangeMatch[3]),
      parseInt(rangeMatch[2]) - 1,
      parseInt(rangeMatch[1])
    );
    const endDate = new Date(
      parseInt(rangeMatch[6]),
      parseInt(rangeMatch[5]) - 1,
      parseInt(rangeMatch[4]),
      23,
      59,
      59
    );

    return { startDate, endDate };
  }

  return null;
}

/**
 * Extrai número da nota/guia da mensagem
 */
export function extrairNumeroNotaOuGuia(mensagem: string): string | null {
  // Ignorar mensagens de boas-vindas ou contextuais que não são solicitações de nota
  const ignorarPatterns = [
    /notas fiscais/i,
    /notas?\s+(?:fiscais|emitidas|minhas)/i,
    /guias?\s+(?:gps|emitidas|minhas)/i,
    /(?:bem-vindo|bemvindo|ajuda|ajudar)/i
  ];
  
  for (const ignorarPattern of ignorarPatterns) {
    if (ignorarPattern.test(mensagem)) {
      // Se a mensagem contém essas palavras, não é uma solicitação de nota específica
      // mas verificar se tem um número explícito após "nota" ou "guia"
      const temNumeroExplicito = /(?:nota|guia)\s+(?:#|n[úu]mero|n[úu]m\.?)?\s*(\d+)/i.test(mensagem);
      if (!temNumeroExplicito) {
        return null;
      }
    }
  }

  // Padrões: "nota 001", "nota #001", "PDF nota 001", "guia GPS001", etc.
  // IMPORTANTE: Requer pelo menos 2 dígitos ou caracteres para evitar falsos positivos
  const patterns = [
    /(?:ver|pdf|imprimir|enviar)\s+(?:nota|note)\s*(?:#|n[úu]mero|n[úu]m\.?)?\s*(\d{2,}|[A-Z0-9]{2,})/i,
    /(?:ver|pdf|imprimir|enviar)\s+(?:guia|guide|gps)\s*(?:GPS)?\s*(?:#|n[úu]mero|n[úu]m\.?)?\s*(\d{2,}|[A-Z0-9]{2,})/i,
    /(?:nota|note)\s*(?:#|n[úu]mero|n[úu]m\.?)?\s*(\d{2,}|[A-Z0-9]{2,})/i,
    /(?:guia|guide|gps)\s*(?:GPS)?\s*(?:#|n[úu]mero|n[úu]m\.?)?\s*(\d{2,}|[A-Z0-9]{2,})/i
  ];

  for (const pattern of patterns) {
    const match = mensagem.match(pattern);
    if (match && match[1] && match[1].length >= 2) {
      return match[1].trim();
    }
  }

  return null;
}

/**
 * Obtém URL pública do PDF a partir do storage path ou URL direta
 */
export async function obterUrlPDF(
  emission: NfseEmission | GpsEmission,
  tipo: 'nfse' | 'gps' = 'nfse'
): Promise<string | null> {
  // Se já tem URL direta, retornar
  if (emission.pdf_url) {
    return emission.pdf_url;
  }

  // Se tem storage path, gerar URL assinada
  const storagePath = 'pdf_storage_path' in emission ? emission.pdf_storage_path : null;
  if (storagePath) {
    try {
      const { createSupabaseClients } = await import("../../../services/supabase");
      const { admin } = createSupabaseClients();
      
      // Determinar bucket baseado no tipo
      const bucket = tipo === 'nfse' ? 'danfse' : 'pdf-gps';
      
      const { data, error } = await admin.storage
        .from(bucket)
        .createSignedUrl(storagePath, 3600); // URL válida por 1 hora
      
      if (error) {
        console.error("[REPORT SERVICE] Erro ao gerar URL assinada:", error);
        return null;
      }
      
      return data?.signedUrl || null;
    } catch (error) {
      console.error("[REPORT SERVICE] Erro ao gerar URL assinada do PDF:", error);
      return null;
    }
  }

  return null;
}

