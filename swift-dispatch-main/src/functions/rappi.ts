import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/connection.server";
import { schema } from "@/db";
import { webhookUrl } from "@/lib/integrations/endpoints";
import { isRappiOAuthConfigured } from "@/lib/integrations/rappi/oauthClient";
import { pollTenantRappiOrders } from "@/lib/integrations/rappi/pollOrders";
import type { RappiPollResultDto, RappiTenantConfigDto } from "@/lib/integrations/rappi/types";
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
  row: typeof schema.rappiTenantConfig.$inferSelect | undefined,
): RappiTenantConfigDto {
  return {
    tenant_id: tenantId,
    store_id: row?.storeId ?? null,
    api_key_set: !!row?.apiKey?.trim(),
    webhook_secret_set: !!row?.webhookSecret?.trim(),
    enabled: row?.enabled ?? false,
    polling_enabled: row?.pollingEnabled ?? true,
    webhook_url: webhookUrl("/api/integrations/rappi/webhook"),
    last_poll_at: row?.lastPollAt?.toISOString() ?? null,
    last_poll_status: row?.lastPollStatus ?? null,
    last_poll_message: row?.lastPollMessage ?? null,
    oauth_configured: isRappiOAuthConfigured(),
  };
}

export const getRappiConfigFn = createServerFn({ method: "GET" })
  .inputValidator((data: { tenantId: string }) => data)
  .handler(async ({ data }): Promise<RappiTenantConfigDto> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanManageIntegrations(user, data.tenantId);

    const db = getDb();
    const [row] = await db
      .select()
      .from(schema.rappiTenantConfig)
      .where(eq(schema.rappiTenantConfig.tenantId, data.tenantId))
      .limit(1);

    return mapConfig(data.tenantId, row);
  });

export const saveRappiConfigFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      tenantId: string;
      storeId: string;
      apiKey?: string;
      webhookSecret?: string;
      enabled?: boolean;
      pollingEnabled?: boolean;
    }) => data,
  )
  .handler(async ({ data }): Promise<RappiTenantConfigDto> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanManageIntegrations(user, data.tenantId);

    const db = getDb();
    const now = new Date();

    const [existing] = await db
      .select({ id: schema.rappiTenantConfig.id })
      .from(schema.rappiTenantConfig)
      .where(eq(schema.rappiTenantConfig.tenantId, data.tenantId))
      .limit(1);

    const patch = {
      storeId: data.storeId.trim(),
      enabled: data.enabled ?? false,
      pollingEnabled: data.pollingEnabled ?? true,
      updatedAt: now,
      ...(data.apiKey?.trim() ? { apiKey: data.apiKey.trim() } : {}),
      ...(data.webhookSecret?.trim() ? { webhookSecret: data.webhookSecret.trim() } : {}),
    };

    if (existing) {
      await db
        .update(schema.rappiTenantConfig)
        .set(patch)
        .where(eq(schema.rappiTenantConfig.tenantId, data.tenantId));
    } else {
      await db.insert(schema.rappiTenantConfig).values({
        tenantId: data.tenantId,
        ...patch,
      });
    }

    const [row] = await db
      .select()
      .from(schema.rappiTenantConfig)
      .where(eq(schema.rappiTenantConfig.tenantId, data.tenantId))
      .limit(1);

    return mapConfig(data.tenantId, row);
  });

export const pollRappiOrdersFn = createServerFn({ method: "POST" })
  .inputValidator((data: { tenantId: string }) => data)
  .handler(async ({ data }): Promise<RappiPollResultDto> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanManageIntegrations(user, data.tenantId);
    return pollTenantRappiOrders(data.tenantId);
  });
