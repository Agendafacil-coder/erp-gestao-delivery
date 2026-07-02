import { eq } from "drizzle-orm";
import { getDb } from "@/db/connection.server";
import { schema } from "@/db";
import { isTenantFeatureEnabled } from "@/lib/tenant/featureFlags.server";
import { logAutomationFood99Poll } from "@/lib/ops/automationEventHelpers";
import { acknowledgeFood99Events, pollFood99Events } from "./eventsClient";
import { processFood99Event } from "./processOrder";
import { ensureFood99AccessToken } from "./tokenStore";

export type Food99PollResult = {
  skipped: boolean;
  reason?: string;
  events_received: number;
  orders_processed: number;
  polled_at: string;
};

async function updatePollStatus(
  tenantId: string,
  status: "ok" | "no_events" | "error",
  message: string | null,
): Promise<void> {
  const db = getDb();
  await db
    .update(schema.food99TenantConfig)
    .set({
      lastPollAt: new Date(),
      lastPollStatus: status,
      lastPollMessage: message,
      updatedAt: new Date(),
    })
    .where(eq(schema.food99TenantConfig.tenantId, tenantId));
}

export async function pollTenantFood99Events(tenantId: string): Promise<Food99PollResult> {
  const { isTenantAutomationEnabled } = await import("@/lib/ops/loadAutomationSettings");
  if (!(await isTenantAutomationEnabled(tenantId, "food99-poll"))) {
    return {
      skipped: true,
      reason: "automacao_pausada",
      events_received: 0,
      orders_processed: 0,
      polled_at: new Date().toISOString(),
    };
  }

  if (!(await isTenantFeatureEnabled(tenantId, "marketplace_99food"))) {
    return {
      skipped: true,
      reason: "feature_desativada",
      events_received: 0,
      orders_processed: 0,
      polled_at: new Date().toISOString(),
    };
  }

  const db = getDb();
  const [config] = await db
    .select()
    .from(schema.food99TenantConfig)
    .where(eq(schema.food99TenantConfig.tenantId, tenantId))
    .limit(1);

  if (!config?.enabled) {
    return {
      skipped: true,
      reason: "integração_desativada",
      events_received: 0,
      orders_processed: 0,
      polled_at: new Date().toISOString(),
    };
  }

  if (config.pollingEnabled === false) {
    return {
      skipped: true,
      reason: "polling_desativado",
      events_received: 0,
      orders_processed: 0,
      polled_at: new Date().toISOString(),
    };
  }

  if (!config.merchantId?.trim() || !config.clientId?.trim() || !config.clientSecret?.trim()) {
    return {
      skipped: true,
      reason: "credenciais_ausentes",
      events_received: 0,
      orders_processed: 0,
      polled_at: new Date().toISOString(),
    };
  }

  const accessToken = await ensureFood99AccessToken(tenantId);
  if (!accessToken) {
    return {
      skipped: true,
      reason: "oauth_nao_conectado",
      events_received: 0,
      orders_processed: 0,
      polled_at: new Date().toISOString(),
    };
  }

  try {
    const events = await pollFood99Events(accessToken, config.apiBase, config.merchantId);
    let processed = 0;
    const ackIds: string[] = [];

    for (const event of events) {
      const result = await processFood99Event({
        tenantId,
        event,
        source: "polling",
      });
      if (event.id) ackIds.push(event.id);
      if (result.orderId) processed += 1;
    }

    if (ackIds.length > 0) {
      await acknowledgeFood99Events(accessToken, ackIds, config.apiBase).catch((err) => {
        console.error("[food99] ack failed:", err instanceof Error ? err.message : err);
      });
    }

    await updatePollStatus(
      tenantId,
      events.length > 0 ? "ok" : "no_events",
      events.length > 0 ? `${processed} pedido(s) importado(s)` : null,
    );

    if (processed > 0) logAutomationFood99Poll(tenantId, processed);

    return {
      skipped: false,
      events_received: events.length,
      orders_processed: processed,
      polled_at: new Date().toISOString(),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await updatePollStatus(tenantId, "error", message);
    throw err;
  }
}
