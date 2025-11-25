// apps/backend/src/services/system-config.service.ts
// Serviço para buscar configurações do sistema do banco de dados

import { createSupabaseClients } from "../../services/supabase";

const { admin } = createSupabaseClients();

let salarioMinimoCache: number | null = null;
let tetoInssCache: number | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Busca o salário mínimo do banco de dados
 * Usa cache para evitar múltiplas consultas
 */
export async function getSalarioMinimo(): Promise<number> {
  const now = Date.now();
  
  // Retornar do cache se ainda válido
  if (salarioMinimoCache !== null && (now - cacheTimestamp) < CACHE_TTL) {
    return salarioMinimoCache;
  }

  try {
    const { data, error } = await admin
      .from("system_config")
      .select("config_value, config_type")
      .eq("config_key", "salario_minimo")
      .maybeSingle();

    if (error) {
      console.error("[SYSTEM CONFIG] Erro ao buscar salário mínimo:", error);
      // Retornar valor padrão em caso de erro
      return 1518.00;
    }

    if (!data) {
      console.warn("[SYSTEM CONFIG] Salário mínimo não encontrado no banco, usando valor padrão");
      return 1518.00;
    }

    const value = data.config_type === "number" 
      ? parseFloat(data.config_value) 
      : parseFloat(data.config_value) || 1518.00;

    // Atualizar cache
    salarioMinimoCache = value;
    cacheTimestamp = now;

    return value;
  } catch (error) {
    console.error("[SYSTEM CONFIG] Erro ao buscar salário mínimo:", error);
    return 1518.00; // Valor padrão
  }
}

/**
 * Busca o teto do INSS do banco de dados
 * Usa cache para evitar múltiplas consultas
 */
export async function getTetoInss(): Promise<number> {
  const now = Date.now();
  
  // Retornar do cache se ainda válido
  if (tetoInssCache !== null && (now - cacheTimestamp) < CACHE_TTL) {
    return tetoInssCache;
  }

  try {
    const { data, error } = await admin
      .from("system_config")
      .select("config_value, config_type")
      .eq("config_key", "teto_inss")
      .maybeSingle();

    if (error) {
      console.error("[SYSTEM CONFIG] Erro ao buscar teto INSS:", error);
      return 7786.02; // Valor padrão
    }

    if (!data) {
      console.warn("[SYSTEM CONFIG] Teto INSS não encontrado no banco, usando valor padrão");
      return 7786.02;
    }

    const value = data.config_type === "number" 
      ? parseFloat(data.config_value) 
      : parseFloat(data.config_value) || 7786.02;

    // Atualizar cache
    tetoInssCache = value;
    cacheTimestamp = now;

    return value;
  } catch (error) {
    console.error("[SYSTEM CONFIG] Erro ao buscar teto INSS:", error);
    return 7786.02; // Valor padrão
  }
}

/**
 * Busca o valor de ativação do sistema para Autônomos
 */
export async function getValorAtivacaoAutonomo(): Promise<number> {
  try {
    const { data, error } = await admin
      .from("system_config")
      .select("config_value, config_type")
      .eq("config_key", "valor_ativacao_autonomo")
      .maybeSingle();

    if (error || !data) {
      console.warn("[SYSTEM CONFIG] Valor ativação autônomo não encontrado, usando padrão R$ 150,00");
      return 150.00;
    }

    return parseFloat(data.config_value) || 150.00;
  } catch (error) {
    console.error("[SYSTEM CONFIG] Erro ao buscar valor ativação autônomo:", error);
    return 150.00;
  }
}

/**
 * Busca o valor do certificado digital para MEI
 */
export async function getValorCertificadoMei(): Promise<number> {
  try {
    const { data, error } = await admin
      .from("system_config")
      .select("config_value, config_type")
      .eq("config_key", "valor_certificado_mei")
      .maybeSingle();

    if (error || !data) {
      console.warn("[SYSTEM CONFIG] Valor certificado MEI não encontrado, usando padrão R$ 150,00");
      return 150.00;
    }

    return parseFloat(data.config_value) || 150.00;
  } catch (error) {
    console.error("[SYSTEM CONFIG] Erro ao buscar valor certificado MEI:", error);
    return 150.00;
  }
}

/**
 * Busca a porcentagem de taxa sobre guias GPS
 */
export async function getPorcentagemTaxaGps(): Promise<number> {
  try {
    const { data, error } = await admin
      .from("system_config")
      .select("config_value, config_type")
      .eq("config_key", "porcentagem_taxa_gps")
      .maybeSingle();

    if (error || !data) {
      console.warn("[SYSTEM CONFIG] Porcentagem taxa GPS não encontrada, usando padrão 6%");
      return 6;
    }

    return parseFloat(data.config_value) || 6;
  } catch (error) {
    console.error("[SYSTEM CONFIG] Erro ao buscar porcentagem taxa GPS:", error);
    return 6;
  }
}

/**
 * Busca a porcentagem de comissão para parceiros
 */
export async function getPorcentagemComissaoParceiro(): Promise<number> {
  try {
    const { data, error } = await admin
      .from("system_config")
      .select("config_value, config_type")
      .eq("config_key", "porcentagem_comissao_parceiro")
      .maybeSingle();

    if (error || !data) {
      console.warn("[SYSTEM CONFIG] Porcentagem comissão parceiro não encontrada, usando padrão 30%");
      return 30;
    }

    return parseFloat(data.config_value) || 30;
  } catch (error) {
    console.error("[SYSTEM CONFIG] Erro ao buscar porcentagem comissão parceiro:", error);
    return 30;
  }
}

/**
 * Busca a taxa por nota fiscal NFS-e
 */
export async function getTaxaNfsePorNota(): Promise<number> {
  try {
    const { data, error } = await admin
      .from("system_config")
      .select("config_value, config_type")
      .eq("config_key", "taxa_nfse_por_nota")
      .maybeSingle();

    if (error || !data) {
      console.warn("[SYSTEM CONFIG] Taxa NFS-e por nota não encontrada, usando padrão R$ 3,00");
      return 3.00;
    }

    return parseFloat(data.config_value) || 3.00;
  } catch (error) {
    console.error("[SYSTEM CONFIG] Erro ao buscar taxa NFS-e por nota:", error);
    return 3.00;
  }
}

/**
 * Limpa o cache de configurações
 * Útil quando uma configuração é atualizada
 */
export function clearConfigCache(): void {
  salarioMinimoCache = null;
  tetoInssCache = null;
  cacheTimestamp = 0;
}

