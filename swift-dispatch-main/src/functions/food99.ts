import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/connection.server";
import { schema } from "@/db";
import { webhookUrl } from "@/lib/integrations/endpoints";
import { pollTenantFood99Events } from "@/lib/integrations/food99/pollEvents";
import type { Food99PollResultDto, Food99TenantConfigDto } from "@/lib/integrations/food99/types";
import { fetchFood99ClientCredentialsToken } from "@/lib/integrations/food99/oauthClient";
import { persistFood99Token } from "@/lib/integrations/food99/tokenStore";
import { assertCanManageIntegrations } from "@/lib/rbac";
import { requireSessionUser } from "./session";

async function assertTenantAccess(userId: string, tenantId: string) {
  const db = getDb();
  const [row] = await db
    .select({ id: schema.userRoles.id })
    .from(schema.userRoles)
    .where(and(eq(schema.userRoles.userId, userId), eq(schema.userRoles.tenantId, tenantId)))
    .limit(1);
  if (!row) throw new Error("Sem permissão para este tenant");
}

function mapConfig(
  tenantId: string,
  row: typeof schema.food99TenantConfig.$inferSelect | undefined,
): Food99TenantConfigDto {
  const tokenValid =
    !!row?.accessToken && (row.tokenExpiresAt?.getTime() ?? 0) > Date.now() + 60_000;

  return {
    tenant_id: tenantId,
    merchant_id: row?.merchantId ?? null,
    client_id_set: !!row?.clientId?.trim(),
    client_secret_set: !!row?.clientSecret?.trim(),
    api_base: row?.apiBase ?? null,
    webhook_secret_set: !!row?.webhookSecret?.trim(),
    enabled: row?.enabled ?? false,
    polling_enabled: row?.pollingEnabled ?? true,
    oauth_connected: tokenValid,
    webhook_url: webhookUrl("/api/integrations/99food/webhook"),
    last_poll_at: row?.lastPollAt?.toISOString() ?? null,
    last_poll_status: row?.lastPollStatus ?? null,
    last_poll_message: row?.lastPollMessage ?? null,
  };
}

export const getFood99ConfigFn = createServerFn({ method: "GET" })
  .inputValidator((data: { tenantId: string }) => data)
  .handler(async ({ data }): Promise<Food99TenantConfigDto> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanManageIntegrations(user, data.tenantId);

    const db = getDb();
    const [row] = await db
      .select()
      .from(schema.food99TenantConfig)
      .where(eq(schema.food99TenantConfig.tenantId, data.tenantId))
      .limit(1);

    return mapConfig(data.tenantId, row);
  });

export const saveFood99ConfigFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      tenantId: string;
      merchantId: string;
      clientId?: string;
      clientSecret?: string;
      apiBase?: string;
      webhookSecret?: string;
      enabled?: boolean;
      pollingEnabled?: boolean;
    }) => data,
  )
  .handler(async ({ data }): Promise<Food99TenantConfigDto> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanManageIntegrations(user, data.tenantId);

    const merchantId = data.merchantId.trim();
    if (!merchantId) throw new Error("ID da loja é obrigatório");

    const db = getDb();
    const now = new Date();

    const [existing] = await db
      .select()
      .from(schema.food99TenantConfig)
      .where(eq(schema.food99TenantConfig.tenantId, data.tenantId))
      .limit(1);

    const clientId = data.clientId?.trim() || existing?.clientId?.trim();
    const clientSecret = data.clientSecret?.trim() || existing?.clientSecret?.trim();
    if (!clientId) throw new Error("ID do aplicativo é obrigatório");
    if (!clientSecret) throw new Error("Senha do aplicativo é obrigatória");

    const patch = {
      merchantId,
      clientId,
      clientSecret,
      apiBase: data.apiBase?.trim() || null,
      enabled: data.enabled ?? false,
      pollingEnabled: data.pollingEnabled ?? true,
      updatedAt: now,
      ...(data.webhookSecret?.trim() ? { webhookSecret: data.webhookSecret.trim() } : {}),
    };

    if (existing) {
      await db
        .update(schema.food99TenantConfig)
        .set(patch)
        .where(eq(schema.food99TenantConfig.tenantId, data.tenantId));
    } else {
      await db.insert(schema.food99TenantConfig).values({
        tenantId: data.tenantId,
        ...patch,
      });
    }

    const credentialsChanged = Boolean(
      data.clientId?.trim() || data.clientSecret?.trim() || data.apiBase?.trim(),
    );
    const needsTokenRefresh = credentialsChanged || !existing?.accessToken;

    if (needsTokenRefresh) {
      try {
        const tokens = await fetchFood99ClientCredentialsToken({
          clientId,
          clientSecret,
          apiBase: patch.apiBase,
        });
        await persistFood99Token(data.tenantId, tokens.accessToken, tokens.expiresIn);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Falha ao validar credenciais";
        throw new Error(`Salvo, mas a conexão com a 99Food falhou: ${message}`);
      }
    }

    const [row] = await db
      .select()
      .from(schema.food99TenantConfig)
      .where(eq(schema.food99TenantConfig.tenantId, data.tenantId))
      .limit(1);

    return mapConfig(data.tenantId, row);
  });

export const pollFood99OrdersFn = createServerFn({ method: "POST" })
  .inputValidator((data: { tenantId: string }) => data)
  .handler(async ({ data }): Promise<Food99PollResultDto> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanManageIntegrations(user, data.tenantId);
    return pollTenantFood99Events(data.tenantId);
  });
