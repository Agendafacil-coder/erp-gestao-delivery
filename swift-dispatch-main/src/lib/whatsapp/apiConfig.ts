import { eq } from "drizzle-orm";
import { getDb } from "@/db/connection.server";
import { schema } from "@/db";

export type WhatsappApiConfig = {
  provider: "evolution" | "zapi" | "cloud";
  apiUrl: string | null;
  apiKey: string | null;
  instanceName: string | null;
  enabled: boolean;
  apiKeySet: boolean;
  source: "tenant" | "env" | "none";
};

export type WhatsappApiConfigInput = {
  provider?: "evolution" | "zapi" | "cloud";
  apiUrl?: string | null;
  apiKey?: string | null;
  instanceName?: string | null;
  enabled?: boolean;
};

export async function getWhatsappApiConfig(tenantId: string): Promise<WhatsappApiConfig> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(schema.whatsappTenantConfig)
    .where(eq(schema.whatsappTenantConfig.tenantId, tenantId))
    .limit(1);

  if (row?.enabled && row.apiUrl?.trim() && row.apiKey?.trim() && row.instanceName?.trim()) {
    return {
      provider: (row.provider as WhatsappApiConfig["provider"]) ?? "evolution",
      apiUrl: row.apiUrl.trim(),
      apiKey: row.apiKey.trim(),
      instanceName: row.instanceName.trim(),
      enabled: true,
      apiKeySet: true,
      source: "tenant",
    };
  }

  const envUrl = process.env.WHATSAPP_API_URL?.trim() || null;
  const envKey = process.env.WHATSAPP_API_KEY?.trim() || null;
  const envInstance = process.env.WHATSAPP_INSTANCE?.trim() || null;

  if (envUrl && envKey && envInstance) {
    return {
      provider: "evolution",
      apiUrl: envUrl,
      apiKey: envKey,
      instanceName: envInstance,
      enabled: true,
      apiKeySet: true,
      source: "env",
    };
  }

  return {
    provider: (row?.provider as WhatsappApiConfig["provider"]) ?? "evolution",
    apiUrl: row?.apiUrl?.trim() || envUrl,
    apiKey: null,
    instanceName: row?.instanceName?.trim() || envInstance,
    enabled: row?.enabled ?? false,
    apiKeySet: !!(row?.apiKey?.trim() || envKey),
    source: "none",
  };
}

export async function saveWhatsappApiConfig(
  tenantId: string,
  input: WhatsappApiConfigInput,
): Promise<WhatsappApiConfig> {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(schema.whatsappTenantConfig)
    .where(eq(schema.whatsappTenantConfig.tenantId, tenantId))
    .limit(1);

  const nextApiUrl =
    input.apiUrl !== undefined ? input.apiUrl?.trim() || null : existing?.apiUrl ?? null;
  const nextApiKey =
    input.apiKey !== undefined
      ? input.apiKey?.trim() || null
      : existing?.apiKey ?? null;
  const nextInstance =
    input.instanceName !== undefined
      ? input.instanceName?.trim() || null
      : existing?.instanceName ?? null;
  const nextEnabled = input.enabled ?? existing?.enabled ?? false;

  if (nextEnabled) {
    if (!nextApiUrl) {
      throw new Error("Informe o endereço do serviço (URL).");
    }
    if (!nextInstance) {
      throw new Error("Informe o nome da instância ou ID.");
    }
    if (!nextApiKey) {
      throw new Error("Informe o token / senha de acesso.");
    }
  }

  const patch = {
    provider: input.provider ?? existing?.provider ?? "evolution",
    apiUrl: nextApiUrl,
    apiKey: nextApiKey,
    instanceName: nextInstance,
    enabled: nextEnabled,
    updatedAt: new Date(),
  };

  if (existing) {
    await db
      .update(schema.whatsappTenantConfig)
      .set(patch)
      .where(eq(schema.whatsappTenantConfig.tenantId, tenantId));
  } else {
    await db.insert(schema.whatsappTenantConfig).values({
      tenantId,
      ...patch,
    });
  }

  return getWhatsappApiConfig(tenantId);
}

/** Resolve credenciais ativas para disparo (tenant > .env). */
export async function resolveWhatsappSendCredentials(tenantId: string): Promise<{
  provider: WhatsappApiConfig["provider"];
  baseUrl: string;
  apiKey: string;
  instance: string;
} | null> {
  const cfg = await getWhatsappApiConfig(tenantId);
  if (!cfg.enabled || !cfg.apiUrl || !cfg.apiKey) return null;
  const instance = cfg.instanceName?.trim();
  if (!instance) return null;
  return {
    provider: cfg.provider,
    baseUrl: cfg.apiUrl.replace(/\/$/, ""),
    apiKey: cfg.apiKey,
    instance,
  };
}
