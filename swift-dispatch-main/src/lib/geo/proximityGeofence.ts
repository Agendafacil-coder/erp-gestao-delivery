import { and, eq, isNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { schema } from "@/db";
import type * as schemaType from "@/db/schema";
import { haversineKm } from "@/lib/map/geo";
import { notifyDriverArriving } from "@/lib/whatsapp/orderNotifications";

type Db = PostgresJsDatabase<typeof schemaType>;

/** WhatsApp ao cliente — entregador a menos de 500 m */
export const ARRIVING_NOTIFY_KM = 0.5;

/** Marca chegada ao destino — menos de 100 m */
export const ARRIVED_GEOFENCE_KM = 0.1;

export type GeofenceResult = {
  whatsappSent: string[];
  arrivedMarked: string[];
};

export async function processDriverProximityGeofence(
  db: Db,
  input: { tenantId: string; driverId: string; lat: number; lng: number },
): Promise<GeofenceResult> {
  const result: GeofenceResult = { whatsappSent: [], arrivedMarked: [] };

  const activeOrders = await db
    .select({
      id: schema.orders.id,
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

    const km = haversineKm(
      { lat: input.lat, lng: input.lng },
      { lat: order.lat, lng: order.lng },
    );
    const distanceM = Math.max(1, Math.round(km * 1000));

    if (km <= ARRIVING_NOTIFY_KM) {
      const [existing] = await db
        .select({ id: schema.whatsappMessageLogs.id })
        .from(schema.whatsappMessageLogs)
        .where(
          and(
            eq(schema.whatsappMessageLogs.orderId, order.id),
            eq(schema.whatsappMessageLogs.templateKey, "driver_arriving"),
          ),
        )
        .limit(1);

      if (!existing) {
        await notifyDriverArriving({
          orderId: order.id,
          tenantId: input.tenantId,
          distanceM,
        });
        result.whatsappSent.push(order.id);
      }
    }

    if (km <= ARRIVED_GEOFENCE_KM && !order.arrivedAt) {
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
      }
    }
  }

  return result;
}
