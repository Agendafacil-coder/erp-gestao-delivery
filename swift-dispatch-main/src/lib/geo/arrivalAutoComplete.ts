import { and, eq, isNotNull, lte } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { schema } from "@/db";
import type * as schemaType from "@/db/schema";
import { syncDriversForOrderChange } from "@/lib/drivers/syncActiveOrders";
import { recordCmvOnDelivery } from "@/lib/finance/recordCmvOnDelivery";
import { pushServerAutomationEvent } from "@/lib/ops/automationEventBus";
import { isTenantAutomationEnabled } from "@/lib/ops/loadAutomationSettings";
import { notifyOrderStatusChange } from "@/lib/whatsapp/orderNotifications";

type Db = PostgresJsDatabase<typeof schemaType>;

/** Minutos após `arrived_at` para marcar entrega automaticamente */
export const AUTO_COMPLETE_AFTER_ARRIVAL_MIN = 3;

export type ArrivalAutoCompleteResult = {
  completed: string[];
};

export async function processArrivalAutoComplete(
  db: Db,
  input: { tenantId: string; driverId: string },
): Promise<ArrivalAutoCompleteResult> {
  const result: ArrivalAutoCompleteResult = { completed: [] };
  if (!(await isTenantAutomationEnabled(input.tenantId, "auto-complete"))) {
    return result;
  }
  const cutoff = new Date(Date.now() - AUTO_COMPLETE_AFTER_ARRIVAL_MIN * 60_000);

  const candidates = await db
    .select({
      id: schema.orders.id,
      code: schema.orders.code,
      driverId: schema.orders.driverId,
      paymentMethod: schema.orders.paymentMethod,
    })
    .from(schema.orders)
    .where(
      and(
        eq(schema.orders.tenantId, input.tenantId),
        eq(schema.orders.driverId, input.driverId),
        eq(schema.orders.status, "em_rota_entrega"),
        isNotNull(schema.orders.arrivedAt),
        lte(schema.orders.arrivedAt, cutoff),
      ),
    );

  for (const order of candidates) {
    const paymentPatch =
      order.paymentMethod === "on_delivery" ? { paymentStatus: "pago" as const } : {};

    const updated = await db
      .update(schema.orders)
      .set({
        status: "entregue",
        deliveredAt: new Date(),
        updatedAt: new Date(),
        ...paymentPatch,
      })
      .where(
        and(
          eq(schema.orders.id, order.id),
          eq(schema.orders.tenantId, input.tenantId),
          eq(schema.orders.status, "em_rota_entrega"),
        ),
      )
      .returning({ id: schema.orders.id });

    if (updated.length === 0) continue;

    result.completed.push(order.id);

    pushServerAutomationEvent(input.tenantId, {
      id: `complete-${order.id}`,
      ruleId: "auto-complete",
      message: `[ENTREGA] ${order.code} auto-finalizado após geofence`,
      level: "success",
    });

    await db.insert(schema.orderEvents).values({
      orderId: order.id,
      tenantId: input.tenantId,
      fromStatus: "em_rota_entrega",
      toStatus: "entregue",
      note: `Auto-finalizado ${AUTO_COMPLETE_AFTER_ARRIVAL_MIN} min após chegada (geofence)`,
    });

    try {
      await recordCmvOnDelivery(db, order.id, input.tenantId);
    } catch {
      /* CMV não bloqueia entrega */
    }

    void notifyOrderStatusChange({
      orderId: order.id,
      tenantId: input.tenantId,
      fromStatus: "em_rota_entrega",
      toStatus: "entregue",
    }).catch(() => {});

    await syncDriversForOrderChange(db, order.driverId, order.driverId);
  }

  return result;
}
