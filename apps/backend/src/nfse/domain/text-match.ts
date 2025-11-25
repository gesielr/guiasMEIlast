// Funções para match léxico entre texto livre e catálogo LC116
import { LC116_CATALOG, type LC116Item } from './lc116-catalog';
import logger from '../../utils/logger';

// Stopwords em português (palavras muito comuns que não agregam significado)
const STOP_WORDS = new Set([
  'de', 'da', 'do', 'das', 'dos', 'em', 'no', 'na', 'nos', 'nas',
  'o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas',
  'e', 'ou', 'para', 'com', 'sem', 'sob', 'sobre',
  'por', 'pelo', 'pela', 'pelos', 'pelas',
  'ao', 'aos', 'à', 'às',
  'que', 'qual', 'quais',
  'este', 'esta', 'estes', 'estas', 'esse', 'essa', 'esses', 'essas',
  'aquele', 'aquela', 'aqueles', 'aquelas',
  'ser', 'estar', 'ter', 'haver', 'fazer'
]);

/**
 * Tokeniza string: remove acentos, lowercase, remove pontuação, remove stopwords
 * @param str String de entrada
 * @returns Array de tokens únicos
 */
export function tokenize(str: string): string[] {
  if (!str) return [];
  
  return str
    // Remove acentos (normaliza NFD e remove diacríticos)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    // Lowercase
    .toLowerCase()
    // Remove pontuação e caracteres especiais (mantém espaços e números)
    .replace(/[^a-z0-9\s]/g, ' ')
    // Split por espaços
    .split(/\s+/)
    // Remove stopwords e strings vazias
    .filter(word => word && !STOP_WORDS.has(word));
}

/**
 * Calcula score de match entre tokens de busca e um item LC116
 * @param queryTokens Tokens da busca
 * @param item Item LC116 para comparar
 * @returns Score numérico (quanto maior, melhor o match)
 */
export function score(queryTokens: string[], item: LC116Item): number {
  if (!queryTokens.length) return 0;
  
  const querySet = new Set(queryTokens);
  
  // Tokenizar título e descrição do item
  const titleTokens = tokenize(item.title);
  const descTokens = item.desc ? tokenize(item.desc) : [];
  
  // Keywords do item (já em lowercase)
  const keywords = new Set((item.keywords || []).map(kw => kw.toLowerCase()));
  
  let matchScore = 0;
  
  // 1. Match em título (peso 3)
  for (const token of titleTokens) {
    if (querySet.has(token)) {
      matchScore += 3;
    }
  }
  
  // 2. Match em descrição (peso 1)
  for (const token of descTokens) {
    if (querySet.has(token)) {
      matchScore += 1;
    }
  }
  
  // 3. Match em keywords (peso 5 - mais importante)
  for (const keyword of keywords) {
    // Verificar se algum token da query contém ou está contido na keyword
    for (const queryToken of queryTokens) {
      if (queryToken === keyword || 
          queryToken.includes(keyword) || 
          keyword.includes(queryToken)) {
        matchScore += 5;
      }
    }
  }
  
  return matchScore;
}

/**
 * Retorna top K itens LC116 que melhor combinam com os tokens
 * @param tokens Tokens de busca
 * @param k Número máximo de resultados
 * @returns Array de códigos LC116 ordenados por score
 */
export function topKByTokens(tokens: string[], k: number = 2): string[] {
  if (!tokens.length) {
    logger.warn('[TEXT MATCH] Nenhum token fornecido para busca');
    return [];
  }
  
  logger.info('[TEXT MATCH] Buscando top-k matches', {
    tokens,
    k,
    catalogSize: LC116_CATALOG.length
  });
  
  // Calcular score para cada item do catálogo
  const scored = LC116_CATALOG
    .map(item => ({
      code: item.code,
      title: item.title,
      score: score(tokens, item)
    }))
    // Filtrar apenas items com score > 0
    .filter(x => x.score > 0)
    // Ordenar por score decrescente
    .sort((a, b) => b.score - a.score);
  
  logger.info('[TEXT MATCH] Resultados encontrados', {
    totalMatches: scored.length,
    topK: scored.slice(0, k).map(x => ({
      code: x.code,
      title: x.title,
      score: x.score
    }))
  });
  
  // Retornar apenas os códigos dos top K
  return scored.slice(0, k).map(x => x.code);
}

/**
 * Busca itens LC116 por texto livre (tokeniza e busca top-k)
 * @param text Texto livre de busca
 * @param k Número máximo de resultados
 * @returns Array de códigos LC116
 */
export function searchByFreeText(text: string, k: number = 2): string[] {
  const tokens = tokenize(text);
  return topKByTokens(tokens, k);
}

/**
 * Testa a qualidade do match para debug
 * @param query Texto de busca
 * @param expectedCodes Códigos esperados (para validação)
 * @returns Resultado do teste
 */
export function testMatch(query: string, expectedCodes?: string[]):{ tokens: string[]; results: Array<{ code: string; title: string; score: number }> } {
  const tokens = tokenize(query);
  
  const results = LC116_CATALOG
    .map(item => ({
      code: item.code,
      title: item.title,
      score: score(tokens, item)
    }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5); // Top 5 para debug
  
  logger.info('[TEXT MATCH TEST]', {
    query,
    tokens,
    expectedCodes,
    results: results.map(r => ({ code: r.code, score: r.score })),
    match: expectedCodes ? results.slice(0, 2).some(r => expectedCodes.includes(r.code)) : 'N/A'
  });
  
  return { tokens, results };
}

