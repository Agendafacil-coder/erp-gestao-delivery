import { eq } from "drizzle-orm";
import { getDb } from "@/db/connection.server";
import { schema } from "@/db";
import { fetchFood99ClientCredentialsToken } from "./oauthClient";

export async function persistFood99Token(
  tenantId: string,
  accessToken: string,
  expiresIn: number,
): Promise<void> {
  const db = getDb();
  await db
    .update(schema.food99TenantConfig)
    .set({
      accessToken,
      tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
      updatedAt: new Date(),
    })
    .where(eq(schema.food99TenantConfig.tenantId, tenantId));
}

export async function ensureFood99AccessToken(tenantId: string): Promise<string | null> {
  const db = getDb();
  const [config] = await db
    .select()
    .from(schema.food99TenantConfig)
    .where(eq(schema.food99TenantConfig.tenantId, tenantId))
    .limit(1);

  if (!config?.clientId?.trim() || !config.clientSecret?.trim()) return null;

  const expiresAt = config.tokenExpiresAt?.getTime() ?? 0;
  if (config.accessToken && expiresAt - Date.now() > 60_000) {
    return config.accessToken;
  }

  try {
    const tokens = await fetchFood99ClientCredentialsToken({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      apiBase: config.apiBase,
    });
    await persistFood99Token(tenantId, tokens.accessToken, tokens.expiresIn);
    return tokens.accessToken;
  } catch {
    return config.accessToken ?? null;
  }
}
