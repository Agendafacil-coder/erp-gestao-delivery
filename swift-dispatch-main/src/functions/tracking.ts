import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { OrderStatus } from "@/lib/ops/mock";
import { mapDriver, mapOrder } from "./mappers";

export type PublicLineItem = {
  name: string;
  quantity: number;
  unit_price: number;
  notes: string | null;
};

export type PublicTrackingPayload = {
  order: {
    id: string;
    code: string;
    status: OrderStatus;
    customer_name: string;
    address: string;
    placed_at: string;
    sla_minutes: number;
    channel: string;
    lat: number | null;
    lng: number | null;
    total_amount: number;
    payment_status: string;
  };
  line_items: PublicLineItem[];
  driver: {
    id: string;
    name: string;
    lat: number | null;
    lng: number | null;
    status: string;
  } | null;
  store: { lat: number; lng: number; name: string } | null;
};

export const getPublicTrackingFn = createServerFn({ method: "GET" })
  .inputValidator((data: { orderId: string; token: string }) => data)
  .handler(async ({ data }): Promise<PublicTrackingPayload> => {
    const db = getDb();

    const [order] = await db
      .select()
      .from(schema.orders)
      .where(
        and(eq(schema.orders.id, data.orderId), eq(schema.orders.trackingToken, data.token)),
      )
      .limit(1);

    if (!order) throw new Error("Pedido não encontrado ou link inválido");

    let driver = null;
    if (order.driverId) {
      const [d] = await db
        .select()
        .from(schema.drivers)
        .where(eq(schema.drivers.id, order.driverId))
        .limit(1);
      if (d) driver = mapDriver(d);
    }

    const [store] = order.storeId
      ? await db
          .select()
          .from(schema.stores)
          .where(eq(schema.stores.id, order.storeId))
          .limit(1)
      : [null];

    const lineRows = await db
      .select()
      .from(schema.orderLineItems)
      .where(eq(schema.orderLineItems.orderId, order.id));

    const mapped = mapOrder(order);

    return {
      order: {
        id: mapped.id,
        code: mapped.code,
        status: mapped.status,
        customer_name: mapped.customer_name,
        address: mapped.address,
        placed_at: mapped.placed_at,
        sla_minutes: mapped.sla_minutes,
        channel: mapped.channel,
        lat: mapped.lat,
        lng: mapped.lng,
        total_amount: Number(order.totalAmount),
        payment_status: order.paymentStatus,
      },
      line_items: lineRows.map((r) => ({
        name: r.name,
        quantity: r.quantity,
        unit_price: Number(r.unitPrice),
        notes: r.notes,
      })),
      driver:
        driver &&
        ["em_rota_coleta", "retirado", "em_rota_entrega", "entregue"].includes(mapped.status)
          ? {
              id: driver.id,
              name: driver.name,
              lat: driver.lat,
              lng: driver.lng,
              status: driver.status,
            }
          : null,
      store: store?.lat != null && store?.lng != null
        ? { lat: store.lat, lng: store.lng, name: store.name }
        : null,
    };
  });
