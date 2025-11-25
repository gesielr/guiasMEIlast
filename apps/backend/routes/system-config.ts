// apps/backend/routes/system-config.ts
// Rotas para gerenciar configurações do sistema (salário mínimo, teto INSS, etc.)

import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { createSupabaseClients } from "../services/supabase";
import { clearConfigCache } from "../src/services/system-config.service";

const { admin } = createSupabaseClients();

const updateConfigSchema = z.object({
  config_key: z.string(),
  config_value: z.string(),
  description: z.string().optional()
});

type UpdateConfigBody = z.infer<typeof updateConfigSchema>;

export async function registerSystemConfigRoutes(app: FastifyInstance) {
  // GET /system-config - Listar todas as configurações
  app.get("/system-config", async (request: FastifyRequest, reply) => {
    try {
      const { data, error } = await admin
        .from("system_config")
        .select("*")
        .order("config_key");

      if (error) {
        request.log.error({ error }, "[SYSTEM CONFIG] Erro ao buscar configurações");
        return reply.code(500).send({ error: "Erro ao buscar configurações" });
      }

      // Converter para objeto chave-valor
      const configs: Record<string, any> = {};
      data?.forEach((config) => {
        let value: any = config.config_value;
        if (config.config_type === "number") {
          value = parseFloat(config.config_value);
        } else if (config.config_type === "boolean") {
          value = config.config_value === "true";
        } else if (config.config_type === "json") {
          try {
            value = JSON.parse(config.config_value);
          } catch {
            value = config.config_value;
          }
        }
        configs[config.config_key] = {
          value,
          type: config.config_type,
          description: config.description,
          updated_at: config.updated_at
        };
      });

      return reply.send({ configs });
    } catch (error) {
      request.log.error({ error }, "[SYSTEM CONFIG] Erro ao listar configurações");
      return reply.code(500).send({ error: "Erro interno do servidor" });
    }
  });

  // GET /system-config/:key - Buscar uma configuração específica
  app.get("/system-config/:key", async (request: FastifyRequest, reply) => {
    try {
      const { key } = request.params as { key: string };

      const { data, error } = await admin
        .from("system_config")
        .select("*")
        .eq("config_key", key)
        .maybeSingle();

      if (error) {
        request.log.error({ error, key }, "[SYSTEM CONFIG] Erro ao buscar configuração");
        return reply.code(500).send({ error: "Erro ao buscar configuração" });
      }

      if (!data) {
        return reply.code(404).send({ error: "Configuração não encontrada" });
      }

      let value: any = data.config_value;
      if (data.config_type === "number") {
        value = parseFloat(data.config_value);
      } else if (data.config_type === "boolean") {
        value = data.config_value === "true";
      } else if (data.config_type === "json") {
        try {
          value = JSON.parse(data.config_value);
        } catch {
          value = data.config_value;
        }
      }

      return reply.send({
        key: data.config_key,
        value,
        type: data.config_type,
        description: data.description,
        updated_at: data.updated_at
      });
    } catch (error) {
      request.log.error({ error }, "[SYSTEM CONFIG] Erro ao buscar configuração");
      return reply.code(500).send({ error: "Erro interno do servidor" });
    }
  });

  // PUT /system-config/:key - Atualizar uma configuração
  app.put("/system-config/:key", async (request: FastifyRequest, reply) => {
    try {
      const { key } = request.params as { key: string };
      const body = request.body as { value: string | number; description?: string };

      // Verificar se é admin (seria melhor ter middleware de autenticação)
      // Por enquanto, vamos confiar que o frontend já valida

      if (!body.value && body.value !== 0) {
        return reply.code(400).send({ error: "Valor é obrigatório" });
      }

      const configValue = String(body.value);

      // Buscar configuração existente para manter o tipo
      const { data: existing } = await admin
        .from("system_config")
        .select("config_type")
        .eq("config_key", key)
        .maybeSingle();

      if (!existing) {
        return reply.code(404).send({ error: "Configuração não encontrada" });
      }

      // Atualizar configuração
      const { data, error } = await admin
        .from("system_config")
        .update({
          config_value: configValue,
          description: body.description || undefined,
          updated_at: new Date().toISOString()
        })
        .eq("config_key", key)
        .select()
        .single();

      if (error) {
        request.log.error({ error, key }, "[SYSTEM CONFIG] Erro ao atualizar configuração");
        return reply.code(500).send({ error: "Erro ao atualizar configuração" });
      }

      let value: any = data.config_value;
      if (data.config_type === "number") {
        value = parseFloat(data.config_value);
      } else if (data.config_type === "boolean") {
        value = data.config_value === "true";
      }

      request.log.info({ key, value }, "[SYSTEM CONFIG] Configuração atualizada");

      // Limpar cache de configurações para forçar recarregamento
      clearConfigCache();

      return reply.send({
        key: data.config_key,
        value,
        type: data.config_type,
        description: data.description,
        updated_at: data.updated_at
      });
    } catch (error) {
      request.log.error({ error }, "[SYSTEM CONFIG] Erro ao atualizar configuração");
      return reply.code(500).send({ error: "Erro interno do servidor" });
    }
  });
}

