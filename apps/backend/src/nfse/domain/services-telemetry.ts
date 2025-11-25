// Sistema de telemetria para promover escolhas ao SEED
// Aprende com o uso real e sugere novos mapeamentos CNAE → LC116

import logger from '../../utils/logger';
import { createSupabaseClients } from '../../../services/supabase';

const { admin } = createSupabaseClients();

export interface ServiceChoice {
  cnae: string;              // CNAE do usuário
  lc116Code: string;         // Código LC116 escolhido
  source: 'seed' | 'lexical-cnae' | 'lexical-text' | 'fallback'; // Origem da sugestão
  userId: string;            // ID do usuário
  timestamp: Date;           // Quando foi escolhido
  freeText?: string;         // Texto livre (se foi via fallback)
}

export interface SeedPromotion {
  cnae: string;              // CNAE a ser promovido
  lc116Code: string;         // Código LC116 sugerido
  frequency: number;         // Quantidade de vezes escolhido
  users: string[];           // IDs dos usuários que escolheram
  confidence: number;        // Confiança da promoção (0-1)
  shouldPromote: boolean;    // Se deve ser promovido ao SEED
}

/**
 * Registra escolha de serviço pelo usuário
 * @param choice Dados da escolha
 */
export async function logServiceChoice(choice: ServiceChoice): Promise<void> {
  try {
    logger.info('[TELEMETRY] Registrando escolha de serviço', {
      cnae: choice.cnae,
      lc116Code: choice.lc116Code,
      source: choice.source,
      userId: choice.userId,
      hasFreeText: !!choice.freeText
    });
    
    // Salvar no banco (tabela service_choices)
    const { error } = await admin
      .from('service_choices')
      .insert({
        cnae: choice.cnae,
        lc116_code: choice.lc116Code,
        source: choice.source,
        user_id: choice.userId,
        free_text: choice.freeText || null,
        created_at: choice.timestamp.toISOString()
      });
    
    if (error) {
      logger.error('[TELEMETRY] Erro ao salvar escolha', {
        error: error.message,
        choice
      });
    } else {
      logger.info('[TELEMETRY] ✅ Escolha registrada com sucesso', {
        cnae: choice.cnae,
        lc116Code: choice.lc116Code
      });
    }
  } catch (err: any) {
    logger.error('[TELEMETRY] Erro ao registrar escolha', {
      error: err.message,
      choice
    });
  }
}

/**
 * Analisa escolhas e sugere promoções ao SEED
 * @param minFrequency Frequência mínima para considerar promoção (padrão: 3)
 * @param minConfidence Confiança mínima para promover (padrão: 0.7)
 * @returns Lista de sugestões de promoção
 */
export async function analyzeSeedPromotions(
  minFrequency: number = 3,
  minConfidence: number = 0.7
): Promise<SeedPromotion[]> {
  try {
    logger.info('[TELEMETRY] Analisando promoções ao SEED', {
      minFrequency,
      minConfidence
    });
    
    // Buscar escolhas agrupadas por CNAE + LC116
    const { data, error } = await admin
      .from('service_choices')
      .select('cnae, lc116_code, source, user_id')
      .order('created_at', { ascending: false });
    
    if (error) {
      logger.error('[TELEMETRY] Erro ao buscar escolhas', { error: error.message });
      return [];
    }
    
    if (!data || data.length === 0) {
      logger.info('[TELEMETRY] Nenhuma escolha registrada ainda');
      return [];
    }
    
    // Agrupar por CNAE + LC116
    const groupedChoices = new Map<string, {
      cnae: string;
      lc116Code: string;
      sources: string[];
      users: Set<string>;
    }>();
    
    for (const choice of data) {
      const key = `${choice.cnae}:${choice.lc116_code}`;
      
      if (!groupedChoices.has(key)) {
        groupedChoices.set(key, {
          cnae: choice.cnae,
          lc116Code: choice.lc116_code,
          sources: [],
          users: new Set()
        });
      }
      
      const group = groupedChoices.get(key)!;
      group.sources.push(choice.source);
      group.users.add(choice.user_id);
    }
    
    // Calcular promoções sugeridas
    const promotions: SeedPromotion[] = [];
    
    for (const [key, group] of groupedChoices.entries()) {
      const frequency = group.sources.length;
      const uniqueUsers = group.users.size;
      
      // Calcular confiança:
      // - Mais usuários únicos = maior confiança
      // - Origem 'lexical-cnae' = maior confiança (match automático)
      // - Origem 'lexical-text' = menor confiança (fallback)
      const lexicalCnaeCount = group.sources.filter(s => s === 'lexical-cnae').length;
      const lexicalTextCount = group.sources.filter(s => s === 'lexical-text').length;
      
      let confidence = (uniqueUsers / (uniqueUsers + 1)) * 0.5; // Base: 0-0.5
      confidence += (lexicalCnaeCount / frequency) * 0.3; // Peso para lexical-cnae: 0-0.3
      confidence += (frequency >= minFrequency ? 0.2 : 0); // Bonus por frequência: 0-0.2
      confidence -= (lexicalTextCount / frequency) * 0.1; // Penalidade para fallback
      
      confidence = Math.max(0, Math.min(1, confidence)); // Limitar entre 0 e 1
      
      const shouldPromote = frequency >= minFrequency && confidence >= minConfidence;
      
      promotions.push({
        cnae: group.cnae,
        lc116Code: group.lc116Code,
        frequency,
        users: Array.from(group.users),
        confidence,
        shouldPromote
      });
    }
    
    // Ordenar por confiança decrescente
    promotions.sort((a, b) => b.confidence - a.confidence);
    
    logger.info('[TELEMETRY] Análise de promoções concluída', {
      totalGrouped: promotions.length,
      shouldPromote: promotions.filter(p => p.shouldPromote).length,
      topPromotion: promotions[0] ? {
        cnae: promotions[0].cnae,
        lc116: promotions[0].lc116Code,
        confidence: promotions[0].confidence
      } : null
    });
    
    return promotions;
  } catch (err: any) {
    logger.error('[TELEMETRY] Erro ao analisar promoções', {
      error: err.message
    });
    return [];
  }
}

/**
 * Gera relatório de sugestões de promoção ao SEED (para admin)
 * @returns String formatada com relatório
 */
export async function generatePromotionReport(): Promise<string> {
  const promotions = await analyzeSeedPromotions(3, 0.7);
  
  if (promotions.length === 0) {
    return '⚠️ Nenhuma sugestão de promoção encontrada. ' +
           'Continue usando o sistema para gerar dados.';
  }
  
  let report = '📊 *RELATÓRIO DE SUGESTÕES DE PROMOÇÃO AO SEED*\n\n';
  
  const toPromote = promotions.filter(p => p.shouldPromote);
  
  if (toPromote.length > 0) {
    report += `✅ *${toPromote.length} sugestões para promover:*\n\n`;
    
    for (const p of toPromote.slice(0, 10)) { // Top 10
      report += `• CNAE ${p.cnae} → LC116 ${p.lc116Code}\n`;
      report += `  Freq: ${p.frequency}x | Usuários: ${p.users.length} | Confiança: ${(p.confidence * 100).toFixed(0)}%\n\n`;
    }
  }
  
  const underAnalysis = promotions.filter(p => !p.shouldPromote);
  
  if (underAnalysis.length > 0) {
    report += `\n📈 *${underAnalysis.length} sob análise (precisa mais dados):*\n\n`;
    
    for (const p of underAnalysis.slice(0, 5)) { // Top 5
      report += `• CNAE ${p.cnae} → LC116 ${p.lc116Code}\n`;
      report += `  Freq: ${p.frequency}x | Confiança: ${(p.confidence * 100).toFixed(0)}%\n\n`;
    }
  }
  
  report += '\n💡 *Como usar:*\n';
  report += 'Adicione os mapeamentos sugeridos em `apps/backend/src/nfse/domain/cnae-map.ts`';
  
  return report;
}

