import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, ne } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { webhookUrl, WEBHOOK_ENDPOINTS } from "@/lib/integrations/endpoints";
import { fetchUserCode } from "@/lib/integrations/ifood/oauthClient";
import { processIfoodWebhook } from "@/lib/integrations/ifood/processEvent";
import {
  clearIfoodOAuth,
  completeIfoodDistributedOAuth,
  connectIfoodCentralized,
  ensureIfoodAccessToken,
} from "@/lib/integrations/ifood/tokenStore";
import { pollTenantIfoodEvents } from "@/lib/integrations/ifood/pollEvents";
import type {
  IfoodInboundEventDto,
  IfoodPollResultDto,
  IfoodTenantConfigDto,
  IfoodUserCodeDto,
} from "@/lib/integrations/ifood/types";
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
  row: typeof schema.ifoodTenantConfig.$inferSelect | undefined,
): IfoodTenantConfigDto {
  return {
    tenant_id: tenantId,
    merchant_id: row?.merchantId ?? null,
    webhook_secret_set: !!row?.webhookSecret?.trim(),
    enabled: row?.enabled ?? false,
    webhook_url: webhookUrl("/api/integrations/ifood/webhook"),
    client_id: row?.clientId ?? null,
    has_client_credentials: !!(row?.clientId && row?.clientSecret),
    oauth_connected: !!row?.accessToken,
    token_expires_at: row?.tokenExpiresAt?.toISOString() ?? null,
    pending_user_code: row?.pendingUserCode ?? null,
    verification_url: row?.verificationUrl ?? null,
    pending_user_code_expires_at: row?.pendingUserCodeExpiresAt?.toISOString() ?? null,
    polling_enabled: row?.pollingEnabled ?? true,
    last_poll_at: row?.lastPollAt?.toISOString() ?? null,
    last_poll_status: row?.lastPollStatus ?? null,
    last_poll_message: row?.lastPollMessage ?? null,
  };
}

function mapIfoodEvent(row: typeof schema.ifoodInboundEvents.$inferSelect): IfoodInboundEventDto {
  return {
    id: row.id,
    tenant_id: row.tenantId,
    event_type: row.eventType,
    external_order_id: row.externalOrderId,
    order_id: row.orderId,
    processed: row.processed,
    error_message: row.errorMessage,
    source: row.source,
    created_at: row.createdAt.toISOString(),
  };
}

export const getIfoodConfigFn = createServerFn({ method: "GET" })
  .inputValidator((data: { tenantId: string }) => data)
  .handler(async ({ data }): Promise<IfoodTenantConfigDto> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);

    const db = getDb();
    const [row] = await db
      .select()
      .from(schema.ifoodTenantConfig)
      .where(eq(schema.ifoodTenantConfig.tenantId, data.tenantId))
      .limit(1);

    return mapConfig(data.tenantId, row);
  });

export const saveIfoodConfigFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      tenantId: string;
      merchantId: string;
      webhookSecret?: string;
      enabled?: boolean;
      pollingEnabled?: boolean;
      clientId?: string;
      clientSecret?: string;
    }) => data,
  )
  .handler(async ({ data }): Promise<IfoodTenantConfigDto> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);

    const db = getDb();
    const rawMerchantId = data.merchantId.trim();
    const merchantId =
      rawMerchantId && rawMerchantId !== "pending"
        ? rawMerchantId
        : `pending-${data.tenantId}`;

    const [merchantConflict] = await db
      .select({ tenantId: schema.ifoodTenantConfig.tenantId })
      .from(schema.ifoodTenantConfig)
      .where(
        and(
          eq(schema.ifoodTenantConfig.merchantId, merchantId),
          ne(schema.ifoodTenantConfig.tenantId, data.tenantId),
        ),
      )
      .limit(1);
    if (merchantConflict) {
      throw new Error("Este Merchant ID já está vinculado a outro tenant.");
    }

    const [current] = await db
      .select()
      .from(schema.ifoodTenantConfig)
      .where(eq(schema.ifoodTenantConfig.tenantId, data.tenantId))
      .limit(1);

    const nextSecret =
      data.webhookSecret?.trim() ||
      (data.webhookSecret === undefined ? current?.webhookSecret ?? null : null);

    const willEnable = data.enabled ?? current?.enabled ?? true;
    if (willEnable && !nextSecret?.trim()) {
      throw new Error("Configure o webhook secret antes de ativar a integração iFood.");
    }

    const patch: Partial<typeof schema.ifoodTenantConfig.$inferInsert> = {
      tenantId: data.tenantId,
      merchantId,
      enabled: data.enabled ?? true,
      updatedAt: new Date(),
    };

    if (data.webhookSecret !== undefined) {
      patch.webhookSecret = data.webhookSecret.trim() || null;
    }

    if (data.pollingEnabled !== undefined) {
      patch.pollingEnabled = data.pollingEnabled;
    }

    if (data.clientId !== undefined) {
      patch.clientId = data.clientId.trim() || null;
    }
    if (data.clientSecret !== undefined && data.clientSecret.trim()) {
      patch.clientSecret = data.clientSecret.trim();
    }

    await db.insert(schema.ifoodTenantConfig).values(patch).onConflictDoUpdate({
      target: schema.ifoodTenantConfig.tenantId,
      set: patch,
    });

    const [row] = await db
      .select()
      .from(schema.ifoodTenantConfig)
      .where(eq(schema.ifoodTenantConfig.tenantId, data.tenantId))
      .limit(1);

    return mapConfig(data.tenantId, row);
  });

export const requestIfoodUserCodeFn = createServerFn({ method: "POST" })
  .inputValidator((data: { tenantId: string }) => data)
  .handler(async ({ data }): Promise<IfoodUserCodeDto> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);

    const db = getDb();
    const [config] = await db
      .select()
      .from(schema.ifoodTenantConfig)
      .where(eq(schema.ifoodTenantConfig.tenantId, data.tenantId))
      .limit(1);

    if (!config?.clientId) {
      throw new Error("Informe o Client ID nas credenciais OAuth antes de gerar o código.");
    }

    const userCode = await fetchUserCode(config.clientId);
    const expiresAt = new Date(Date.now() + userCode.expiresIn * 1000);

    await db
      .insert(schema.ifoodTenantConfig)
      .values({
        tenantId: data.tenantId,
        clientId: config.clientId,
        pendingUserCode: userCode.userCode,
        authorizationCodeVerifier: userCode.authorizationCodeVerifier,
        verificationUrl: userCode.verificationUrlComplete,
        pendingUserCodeExpiresAt: expiresAt,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: schema.ifoodTenantConfig.tenantId,
        set: {
          pendingUserCode: userCode.userCode,
          authorizationCodeVerifier: userCode.authorizationCodeVerifier,
          verificationUrl: userCode.verificationUrlComplete,
          pendingUserCodeExpiresAt: expiresAt,
          updatedAt: new Date(),
        },
      });

    return {
      user_code: userCode.userCode,
      verification_url: userCode.verificationUrlComplete,
      expires_at: expiresAt.toISOString(),
    };
  });

export const completeIfoodOAuthFn = createServerFn({ method: "POST" })
  .inputValidator((data: { tenantId: string; authorizationCode: string }) => data)
  .handler(async ({ data }): Promise<IfoodTenantConfigDto> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);

    await completeIfoodDistributedOAuth(data.tenantId, data.authorizationCode);

    const db = getDb();
    const [row] = await db
      .select()
      .from(schema.ifoodTenantConfig)
      .where(eq(schema.ifoodTenantConfig.tenantId, data.tenantId))
      .limit(1);

    return mapConfig(data.tenantId, row);
  });

export const connectIfoodCentralizedFn = createServerFn({ method: "POST" })
  .inputValidator((data: { tenantId: string }) => data)
  .handler(async ({ data }): Promise<IfoodTenantConfigDto> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);

    await connectIfoodCentralized(data.tenantId);

    const db = getDb();
    const [row] = await db
      .select()
      .from(schema.ifoodTenantConfig)
      .where(eq(schema.ifoodTenantConfig.tenantId, data.tenantId))
      .limit(1);

    return mapConfig(data.tenantId, row);
  });

export const disconnectIfoodOAuthFn = createServerFn({ method: "POST" })
  .inputValidator((data: { tenantId: string }) => data)
  .handler(async ({ data }): Promise<IfoodTenantConfigDto> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);

    await clearIfoodOAuth(data.tenantId);

    const db = getDb();
    const [row] = await db
      .select()
      .from(schema.ifoodTenantConfig)
      .where(eq(schema.ifoodTenantConfig.tenantId, data.tenantId))
      .limit(1);

    return mapConfig(data.tenantId, row);
  });

export const refreshIfoodTokenFn = createServerFn({ method: "POST" })
  .inputValidator((data: { tenantId: string }) => data)
  .handler(async ({ data }): Promise<IfoodTenantConfigDto> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);

    await ensureIfoodAccessToken(data.tenantId);

    const db = getDb();
    const [row] = await db
      .select()
      .from(schema.ifoodTenantConfig)
      .where(eq(schema.ifoodTenantConfig.tenantId, data.tenantId))
      .limit(1);

    return mapConfig(data.tenantId, row);
  });

export const simulateIfoodWebhookFn = createServerFn({ method: "POST" })
  .inputValidator((data: { tenantId: string }) => data)
  .handler(async ({ data }): Promise<{ order_id: string | null }> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);

    const db = getDb();
    const [config] = await db
      .select()
      .from(schema.ifoodTenantConfig)
      .where(eq(schema.ifoodTenantConfig.tenantId, data.tenantId))
      .limit(1);

    if (!config?.merchantId) {
      throw new Error("Configure o Merchant ID antes de simular um pedido.");
    }

    const externalId = `ifood-sim-${Date.now()}`;
    const result = await processIfoodWebhook({
      tenantId: data.tenantId,
      payload: {
        code: "PLC",
        orderId: externalId,
        merchantId: config.merchantId,
        customer: { name: "Cliente iFood (simulado)", phone: "11988776655" },
        delivery: {
          deliveryAddress: { formattedAddress: "Av. Paulista, 1000, Bela Vista" },
        },
        total: { orderAmount: 52.9, deliveryFee: 6.9 },
        items: [{ name: "Combo Burger", quantity: 1, unitPrice: 46.0 }],
      },
    });

    return { order_id: result.orderId };
  });

export const listIfoodEventsFn = createServerFn({ method: "GET" })
  .inputValidator((data: { tenantId: string; limit?: number }) => data)
  .handler(async ({ data }): Promise<IfoodInboundEventDto[]> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);

    const db = getDb();
    const limit = Math.min(data.limit ?? 30, 100);
    const rows = await db
      .select()
      .from(schema.ifoodInboundEvents)
      .where(eq(schema.ifoodInboundEvents.tenantId, data.tenantId))
      .orderBy(desc(schema.ifoodInboundEvents.createdAt))
      .limit(limit);

    return rows.map(mapIfoodEvent);
  });

export const pollIfoodEventsFn = createServerFn({ method: "POST" })
  .inputValidator((data: { tenantId: string }) => data)
  .handler(async ({ data }): Promise<IfoodPollResultDto> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);

    try {
      return await pollTenantIfoodEvents(data.tenantId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro no polling iFood";
      return {
        skipped: false,
        error: true,
        reason: message,
        events_received: 0,
        events_processed: 0,
        events_acknowledged: 0,
        polled_at: new Date().toISOString(),
      };
    }
  });

export const getIntegrationWebhooksFn = createServerFn({ method: "GET" })
  .inputValidator((data: { tenantId: string }) => data)
  .handler(async ({ data }) => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);

    return {
      base_url: webhookUrl(""),
      endpoints: {
        mercadopago: webhookUrl(WEBHOOK_ENDPOINTS.payments.mercadopago.path),
        ifood: webhookUrl(WEBHOOK_ENDPOINTS.ifood.orders.path),
        mock_payment: webhookUrl(WEBHOOK_ENDPOINTS.payments.mockConfirm.path),
      },
      docs: WEBHOOK_ENDPOINTS,
    };
  });
