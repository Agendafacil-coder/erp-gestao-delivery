import { createServerFn } from "@tanstack/react-start";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/connection.server";
import { schema } from "@/db";
import { assertCanAccessOpsSnapshot } from "@/lib/rbac";
import type { OrderStatus } from "@/lib/ops/orderWorkflow";
import { ARRIVING_NOTIFY_KM } from "@/lib/geo/proximityConstants";
import { haversineKm } from "@/lib/map/geo";
import { mapDriver, mapOrder } from "./mappers";
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
    payment_method: string | null;
    arrived_at: string | null;
    driver_distance_m: number | null;
    driver_arriving: boolean;
  };
  pending_payment: {
    provider: string;
    pix_copy_paste: string | null;
    pix_qr_base64: string | null;
    checkout_url: string | null;
  } | null;
  line_items: PublicLineItem[];
  review: {
    score: number;
    comment: string | null;
    created_at: string;
  } | null;
  driver: {
    id: string;
    name: string;
    lat: number | null;
    lng: number | null;
    status: string;
  } | null;
  store: { lat: number; lng: number; name: string } | null;
  restaurant: { name: string; logo_url: string | null };
  trail: Array<{ lat: number; lng: number }>;
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

    const [tenant] = await db
      .select({ name: schema.tenants.name })
      .from(schema.tenants)
      .where(eq(schema.tenants.id, order.tenantId))
      .limit(1);

    const [menuSettings] = await db
      .select({ menuLogoUrl: schema.tenantMenuSettings.menuLogoUrl })
      .from(schema.tenantMenuSettings)
      .where(eq(schema.tenantMenuSettings.tenantId, order.tenantId))
      .limit(1);

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

    const [reviewRow] = await db
      .select()
      .from(schema.orderReviews)
      .where(eq(schema.orderReviews.orderId, order.id))
      .limit(1);

    const mapped = mapOrder(order);

    let trail: Array<{ lat: number; lng: number }> = [];
    if (order.driverId && mapped.status === "em_rota_entrega") {
      const trailRows = await db
        .select({ lat: schema.driverLocations.lat, lng: schema.driverLocations.lng })
        .from(schema.driverLocations)
        .where(
          and(
            eq(schema.driverLocations.driverId, order.driverId),
            eq(schema.driverLocations.orderId, order.id),
          ),
        )
        .orderBy(asc(schema.driverLocations.recordedAt))
        .limit(300);

      trail = trailRows.map((r) => ({ lat: r.lat, lng: r.lng }));
    }

    const [pendingPayment] =
      order.paymentStatus === "pendente"
        ? await db
            .select({
              provider: schema.payments.provider,
              pixCopyPaste: schema.payments.pixCopyPaste,
              pixQrBase64: schema.payments.pixQrBase64,
              checkoutUrl: schema.payments.checkoutUrl,
              externalId: schema.payments.externalId,
            })
            .from(schema.payments)
            .where(
              and(
                eq(schema.payments.orderId, order.id),
                eq(schema.payments.status, "pendente"),
              ),
            )
            .orderBy(desc(schema.payments.createdAt))
            .limit(1)
        : [null];

    let driverDistanceM: number | null = null;
    let driverArriving = false;
    const arrivedAt = mapped.arrived_at;

    if (
      driver &&
      mapped.status === "em_rota_entrega" &&
      driver.lat != null &&
      driver.lng != null &&
      mapped.lat != null &&
      mapped.lng != null
    ) {
      const km = haversineKm(
        { lat: driver.lat, lng: driver.lng },
        { lat: mapped.lat, lng: mapped.lng },
      );
      driverDistanceM = Math.max(1, Math.round(km * 1000));
      driverArriving = !!arrivedAt || km <= ARRIVING_NOTIFY_KM;
    }

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
        payment_method: order.paymentMethod,
        arrived_at: arrivedAt,
        driver_distance_m: driverDistanceM,
        driver_arriving: driverArriving,
      },
      pending_payment: pendingPayment
        ? {
            provider: pendingPayment.provider,
            pix_copy_paste: pendingPayment.pixCopyPaste,
            pix_qr_base64: pendingPayment.pixQrBase64,
            checkout_url: pendingPayment.checkoutUrl,
          }
        : null,
      line_items: lineRows.map((r) => ({
        name: r.name,
        quantity: r.quantity,
        unit_price: Number(r.unitPrice),
        notes: r.notes,
      })),
      review: reviewRow
        ? {
            score: reviewRow.score,
            comment: reviewRow.comment,
            created_at: reviewRow.createdAt.toISOString(),
          }
        : null,
      driver:
        driver &&
        ["aguardando_entregador", "em_rota_entrega"].includes(mapped.status)
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
      restaurant: {
        name: tenant?.name ?? store?.name ?? "Restaurante",
        logo_url: menuSettings?.menuLogoUrl ?? null,
      },
      trail,
    };
  });

export type OpsOrderTrailPayload = {
  trail: Array<{ lat: number; lng: number }>;
};

/** Trajeto GPS de um pedido — painel operacional autenticado */
export const getOpsOrderTrailFn = createServerFn({ method: "GET" })
  .inputValidator((data: { tenantId: string; orderId: string }) => data)
  .handler(async ({ data }): Promise<OpsOrderTrailPayload> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanAccessOpsSnapshot(user, data.tenantId);

    const db = getDb();
    const [order] = await db
      .select()
      .from(schema.orders)
      .where(and(eq(schema.orders.id, data.orderId), eq(schema.orders.tenantId, data.tenantId)))
      .limit(1);

    if (!order?.driverId) return { trail: [] };

    const trailRows = await db
      .select({ lat: schema.driverLocations.lat, lng: schema.driverLocations.lng })
      .from(schema.driverLocations)
      .where(
        and(
          eq(schema.driverLocations.tenantId, data.tenantId),
          eq(schema.driverLocations.driverId, order.driverId),
          eq(schema.driverLocations.orderId, order.id),
        ),
      )
      .orderBy(asc(schema.driverLocations.recordedAt))
      .limit(500);

    if (trailRows.length > 0) {
      return { trail: trailRows.map((r) => ({ lat: r.lat, lng: r.lng })) };
    }

    // Fallback: últimos pontos do entregador (sem vínculo de pedido)
    const recentRows = await db
      .select({ lat: schema.driverLocations.lat, lng: schema.driverLocations.lng })
      .from(schema.driverLocations)
      .where(
        and(
          eq(schema.driverLocations.tenantId, data.tenantId),
          eq(schema.driverLocations.driverId, order.driverId),
        ),
      )
      .orderBy(desc(schema.driverLocations.recordedAt))
      .limit(80);

    return {
      trail: recentRows.reverse().map((r) => ({ lat: r.lat, lng: r.lng })),
    };
  });

export type DriverGpsHealth = {
  driverId: string;
  lastSeenAt: string | null;
  staleMinutes: number | null;
};

export type OpsDriversGpsHealthPayload = {
  drivers: DriverGpsHealth[];
};

const GPS_STALE_MINUTES = 3;

/** Último ping GPS por entregador online — alertas de rastreio */
export const getOpsDriversGpsHealthFn = createServerFn({ method: "GET" })
  .inputValidator((data: { tenantId: string; driverIds: string[] }) => data)
  .handler(async ({ data }): Promise<OpsDriversGpsHealthPayload> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanAccessOpsSnapshot(user, data.tenantId);

    if (data.driverIds.length === 0) return { drivers: [] };

    const db = getDb();
    const rows = await db
      .select({
        driverId: schema.driverLocations.driverId,
        recordedAt: schema.driverLocations.recordedAt,
      })
      .from(schema.driverLocations)
      .where(
        and(
          eq(schema.driverLocations.tenantId, data.tenantId),
          inArray(schema.driverLocations.driverId, data.driverIds),
        ),
      )
      .orderBy(desc(schema.driverLocations.recordedAt));

    const lastByDriver = new Map<string, Date>();
    for (const row of rows) {
      if (!lastByDriver.has(row.driverId)) {
        lastByDriver.set(row.driverId, row.recordedAt);
      }
    }

    const now = Date.now();
    return {
      drivers: data.driverIds.map((driverId) => {
        const last = lastByDriver.get(driverId);
        if (!last) {
          return { driverId, lastSeenAt: null, staleMinutes: null };
        }
        const staleMinutes = Math.floor((now - last.getTime()) / 60_000);
        return {
          driverId,
          lastSeenAt: last.toISOString(),
          staleMinutes: staleMinutes >= GPS_STALE_MINUTES ? staleMinutes : null,
        };
      }),
    };
  });
