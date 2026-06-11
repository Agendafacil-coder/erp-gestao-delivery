import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/connection.server";
import { schema } from "@/db";
import type { LocalDriver, LocalOrder } from "@/lib/db/localDb";
import { calcDriverPayout } from "@/lib/drivers/driverPayout";
import {
  buildDriverHistory,
  computeDriverDayStats,
  type DriverDayStats,
  type DriverDeliveryHistoryItem,
} from "@/lib/drivers/driverStats";
import {
  isDriverActiveOrder,
  needsDispatch,
  normalizeOrderStatus,
} from "@/lib/ops/orderWorkflow";
import { assertCanAcceptOrderAsDriver, assertCanManageDrivers } from "@/lib/rbac";
import { syncDriverActiveOrders } from "@/lib/drivers/syncActiveOrders";
import {
  assertDriverAvailableForAssignment,
  markDriverEmRota,
} from "@/lib/drivers/driverAssignment";
import { mapTenantMenuSettingsRow } from "@/lib/menu/public-settings";
import { mapDriver, mapOrder } from "./mappers";
import { getMyDriverFn } from "./drivers";
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

export type {
  DriverDashboardData,
  DriverOrderView,
  DriverStoreInfo,
} from "@/lib/drivers/driverOps.types";
import type { DriverDashboardData, DriverOrderView, DriverStoreInfo } from "@/lib/drivers/driverOps.types";

function toDriverOrderView(row: {
  id: string;
  code: string;
  status: string;
  customerName: string;
  customerPhone: string | null;
  address: string;
  neighborhood?: string | null;
  postalCode?: string | null;
  lat: number | null;
  lng: number | null;
  itemsCount: number;
  placedAt: Date;
  pickedUpAt?: Date | null;
  deliveryFee?: string | null;
  notes: string | null;
}): DriverOrderView {
  const deliveryFee = row.deliveryFee != null ? Number(row.deliveryFee) : 0;
  return {
    id: row.id,
    code: row.code,
    status: normalizeOrderStatus(row.status),
    customer_name: row.customerName,
    customer_phone: row.customerPhone ?? "",
    address: row.address,
    neighborhood: row.neighborhood ?? null,
    postal_code: row.postalCode ?? null,
    lat: row.lat,
    lng: row.lng,
    items_count: row.itemsCount,
    placed_at: row.placedAt.toISOString(),
    picked_up_at: row.pickedUpAt?.toISOString() ?? null,
    driver_payout: calcDriverPayout({ delivery_fee: deliveryFee }),
    notes: row.notes,
  };
}

const driverOrderSelect = {
  id: schema.orders.id,
  code: schema.orders.code,
  status: schema.orders.status,
  customerName: schema.orders.customerName,
  customerPhone: schema.orders.customerPhone,
  address: schema.orders.address,
  neighborhood: schema.orders.neighborhood,
  postalCode: schema.orders.postalCode,
  lat: schema.orders.lat,
  lng: schema.orders.lng,
  itemsCount: schema.orders.itemsCount,
  placedAt: schema.orders.placedAt,
  pickedUpAt: schema.orders.pickedUpAt,
  deliveryFee: schema.orders.deliveryFee,
  notes: schema.orders.notes,
  driverId: schema.orders.driverId,
  deliveredAt: schema.orders.deliveredAt,
};

export const getDriverDashboardFn = createServerFn({ method: "GET" })
  .inputValidator((data: { tenantId: string }) => data)
  .handler(async ({ data }): Promise<DriverDashboardData | null> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);

    const driver = await getMyDriverFn({ data: { tenantId: data.tenantId } });
    if (!driver) return null;

    const db = getDb();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    let rows: Array<typeof driverOrderSelect & { driverId: string | null; deliveredAt: Date | null }>;
    try {
      rows = await db
        .select(driverOrderSelect)
        .from(schema.orders)
        .where(eq(schema.orders.tenantId, data.tenantId))
        .orderBy(desc(schema.orders.placedAt));
    } catch {
      const basic = await db
        .select({
          id: schema.orders.id,
          code: schema.orders.code,
          status: schema.orders.status,
          customerName: schema.orders.customerName,
          customerPhone: schema.orders.customerPhone,
          address: schema.orders.address,
          neighborhood: schema.orders.neighborhood,
          postalCode: schema.orders.postalCode,
          lat: schema.orders.lat,
          lng: schema.orders.lng,
          itemsCount: schema.orders.itemsCount,
          placedAt: schema.orders.placedAt,
          notes: schema.orders.notes,
          driverId: schema.orders.driverId,
          deliveredAt: schema.orders.deliveredAt,
        })
        .from(schema.orders)
        .where(eq(schema.orders.tenantId, data.tenantId))
        .orderBy(desc(schema.orders.placedAt));
      rows = basic.map((r) => ({
        ...r,
        pickedUpAt: null,
        deliveryFee: "0",
      }));
    }

    const myOrders = rows
      .filter((o) => o.driverId === driver.id && isDriverActiveOrder(o.status))
      .map(toDriverOrderView);

    const [storeRow] = await db
      .select({
        name: schema.stores.name,
        address: schema.stores.address,
        lat: schema.stores.lat,
        lng: schema.stores.lng,
      })
      .from(schema.stores)
      .where(eq(schema.stores.tenantId, data.tenantId))
      .limit(1);

    const [settingsRow] = await db
      .select()
      .from(schema.tenantMenuSettings)
      .where(eq(schema.tenantMenuSettings.tenantId, data.tenantId))
      .limit(1);

    const menuSettings = settingsRow ? mapTenantMenuSettingsRow(settingsRow) : null;
    const store: DriverStoreInfo | null = storeRow
      ? {
          name: storeRow.name,
          address: storeRow.address ?? "",
          city_region: menuSettings?.store_region ?? null,
          city: menuSettings?.store_city ?? null,
          state: menuSettings?.store_state ?? null,
          lat: storeRow.lat,
          lng: storeRow.lng,
        }
      : null;

    const mappedForStats: (LocalOrder & {
      picked_up_at?: string | null;
      delivered_at?: string | null;
    })[] = rows.map((r) => ({
      ...mapOrder({
        ...r,
        tenantId: data.tenantId,
        priority: "normal",
        totalAmount: "0",
        channel: "",
        slaMinutes: 45,
        trackingToken: null,
      }),
      picked_up_at: r.pickedUpAt?.toISOString() ?? null,
      delivered_at: r.deliveredAt?.toISOString() ?? null,
    }));

    const stats = computeDriverDayStats(mappedForStats, driver.id);
    const history = buildDriverHistory(mappedForStats, driver.id);

    return {
      driver,
      myOrders,
      store,
      stats,
      history,
    };
  });

export const acceptOrderAsDriverFn = createServerFn({ method: "POST" })
  .inputValidator((data: { tenantId: string; orderId: string }) => data)
  .handler(async ({ data }): Promise<DriverOrderView> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);

    const driver = await getMyDriverFn({ data: { tenantId: data.tenantId } });
    if (!driver) throw new Error("Perfil de entregador não vinculado à sua conta.");

    assertCanAcceptOrderAsDriver(user, data.tenantId, true);

    if (driver.status === "offline") {
      throw new Error("Fique online para aceitar corridas.");
    }

    const db = getDb();
    const [existing] = await db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.id, data.orderId))
      .limit(1);

    if (!existing) throw new Error("Pedido não encontrado");
    if (existing.tenantId !== data.tenantId) {
      throw new Error("Pedido não pertence a este tenant");
    }
    if (existing.driverId) throw new Error("Pedido já atribuído.");

    const status = normalizeOrderStatus(existing.status);
    if (!needsDispatch(status)) {
      throw new Error("Pedido não está disponível para aceite.");
    }

    await assertDriverAvailableForAssignment(db, driver.id, data.tenantId);

    const [updated] = await db
      .update(schema.orders)
      .set({
        driverId: driver.id,
        status: "aguardando_entregador",
        updatedAt: new Date(),
      })
      .where(and(eq(schema.orders.id, data.orderId), eq(schema.orders.tenantId, data.tenantId)))
      .returning();

    await markDriverEmRota(db, driver.id, data.tenantId);

    await db.insert(schema.orderEvents).values({
      orderId: data.orderId,
      tenantId: data.tenantId,
      actorId: user.id,
      fromStatus: existing.status,
      toStatus: "aguardando_entregador",
      note: "Aceito pelo entregador",
    });

    await syncDriverActiveOrders(db, driver.id);

    return toDriverOrderView(updated);
  });

export type AdminDriverRow = {
  driver: LocalDriver;
  stats: DriverDayStats;
  history: DriverDeliveryHistoryItem[];
  activeOrderCode: string | null;
};

export const getAdminDriversPanelFn = createServerFn({ method: "GET" })
  .inputValidator((data: { tenantId: string }) => data)
  .handler(async ({ data }): Promise<AdminDriverRow[]> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanManageDrivers(user, data.tenantId);

    const db = getDb();
    const driverRows = await db
      .select()
      .from(schema.drivers)
      .where(eq(schema.drivers.tenantId, data.tenantId));

    const orderRows = await db
      .select({
        id: schema.orders.id,
        code: schema.orders.code,
        status: schema.orders.status,
        customerName: schema.orders.customerName,
        address: schema.orders.address,
        placedAt: schema.orders.placedAt,
        driverId: schema.orders.driverId,
        deliveredAt: schema.orders.deliveredAt,
        pickedUpAt: schema.orders.pickedUpAt,
        deliveryFee: schema.orders.deliveryFee,
        totalAmount: schema.orders.totalAmount,
        tenantId: schema.orders.tenantId,
        priority: schema.orders.priority,
        customerPhone: schema.orders.customerPhone,
        lat: schema.orders.lat,
        lng: schema.orders.lng,
        itemsCount: schema.orders.itemsCount,
        channel: schema.orders.channel,
        slaMinutes: schema.orders.slaMinutes,
        trackingToken: schema.orders.trackingToken,
      })
      .from(schema.orders)
      .where(eq(schema.orders.tenantId, data.tenantId));

    const mappedOrders = orderRows.map((r) => ({
      ...mapOrder(r),
      picked_up_at: r.pickedUpAt?.toISOString() ?? null,
      delivered_at: r.deliveredAt?.toISOString() ?? null,
    }));

    return driverRows.map((d) => {
      const driver = mapDriver(d);
      const active = mappedOrders.find(
        (o) =>
          o.driver_id === driver.id &&
          !["entregue", "cancelado"].includes(o.status),
      );
      return {
        driver,
        stats: computeDriverDayStats(mappedOrders, driver.id),
        history: buildDriverHistory(mappedOrders, driver.id, 8),
        activeOrderCode: active?.code ?? null,
      };
    });
  });
