import { and, eq, isNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { schema } from "@/db";
import type * as schemaType from "@/db/schema";
import { ARRIVED_GEOFENCE_KM, ARRIVING_NOTIFY_KM } from "@/lib/geo/proximityConstants";
import { haversineKm } from "@/lib/map/geo";
import { pushServerAutomationEvent } from "@/lib/ops/automationEventBus";
import { isTenantAutomationEnabled } from "@/lib/ops/loadAutomationSettings";
import { notifyDriverArriving } from "@/lib/whatsapp/orderNotifications";

type Db = PostgresJsDatabase<typeof schemaType>;

export type GeofenceResult = {
  whatsappSent: string[];
  arrivedMarked: string[];
};

export async function processDriverProximityGeofence(
  db: Db,
  input: { tenantId: string; driverId: string; lat: number; lng: number },
): Promise<GeofenceResult> {
  const result: GeofenceResult = { whatsappSent: [], arrivedMarked: [] };
  const arrivingEnabled = await isTenantAutomationEnabled(input.tenantId, "geofence-arriving");
  const arrivedEnabled = await isTenantAutomationEnabled(input.tenantId, "geofence-arrived");

  const activeOrders = await db
    .select({
      id: schema.orders.id,
      code: schema.orders.code,
      lat: schema.orders.lat,
      lng: schema.orders.lng,
      arrivedAt: schema.orders.arrivedAt,
    })
    .from(schema.orders)
    .where(
      and(
        eq(schema.orders.tenantId, input.tenantId),
        eq(schema.orders.driverId, input.driverId),
        eq(schema.orders.status, "em_rota_entrega"),
      ),
    );

  for (const order of activeOrders) {
    if (order.lat == null || order.lng == null) continue;

    const km = haversineKm({ lat: input.lat, lng: input.lng }, { lat: order.lat, lng: order.lng });
    const distanceM = Math.max(1, Math.round(km * 1000));

    if (arrivingEnabled && km <= ARRIVING_NOTIFY_KM) {
      const sent = await notifyDriverArriving({
        orderId: order.id,
        tenantId: input.tenantId,
        distanceM,
      });
      if (sent) {
        result.whatsappSent.push(order.id);
        pushServerAutomationEvent(input.tenantId, {
          id: `wa-arriving-${order.id}`,
          ruleId: "geofence-arriving",
          message: `[GEOFENCE] ${order.code} — WhatsApp cliente (${distanceM} m)`,
          level: "info",
        });
      }
    }

    if (arrivedEnabled && km <= ARRIVED_GEOFENCE_KM && !order.arrivedAt) {
      const updated = await db
        .update(schema.orders)
        .set({ arrivedAt: new Date(), updatedAt: new Date() })
        .where(
          and(
            eq(schema.orders.id, order.id),
            eq(schema.orders.tenantId, input.tenantId),
            isNull(schema.orders.arrivedAt),
          ),
        )
        .returning({ id: schema.orders.id });

      if (updated.length > 0) {
        result.arrivedMarked.push(order.id);
        pushServerAutomationEvent(input.tenantId, {
          id: `arrived-${order.id}`,
          ruleId: "geofence-arrived",
          message: `[GEOFENCE] ${order.code} — chegada registrada (<100 m)`,
          level: "success",
        });
      }
    }
  }

  return result;
}
