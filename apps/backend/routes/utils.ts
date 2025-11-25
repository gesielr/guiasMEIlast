/**
 * Rotas utilitárias para descriptografia e outras operações auxiliares
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { decryptData } from "../src/utils/decryption";

const decryptBodySchema = z.object({
  encrypted: z.string().min(1),
});

type DecryptBody = z.infer<typeof decryptBodySchema>;

export async function registerUtilsRoutes(app: FastifyInstance) {
  /**
   * Endpoint para descriptografar dados (usado pelo backend Python)
   * POST /api/v1/utils/decrypt
   */
  app.post(
    "/api/v1/utils/decrypt",
    async (request: FastifyRequest<{ Body: DecryptBody }>, reply: FastifyReply) => {
      try {
        request.log.info({
          hasBody: !!request.body,
          bodyType: typeof request.body,
          encryptedLength: (request.body as any)?.encrypted?.length || 0,
          encryptedPreview: (request.body as any)?.encrypted?.substring(0, 30) || null
        }, "[UTILS DECRYPT] Recebendo requisição de descriptografia");
        
        const body = decryptBodySchema.parse(request.body);
        
        // ✅ CORREÇÃO: Importar a constante ENCRYPTION_SECRET diretamente do módulo de descriptografia
        // Isso garante que estamos usando exatamente a mesma chave que a função decryptData usa
        const decryptionModule = await import("../src/utils/decryption");
        const ENCRYPTION_SECRET = decryptionModule.ENCRYPTION_SECRET;
        
        request.log.info({
          encryptedLength: body.encrypted.length,
          encryptedPreview: body.encrypted.substring(0, 30) + "...",
          hasEncryptionSecret: !!ENCRYPTION_SECRET && ENCRYPTION_SECRET !== "default-secret-key-change-in-production",
          encryptionSecretLength: ENCRYPTION_SECRET?.length || 0,
          encryptionSecretPreview: ENCRYPTION_SECRET ? ENCRYPTION_SECRET.substring(0, 10) + "..." : null,
          encryptionSecretSource: process.env.ENCRYPTION_SECRET ? "ENCRYPTION_SECRET" :
                                  process.env.REACT_APP_ENCRYPTION_SECRET ? "REACT_APP_ENCRYPTION_SECRET" :
                                  process.env.VITE_ENCRYPTION_SECRET ? "VITE_ENCRYPTION_SECRET" : "NONE"
        }, "[UTILS DECRYPT] Dados validados, iniciando descriptografia");
        
        // ✅ VALIDAÇÃO: Verificar se a chave está configurada antes de tentar descriptografar
        if (!ENCRYPTION_SECRET || ENCRYPTION_SECRET === "default-secret-key-change-in-production") {
          request.log.error({
            encryptionSecret: ENCRYPTION_SECRET ? ENCRYPTION_SECRET.substring(0, 10) + "..." : "undefined",
            encryptionSecretLength: ENCRYPTION_SECRET?.length || 0
          }, "[UTILS DECRYPT] ❌ ENCRYPTION_SECRET não configurado!");
          return reply.status(500).send({
            success: false,
            error: "Chave de criptografia não configurada",
            message: "ENCRYPTION_SECRET não está configurado no servidor"
          });
        }
        
        // Descriptografar usando a mesma função do frontend
        const decrypted = await decryptData(body.encrypted);
        
        request.log.info({
          decryptedLength: decrypted.length,
          decryptedPreview: decrypted.substring(0, 5) + "***"
        }, "[UTILS DECRYPT] ✅ Descriptografia bem-sucedida");
        
        return {
          success: true,
          decrypted: decrypted,
        };
      } catch (error: any) {
        request.log.error({ 
          error: error.message,
          errorName: error.name,
          errorStack: error.stack?.substring(0, 200),
          bodyReceived: request.body
        }, "[UTILS] Erro ao descriptografar");
        return reply.status(400).send({
          success: false,
          error: "Erro ao descriptografar dados",
          message: error.message,
        });
      }
    }
  );
}

