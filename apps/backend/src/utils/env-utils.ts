import { z } from "zod";

export function normalizeNfseEnvironment(val: string): 'production' | 'homologation' {
  if (val === 'homologacao' || val === 'homologation') {
    return 'homologation';
  }
  if (val === 'producao' || val === 'production') {
    return 'production';
  }
  // Default fallback handled by Zod enum usually, but here we return the val to let Zod validate it
  return val as any;
}

export function getNfseBaseUrl(val: string | undefined, ctx: z.RefinementCtx): string | undefined {
  const env = (ctx as any)._data?.NFSE_ENVIRONMENT || 'production';
  if (env === 'homologation') {
    return 'https://homologacao.adn.nfse.gov.br';
  }
  return val;
}

export function toBoolean(val: string): boolean {
  return val === 'true';
}
