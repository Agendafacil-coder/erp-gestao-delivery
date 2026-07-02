import { eq } from "drizzle-orm";
import { getDb } from "@/db/connection.server";
import { schema } from "@/db";
import { isTenantFeatureEnabled } from "@/lib/tenant/featureFlags.server";
import { logAutomationRappiPoll } from "@/lib/ops/automationEventHelpers";
import { isRappiOAuthConfigured } from "./oauthClient";
import { fetchRappiStoreOrders } from "./ordersClient";
import { processRappiOrder } from "./processOrder";

export type RappiPollResult = {
  skipped: boolean;
  reason?: string;
  orders_received: number;
  orders_processed: number;
  polled_at: string;
};

async function updatePollStatus(
  tenantId: string,
  status: "ok" | "no_orders" | "error",
  message: string | null,
): Promise<void> {
  const db = getDb();
  await db
    .update(schema.rappiTenantConfig)
    .set({
      lastPollAt: new Date(),
      lastPollStatus: status,
      lastPollMessage: message,
      updatedAt: new Date(),
    })
    .where(eq(schema.rappiTenantConfig.tenantId, tenantId));
}

export async function pollTenantRappiOrders(tenantId: string): Promise<RappiPollResult> {
  const { isTenantAutomationEnabled } = await import("@/lib/ops/loadAutomationSettings");
  if (!(await isTenantAutomationEnabled(tenantId, "rappi-poll"))) {
    return {
      skipped: true,
      reason: "automacao_pausada",
      orders_received: 0,
      orders_processed: 0,
      polled_at: new Date().toISOString(),
    };
  }

  if (!(await isTenantFeatureEnabled(tenantId, "marketplace_rappi"))) {
    return {
      skipped: true,
      reason: "feature_desativada",
      orders_received: 0,
      orders_processed: 0,
      polled_at: new Date().toISOString(),
    };
  }

  const db = getDb();
  const [config] = await db
    .select()
    .from(schema.rappiTenantConfig)
    .where(eq(schema.rappiTenantConfig.tenantId, tenantId))
    .limit(1);

  if (!config?.enabled) {
    return {
      skipped: true,
      reason: "integração_desativada",
      orders_received: 0,
      orders_processed: 0,
      polled_at: new Date().toISOString(),
    };
  }

  if (config.pollingEnabled === false) {
    return {
      skipped: true,
      reason: "polling_desativado",
      orders_received: 0,
      orders_processed: 0,
      polled_at: new Date().toISOString(),
    };
  }

  if (!config.storeId?.trim()) {
    return {
      skipped: true,
      reason: "store_id_ausente",
      orders_received: 0,
      orders_processed: 0,
      polled_at: new Date().toISOString(),
    };
  }

  if (!isRappiOAuthConfigured()) {
    return {
      skipped: true,
      reason: "oauth_nao_configurado",
      orders_received: 0,
      orders_processed: 0,
      polled_at: new Date().toISOString(),
    };
  }

  try {
    const orders = await fetchRappiStoreOrders(config.storeId);
    let processed = 0;

    for (const order of orders) {
      const result = await processRappiOrder({
        tenantId,
        payload: order,
        source: "polling",
      });
      if (result.orderId) processed += 1;
    }

    await updatePollStatus(
      tenantId,
      orders.length > 0 ? "ok" : "no_orders",
      orders.length > 0 ? `${processed} pedido(s) importado(s)` : null,
    );

    if (processed > 0) logAutomationRappiPoll(tenantId, processed);

    return {
      skipped: false,
      orders_received: orders.length,
      orders_processed: processed,
      polled_at: new Date().toISOString(),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await updatePollStatus(tenantId, "error", message);
    throw err;
  }
}
