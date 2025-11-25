/**
 * Interface para providers de certificado PFX
 * Permite diferentes fontes de certificado (env, vault, etc)
 */
export interface ICertProvider {
  /**
   * Resolve o certificado PFX como Buffer
   * @returns Buffer do certificado PFX
   * @throws Error se o certificado não puder ser resolvido
   */
  resolvePfx(): Promise<Buffer>;
  
  /**
   * Obtém a senha do certificado (se necessário)
   * @returns Senha do certificado ou undefined
   */
  getPassphrase(): Promise<string | undefined>;
}

