import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { createSupabaseClients } from "../services/supabase";

const nfseSchema = z.object({
  userId: z.string().uuid(),
  value: z.number().positive(),
  serviceDescription: z.string().min(3),
  tomador: z.object({
    nome: z.string(),
    documento: z.string(),
    email: z.string().email().optional()
  })
});

type NfseBody = z.infer<typeof nfseSchema>;

const getQuerySchema = z.object({ userId: z.string().uuid() });
type GetQuery = z.infer<typeof getQuerySchema>;

export async function registerNfseRoutes(app: FastifyInstance) {
  const supabase = createSupabaseClients();

  // Endpoint de emissão real
  app.post("/nfse/emit", async (request, reply) => {
    try {
      const { NfseService } = await import("../src/nfse/services/nfse.service");
      const service = new NfseService();
      const body = request.body as { versao: string, userId: string, dps_xml_gzip_b64: string };
      if (!body?.dps_xml_gzip_b64) {
        return reply.status(400).send({ ok: false, error: "Campo dps_xml_gzip_b64 ausente no corpo da requisição." });
      }
      const result = await service.emit({
        versao: body.versao,
        userId: body.userId,
        dps_xml_gzip_b64: body.dps_xml_gzip_b64
      });
      return reply.send(result);
    } catch (err) {
      return reply.status(500).send({ ok: false, error: (err as Error).message });
    }
  });
  // Endpoint de simulação ponta a ponta
  app.post("/nfse/test-sim", async (request, reply) => {
    try {
      const { NfseService } = await import("../src/nfse/services/nfse.service");
      const service = new NfseService();
      // Espera receber { dpsXml: string } no corpo da requisição
      const body = request.body as { dpsXml: string };
      if (!body?.dpsXml) {
        return reply.status(400).send({ ok: false, error: "Campo dpsXml ausente no corpo da requisição." });
      }
      const result = await service.testSimNfse({ dpsXml: body.dpsXml });
      return reply.send(result);
    } catch (err) {
      return reply.status(500).send({ ok: false, error: (err as Error).message });
    }
  });
}