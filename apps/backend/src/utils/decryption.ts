/**
 * Utilitário para descriptografar dados usando AES-GCM
 * Compatível com a função encryptData do frontend (apps/web/src/utils/encryption.js)
 */

// ✅ CORREÇÃO: Buscar ENCRYPTION_SECRET de múltiplas fontes
// IMPORTANTE: Remover aspas duplas se presentes (dotenv pode carregar com aspas)
const getEnvSecret = (key: string): string | undefined => {
  const value = process.env[key];
  if (!value) return undefined;
  // Remover aspas duplas/simples no início e fim se presentes
  // Também remover espaços em branco que podem ter sido adicionados
  let cleaned = value.trim();
  cleaned = cleaned.replace(/^["']|["']$/g, '');
  cleaned = cleaned.trim();
  return cleaned;
};

// ✅ EXPORTAR para uso em outros módulos (ex: utils.ts)
export const ENCRYPTION_SECRET = 
  getEnvSecret("ENCRYPTION_SECRET") || 
  getEnvSecret("REACT_APP_ENCRYPTION_SECRET") ||
  getEnvSecret("VITE_ENCRYPTION_SECRET") ||
  "default-secret-key-change-in-production";

// ✅ LOG: Verificar se a chave está configurada (apenas uma vez no startup)
const hasEnvSecret = !!(process.env.ENCRYPTION_SECRET || process.env.REACT_APP_ENCRYPTION_SECRET || process.env.VITE_ENCRYPTION_SECRET);
if (!hasEnvSecret) {
  console.warn("[DECRYPTION] ⚠️⚠️⚠️ ENCRYPTION_SECRET não configurado! A descriptografia pode falhar!");
  console.warn("[DECRYPTION] Configure ENCRYPTION_SECRET no arquivo .env do backend Node.js");
  console.warn("[DECRYPTION] O valor deve ser o mesmo usado no frontend (REACT_APP_ENCRYPTION_SECRET ou VITE_ENCRYPTION_SECRET)");
} else {
  const secretSource = process.env.ENCRYPTION_SECRET ? "ENCRYPTION_SECRET" : 
                       process.env.REACT_APP_ENCRYPTION_SECRET ? "REACT_APP_ENCRYPTION_SECRET" : 
                       "VITE_ENCRYPTION_SECRET";
  const secretValue = ENCRYPTION_SECRET;
  console.log(`[DECRYPTION] ✅ ENCRYPTION_SECRET carregado de ${secretSource}: ${secretValue.substring(0, 10)}... (${secretValue.length} caracteres)`);
}

/**
 * Obtém chave derivada usando PBKDF2 (compatível com frontend)
 */
async function getKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  );

  // ✅ CORREÇÃO: Garantir que o salt seja compatível com BufferSource
  // Criar um novo Uint8Array copiando os dados para garantir um ArrayBuffer próprio
  const saltBuffer = new Uint8Array(salt);

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBuffer as BufferSource,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );
}

/**
 * Descriptografa dados usando AES-GCM (compatível com encryptData do frontend)
 * 
 * Formato esperado: Base64 contendo [salt (16 bytes)][iv (12 bytes)][dados criptografados]
 */
export async function decryptData(
  cipherText: string,
  password: string = ENCRYPTION_SECRET
): Promise<string> {
  try {
    // ✅ VALIDAÇÃO: Verificar se o texto criptografado está no formato correto
    if (!cipherText || typeof cipherText !== 'string') {
      throw new Error("Texto criptografado inválido: deve ser uma string não vazia");
    }
    
    // ✅ VALIDAÇÃO: Verificar se tem tamanho mínimo (salt 16 + iv 12 = 28 bytes mínimo)
    if (cipherText.length < 40) { // Base64 de 28 bytes = ~38 caracteres
      throw new Error(`Texto criptografado muito curto: esperado pelo menos 40 caracteres, recebido ${cipherText.length}`);
    }
    
    // ✅ LOG: Verificar se a chave de criptografia está configurada
    const hasValidSecret = ENCRYPTION_SECRET && ENCRYPTION_SECRET !== "default-secret-key-change-in-production";
    if (!hasValidSecret) {
      console.warn("[DECRYPTION] ⚠️ ENCRYPTION_SECRET não configurado ou usando valor padrão!");
      console.warn(`[DECRYPTION] ENCRYPTION_SECRET atual: ${ENCRYPTION_SECRET ? ENCRYPTION_SECRET.substring(0, 10) + "..." : "undefined"}`);
      console.warn(`[DECRYPTION] process.env.ENCRYPTION_SECRET: ${process.env.ENCRYPTION_SECRET ? process.env.ENCRYPTION_SECRET.substring(0, 10) + "..." : "undefined"} (${process.env.ENCRYPTION_SECRET?.length || 0} chars)`);
      console.warn(`[DECRYPTION] process.env.REACT_APP_ENCRYPTION_SECRET: ${process.env.REACT_APP_ENCRYPTION_SECRET ? process.env.REACT_APP_ENCRYPTION_SECRET.substring(0, 10) + "..." : "undefined"} (${process.env.REACT_APP_ENCRYPTION_SECRET?.length || 0} chars)`);
    } else {
      console.log(`[DECRYPTION] ✅ ENCRYPTION_SECRET configurado: ${ENCRYPTION_SECRET.substring(0, 10)}... (${ENCRYPTION_SECRET.length} caracteres)`);
      // ✅ LOG ADICIONAL: Verificar se a chave tem o tamanho esperado (44 caracteres)
      if (ENCRYPTION_SECRET.length !== 44) {
        console.warn(`[DECRYPTION] ⚠️ ATENÇÃO: ENCRYPTION_SECRET tem ${ENCRYPTION_SECRET.length} caracteres, esperado 44!`);
        console.warn(`[DECRYPTION] Isso pode indicar que há aspas ou espaços extras no arquivo .env`);
        console.warn(`[DECRYPTION] Valor completo (primeiros 20): ${ENCRYPTION_SECRET.substring(0, 20)}...`);
        console.warn(`[DECRYPTION] Valor completo (últimos 10): ...${ENCRYPTION_SECRET.substring(ENCRYPTION_SECRET.length - 10)}`);
      }
    }
    
    console.log(`[DECRYPTION] Tentando descriptografar: tamanho=${cipherText.length}, preview=${cipherText.substring(0, 30)}...`);
    console.log(`[DECRYPTION] Usando ENCRYPTION_SECRET: ${ENCRYPTION_SECRET.substring(0, 10)}... (${ENCRYPTION_SECRET.length} caracteres)`);
    
    // Decodificar Base64 para Uint8Array
    let buffer: Uint8Array;
    try {
      buffer = Uint8Array.from(atob(cipherText), c => c.charCodeAt(0));
    } catch (base64Error: any) {
      throw new Error(`Erro ao decodificar Base64: ${base64Error.message}. Texto recebido: ${cipherText.substring(0, 50)}...`);
    }
    
    // ✅ VALIDAÇÃO: Verificar se o buffer tem tamanho suficiente
    if (buffer.length < 28) {
      throw new Error(`Buffer muito curto: esperado pelo menos 28 bytes, recebido ${buffer.length}`);
    }

    // Extrair salt (16 bytes), IV (12 bytes) e dados criptografados
    const salt = buffer.slice(0, 16);
    const iv = buffer.slice(16, 28);
    const data = buffer.slice(28);
    
    console.log(`[DECRYPTION] Buffer decodificado: tamanho=${buffer.length}, salt=${salt.length}, iv=${iv.length}, data=${data.length}`);
    console.log(`[DECRYPTION] Salt (hex): ${Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32)}...`);
    console.log(`[DECRYPTION] IV (hex): ${Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('')}`);

    // Derivar chave
    console.log(`[DECRYPTION] Derivando chave usando PBKDF2 com password: ${password.substring(0, 10)}... (${password.length} chars)`);
    const key = await getKey(password, salt);
    console.log(`[DECRYPTION] Chave derivada com sucesso`);

    // Descriptografar
    console.log(`[DECRYPTION] Iniciando descriptografia AES-GCM...`);
    let decryptedContent: ArrayBuffer;
    try {
      decryptedContent = await crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: iv,
        },
        key,
        data
      );
      console.log(`[DECRYPTION] Descriptografia concluída: ${decryptedContent.byteLength} bytes`);
    } catch (decryptError: any) {
      console.error(`[DECRYPTION] ❌ ERRO na descriptografia AES-GCM:`, {
        name: decryptError.name,
        message: decryptError.message,
        stack: decryptError.stack?.substring(0, 200)
      });
      // ✅ LOG ADICIONAL: Verificar se a chave está correta
      console.error(`[DECRYPTION] Verificando chave usada: ${password.substring(0, 10)}... (${password.length} chars)`);
      console.error(`[DECRYPTION] Verificando ENCRYPTION_SECRET: ${ENCRYPTION_SECRET.substring(0, 10)}... (${ENCRYPTION_SECRET.length} chars)`);
      throw decryptError;
    }

    // Converter para string
    const dec = new TextDecoder();
    const result = dec.decode(decryptedContent);
    console.log(`[DECRYPTION] ✅ Descriptografia bem-sucedida: resultado tem ${result.length} caracteres`);
    return result;
  } catch (error: any) {
    console.error("[DECRYPTION] Erro ao descriptografar:", {
      message: error.message,
      name: error.name,
      stack: error.stack?.substring(0, 200)
    });
    throw new Error(`Erro ao descriptografar dados: ${error.message}`);
  }
}

