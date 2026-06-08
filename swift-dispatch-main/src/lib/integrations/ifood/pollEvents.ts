import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import {
  acknowledgeIfoodEvents,
  fetchIfoodVirtualBag,
  pollIfoodEvents,
  type IfoodPollingEvent,
} from "./eventsClient";
import { processIfoodWebhook } from "./processEvent";
import { mapVirtualBagToPayload, minimalPayloadFromPollingEvent } from "./mapVirtualBag";
import { ensureIfoodAccessToken } from "./tokenStore";
import { IFOOD_PLACE_EVENT_CODES } from "./types";

export type IfoodPollResult = {
  skipped: boolean;
  reason?: string;
  events_received: number;
  events_processed: number;
  events_acknowledged: number;
  polled_at: string;
};

async function updatePollStatus(
  tenantId: string,
  status: "ok" | "no_events" | "error",
  message: string | null,
): Promise<void> {
  const db = getDb();
  await db
    .update(schema.ifoodTenantConfig)
    .set({
      lastPollAt: new Date(),
      lastPollStatus: status,
      lastPollMessage: message,
      updatedAt: new Date(),
    })
    .where(eq(schema.ifoodTenantConfig.tenantId, tenantId));
}

async function wasEventProcessed(tenantId: string, ifoodEventId: string): Promise<boolean> {
  const db = getDb();
  const [row] = await db
    .select({ id: schema.ifoodInboundEvents.id })
    .from(schema.ifoodInboundEvents)
    .where(
      and(
        eq(schema.ifoodInboundEvents.tenantId, tenantId),
        eq(schema.ifoodInboundEvents.ifoodEventId, ifoodEventId),
        eq(schema.ifoodInboundEvents.processed, true),
      ),
    )
    .limit(1);
  return !!row;
}

async function resolvePayload(accessToken: string, event: IfoodPollingEvent) {
  const code = (event.fullCode ?? event.code).toUpperCase();
  if (!IFOOD_PLACE_EVENT_CODES.has(code)) {
    return minimalPayloadFromPollingEvent(event);
  }

  const bag = await fetchIfoodVirtualBag(accessToken, event.orderId);
  return mapVirtualBagToPayload(bag, event);
}

export async function pollTenantIfoodEvents(tenantId: string): Promise<IfoodPollResult> {
  const db = getDb();
  const [config] = await db
    .select()
    .from(schema.ifoodTenantConfig)
    .where(eq(schema.ifoodTenantConfig.tenantId, tenantId))
    .limit(1);

  if (!config?.enabled) {
    return {
      skipped: true,
      reason: "integração_desativada",
      events_received: 0,
      events_processed: 0,
      events_acknowledged: 0,
      polled_at: new Date().toISOString(),
    };
  }

  if (config.pollingEnabled === false) {
    return {
      skipped: true,
      reason: "polling_desativado",
      events_received: 0,
      events_processed: 0,
      events_acknowledged: 0,
      polled_at: new Date().toISOString(),
    };
  }

  const accessToken = await ensureIfoodAccessToken(tenantId);
  if (!accessToken) {
    return {
      skipped: true,
      reason: "oauth_nao_conectado",
      events_received: 0,
      events_processed: 0,
      events_acknowledged: 0,
      polled_at: new Date().toISOString(),
    };
  }

  try {
    const events = await pollIfoodEvents(accessToken, config.merchantId);

    if (events.length === 0) {
      await updatePollStatus(tenantId, "no_events", null);
      return {
        skipped: false,
        events_received: 0,
        events_processed: 0,
        events_acknowledged: 0,
        polled_at: new Date().toISOString(),
      };
    }

    const ackIds: string[] = [];
    let processed = 0;

    for (const event of events) {
      if (await wasEventProcessed(tenantId, event.id)) {
        ackIds.push(event.id);
        continue;
      }

      try {
        const payload = await resolvePayload(accessToken, event);
        await processIfoodWebhook({
          tenantId,
          payload,
          source: "polling",
          ifoodEventId: event.id,
        });
        ackIds.push(event.id);
        processed++;
      } catch {
        /* não ACK — retry no próximo poll */
      }
    }

    if (ackIds.length > 0) {
      await acknowledgeIfoodEvents(accessToken, ackIds);
    }
    await updatePollStatus(
      tenantId,
      "ok",
      `${events.length} evento(s), ${processed} processado(s)`,
    );

    return {
      skipped: false,
      events_received: events.length,
      events_processed: processed,
      events_acknowledged: ackIds.length,
      polled_at: new Date().toISOString(),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro no polling";
    await updatePollStatus(tenantId, "error", message);
    throw err;
  }
}
