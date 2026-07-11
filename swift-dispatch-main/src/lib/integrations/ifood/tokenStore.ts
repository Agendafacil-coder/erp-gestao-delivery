import { eq } from "drizzle-orm";
import { getDb } from "@/db/connection.server";
import { schema } from "@/db";
import type { IfoodTokenResponse } from "./oauthClient";
import {
  exchangeAuthorizationCode,
  fetchClientCredentialsToken,
  refreshAccessToken,
} from "./oauthClient";

export async function persistIfoodTokens(
  tenantId: string,
  tokens: IfoodTokenResponse,
): Promise<void> {
  const db = getDb();
  const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);

  await db
    .update(schema.ifoodTenantConfig)
    .set({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken ?? undefined,
      tokenExpiresAt: expiresAt,
      authorizationCodeVerifier: null,
      pendingUserCode: null,
      pendingUserCodeExpiresAt: null,
      verificationUrl: null,
      updatedAt: new Date(),
    })
    .where(eq(schema.ifoodTenantConfig.tenantId, tenantId));
}

export async function clearIfoodOAuth(tenantId: string): Promise<void> {
  const db = getDb();
  await db
    .update(schema.ifoodTenantConfig)
    .set({
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
      authorizationCodeVerifier: null,
      pendingUserCode: null,
      pendingUserCodeExpiresAt: null,
      verificationUrl: null,
      updatedAt: new Date(),
    })
    .where(eq(schema.ifoodTenantConfig.tenantId, tenantId));
}

export async function ensureIfoodAccessToken(tenantId: string): Promise<string | null> {
  const db = getDb();
  const [config] = await db
    .select()
    .from(schema.ifoodTenantConfig)
    .where(eq(schema.ifoodTenantConfig.tenantId, tenantId))
    .limit(1);

  if (!config?.clientId || !config.clientSecret) return config?.accessToken ?? null;
  if (!config.accessToken) return null;

  const expiresAt = config.tokenExpiresAt?.getTime() ?? 0;
  const needsRefresh = expiresAt - Date.now() < 5 * 60 * 1000;

  if (!needsRefresh) return config.accessToken;

  if (!config.refreshToken) return config.accessToken;

  try {
    const tokens = await refreshAccessToken({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      refreshToken: config.refreshToken,
    });
    await persistIfoodTokens(tenantId, tokens);
    return tokens.accessToken;
  } catch {
    await clearIfoodOAuth(tenantId);
    return null;
  }
}

export async function connectIfoodCentralized(tenantId: string): Promise<IfoodTokenResponse> {
  const db = getDb();
  const [config] = await db
    .select()
    .from(schema.ifoodTenantConfig)
    .where(eq(schema.ifoodTenantConfig.tenantId, tenantId))
    .limit(1);

  if (!config?.clientId || !config.clientSecret) {
    throw new Error(
      "Informe o ID e a senha do aplicativo do Portal do Parceiro iFood antes de conectar.",
    );
  }

  const tokens = await fetchClientCredentialsToken(config.clientId, config.clientSecret);
  await persistIfoodTokens(tenantId, tokens);
  return tokens;
}

export async function completeIfoodDistributedOAuth(
  tenantId: string,
  authorizationCode: string,
): Promise<IfoodTokenResponse> {
  const db = getDb();
  const [config] = await db
    .select()
    .from(schema.ifoodTenantConfig)
    .where(eq(schema.ifoodTenantConfig.tenantId, tenantId))
    .limit(1);

  if (!config?.clientId || !config.clientSecret) {
    throw new Error("Informe o ID e a senha do aplicativo do Portal do Parceiro iFood.");
  }
  if (!config.authorizationCodeVerifier) {
    throw new Error("Gere um código de usuário antes de informar o código de autorização.");
  }

  const tokens = await exchangeAuthorizationCode({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    authorizationCode: authorizationCode.trim(),
    authorizationCodeVerifier: config.authorizationCodeVerifier,
  });

  await persistIfoodTokens(tenantId, tokens);
  return tokens;
}
