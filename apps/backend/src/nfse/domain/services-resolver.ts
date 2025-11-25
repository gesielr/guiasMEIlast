// Resolver inteligente CNAE → LC116 com 3 níveis
// Nível 1: SEED (lookup direto)
// Nível 2: Match léxico por descrição CNAE  
// Nível 3: Match léxico por texto livre do usuário

import { normalizeCnae, servicesByCnae as seedLookup, SEED } from './cnae-map';
import { getCnaeTitle, getCnaeKeywords } from './cnae-descriptions';
import { tokenize, topKByTokens, searchByFreeText } from './text-match';
import { getLc116ByCode } from './lc116-catalog';
import { labelFor } from './lc116-labels'; // ✅ Importar labelFor para descrições corretas
import logger from '../../utils/logger';

export interface ServiceResolution {
  code: string;          // Código LC116 (ex: '07.10')
  source: 'seed' | 'lexical-cnae' | 'lexical-text' | 'fallback';
  score?: number;        // Score do match (para ordenação)
  cnaeOrigin?: string;   // CNAE de origem (quando aplicável)
}

const LEXICAL_BLOCKLIST = new Set([
  '9700500' // Serviços domésticos – Garopaba não habilita códigos correspondentes
]);

const MIN_LEXICAL_SCORE = 10;

/**
 * Resolve serviços LC116 para um único CNAE (com 3 níveis)
 * @param cnae Código CNAE (formato: '8121-4/00' ou '8121400')
 * @param k Número máximo de serviços a retornar
 * @returns Array de resoluções de serviço
 */
export function servicesByCnae(cnae: string, k: number = 2): ServiceResolution[] {
  const normalized = normalizeCnae(cnae);
  
  logger.info('[SERVICES RESOLVER] Resolvendo CNAE', {
    cnae,
    normalized,
    k
  });
  
  // ==== NÍVEL 1: SEED (lookup direto) ====
  const seedResults = seedLookup(normalized);
  if (seedResults.length > 0) {
    logger.info('[SERVICES RESOLVER] ✅ Match no SEED', {
      cnae: normalized,
      results: seedResults,
      source: 'seed'
    });
    
    return seedResults.slice(0, k).map((code, idx) => ({
      code,
      source: 'seed' as const,
      score: 100 - idx, // Score artificial (maior para primeiro)
      cnaeOrigin: normalized
    }));
  }
  
  // ==== NÍVEL 2: MATCH LÉXICO POR CNAE ====
  if (LEXICAL_BLOCKLIST.has(normalized)) {
    logger.info('[SERVICES RESOLVER] CNAE em blocklist para heurística léxica', {
      cnae: normalized
    });
    return [];
  }
  
  const cnaeTitle = getCnaeTitle(normalized);
  const cnaeKeywords = getCnaeKeywords(normalized);
  
  if (cnaeTitle || cnaeKeywords.length > 0) {
    // Combinar título e keywords para busca
    const searchText = [cnaeTitle, ...cnaeKeywords].join(' ');
    const tokens = tokenize(searchText);
    
    logger.info('[SERVICES RESOLVER] Tentando match léxico por CNAE', {
      cnae: normalized,
      cnaeTitle,
      keywords: cnaeKeywords,
      tokens
    });
    
    const lexicalResults = topKByTokens(tokens, k);
    
    if (lexicalResults.length > 0) {
      logger.info('[SERVICES RESOLVER] ✅ Match léxico por CNAE', {
        cnae: normalized,
        results: lexicalResults,
        source: 'lexical-cnae'
      });
      
      return lexicalResults
        .map((code, idx) => ({
          code,
          source: 'lexical-cnae' as const,
          score: 50 - idx, // Score médio
          cnaeOrigin: normalized
        }))
        .filter(result => (result.score || 0) >= MIN_LEXICAL_SCORE);
    }
  }
  
  // ==== NÍVEL 3: SEM MATCH ====
  logger.warn('[SERVICES RESOLVER] ⚠️ Nenhum match encontrado para CNAE', {
    cnae: normalized,
    temSeed: SEED[normalized] !== undefined,
    temDescricao: !!cnaeTitle
  });
  
  return [];
}

/**
 * Resolve serviços LC116 para múltiplos CNAEs (deduplicando e ordenando por score)
 * @param cnaes Array de códigos CNAE
 * @param perCnae Número máximo de serviços por CNAE
 * @returns Array de resoluções de serviço (deduplicadas)
 */
export function servicesByCnaes(cnaes: string[], perCnae: number = 2): ServiceResolution[] {
  logger.info('[SERVICES RESOLVER] Resolvendo múltiplos CNAEs', {
    cnaes,
    qtd: cnaes.length,
    perCnae
  });
  
  const seen = new Set<string>();
  const results: ServiceResolution[] = [];
  
  for (const cnae of cnaes) {
    const cnaeResults = servicesByCnae(cnae, perCnae);
    
    for (const result of cnaeResults) {
      // Deduplic por código LC116
      if (!seen.has(result.code)) {
        seen.add(result.code);
        results.push(result);
      }
    }
  }
  
  // Ordenar por source (seed > lexical-cnae > lexical-text) e score
  results.sort((a, b) => {
    // Prioridade de source
    const sourcePriority = { seed: 3, 'lexical-cnae': 2, 'lexical-text': 1, fallback: 0 };
    const priorityDiff = sourcePriority[b.source] - sourcePriority[a.source];
    if (priorityDiff !== 0) return priorityDiff;
    
    // Se source igual, ordenar por score
    return (b.score || 0) - (a.score || 0);
  });
  
  logger.info('[SERVICES RESOLVER] ✅ Resolução completa', {
    totalCnaes: cnaes.length,
    totalResults: results.length,
    bySource: {
      seed: results.filter(r => r.source === 'seed').length,
      lexicalCnae: results.filter(r => r.source === 'lexical-cnae').length
    },
    results: results.map(r => ({ code: r.code, source: r.source, score: r.score }))
  });
  
  return results;
}

/**
 * Resolve serviços LC116 por texto livre do usuário (fallback final)
 * @param text Descrição livre do serviço
 * @param k Número máximo de resultados
 * @returns Array de resoluções de serviço
 */
export function servicesByFreeText(text: string, k: number = 2): ServiceResolution[] {
  logger.info('[SERVICES RESOLVER] Resolvendo por texto livre', {
    text,
    k
  });
  
  if (!text || text.trim().length < 3) {
    logger.warn('[SERVICES RESOLVER] Texto muito curto', { text });
    return [];
  }
  
  const codes = searchByFreeText(text, k);
  
  if (codes.length === 0) {
    logger.warn('[SERVICES RESOLVER] Nenhum match por texto livre', { text });
    return [];
  }
  
  const results = codes.map((code, idx) => ({
    code,
    source: 'lexical-text' as const,
    score: 25 - idx // Score baixo (fallback)
  }));
  
  logger.info('[SERVICES RESOLVER] ✅ Match por texto livre', {
    text,
    results: results.map(r => ({ code: r.code, score: r.score }))
  });
  
  return results;
}

/**
 * Converte resoluções para formato usado no fluxo de emissão
 * @param resolutions Array de resoluções
 * @returns Array de serviços formatados
 */
export function resolutionsToServices(
  resolutions: ServiceResolution[]
): Array<{
  numero: number;
  descricao: string;
  codigoTributacao: string;
  itemListaLc116: string;
  subitemLc116: string;
  source: string;
}> {
  return resolutions.map((resolution, index) => {
    // ✅ CORREÇÃO: Usar labelFor para obter a descrição CORRETA e COMPLETA
    // labelFor retorna as descrições de lc116-labels.ts que são usadas no WhatsApp
    const descricao = labelFor(resolution.code);
    
    // Converter código LC116 para código de tributação de 6 dígitos
    // Ex: '07.10' -> '071000', '14.01.01' -> '140101'
    // Ex: '07.10.01' -> '071001'
    const codigoTributacao = resolution.code.replace(/\./g, '').padEnd(6, '0');
    const itemListaLc116 = resolution.code.split('.')[0]; // Ex: '07' de '07.10'
    
    return {
      numero: index + 1,
      descricao,
      codigoTributacao,
      itemListaLc116,
      subitemLc116: resolution.code,
      source: resolution.source
    };
  });
}

/**
 * Teste do resolver (para debug e validação)
 */
export function testResolver(cnaes: string[]): void {
  console.log('\n=== TESTE DO RESOLVER ===\n');
  
  for (const cnae of cnaes) {
    console.log(`\nCNAE: ${cnae}`);
    const results = servicesByCnae(cnae, 2);
    
    if (results.length > 0) {
      results.forEach(r => {
        const item = getLc116ByCode(r.code);
        console.log(`  ✅ ${r.code} - ${item?.title} (${r.source}, score: ${r.score})`);
      });
    } else {
      console.log(`  ❌ Nenhum resultado`);
    }
  }
  
  console.log('\n=== FIM DO TESTE ===\n');
}

