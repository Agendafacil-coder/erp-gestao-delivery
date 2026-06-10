import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";

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

  if (row?.enabled && row.apiUrl?.trim() && row.apiKey?.trim()) {
    return {
      provider: (row.provider as WhatsappApiConfig["provider"]) ?? "evolution",
      apiUrl: row.apiUrl.trim(),
      apiKey: row.apiKey.trim(),
      instanceName: row.instanceName?.trim() || null,
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

  const patch = {
    provider: input.provider ?? existing?.provider ?? "evolution",
    apiUrl: input.apiUrl !== undefined ? input.apiUrl?.trim() || null : existing?.apiUrl ?? null,
    apiKey:
      input.apiKey !== undefined
        ? input.apiKey?.trim() || null
        : existing?.apiKey ?? null,
    instanceName:
      input.instanceName !== undefined
        ? input.instanceName?.trim() || null
        : existing?.instanceName ?? null,
    enabled: input.enabled ?? existing?.enabled ?? false,
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
  const instance = cfg.instanceName ?? process.env.WHATSAPP_INSTANCE?.trim();
  if (!instance) return null;
  return {
    provider: cfg.provider,
    baseUrl: cfg.apiUrl.replace(/\/$/, ""),
    apiKey: cfg.apiKey,
    instance,
  };
}
