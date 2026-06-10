import { and, eq } from "drizzle-orm";
import type { getDb } from "@/db";
import { schema } from "@/db";
import type { LocalDriver } from "@/lib/db/localDb";
import { normalizeOrderStatus } from "@/lib/ops/orderWorkflow";
import { markDriverEmRota } from "./driverAssignment";
import { MAX_DRIVER_ROUTE_ORDERS } from "./driverCapacity";

export { pickNextDriverFromList } from "./dispatchPick";
import { syncDriversForOrderChange } from "./syncActiveOrders";
import { notifyDriverAssigned } from "@/lib/whatsapp/orderNotifications";

type Db = ReturnType<typeof getDb>;

type DriverCandidate = {
  id: string;
  name: string;
  status: LocalDriver["status"];
  activeOrders: number;
  rating: number;
};

function driverDispatchScore(d: DriverCandidate): number {
  const idleBonus = d.status === "disponivel" ? 1000 : 0;
  const loadPenalty = d.activeOrders * 10;
  return idleBonus - loadPenalty + d.rating;
}

export async function isAutoDispatchEnabled(db: Db, tenantId: string): Promise<boolean> {
  const [row] = await db
    .select({ enabled: schema.tenantMenuSettings.autoDispatchEnabled })
    .from(schema.tenantMenuSettings)
    .where(eq(schema.tenantMenuSettings.tenantId, tenantId))
    .limit(1);
  return row?.enabled ?? false;
}

export async function pickNextAvailableDriver(
  db: Db,
  tenantId: string,
): Promise<{ id: string; name: string } | null> {
  const rows = await db
    .select({
      id: schema.drivers.id,
      name: schema.drivers.name,
      status: schema.drivers.status,
      activeOrders: schema.drivers.activeOrders,
      rating: schema.drivers.rating,
    })
    .from(schema.drivers)
    .where(eq(schema.drivers.tenantId, tenantId));

  const candidates: DriverCandidate[] = rows
    .filter((d) => d.status !== "offline" && d.status !== "pausado")
    .map((d) => ({
      id: d.id,
      name: d.name,
      status: d.status as LocalDriver["status"],
      activeOrders: d.activeOrders ?? 0,
      rating: Number(d.rating ?? 0),
    }))
    .filter((d) => d.activeOrders < MAX_DRIVER_ROUTE_ORDERS);

  candidates.sort((a, b) => driverDispatchScore(b) - driverDispatchScore(a));
  const best = candidates[0];
  return best ? { id: best.id, name: best.name } : null;
}

export type AutoDispatchResult = {
  driverId: string;
  driverName: string;
};

export async function tryAutoAssignDriver(
  db: Db,
  order: { id: string; tenantId: string; driverId: string | null; status: string },
  actorId: string | null,
  logEvent: (
    orderId: string,
    tenantId: string,
    actorId: string | null,
    fromStatus: string,
    toStatus: string,
    note?: string,
  ) => Promise<void>,
): Promise<AutoDispatchResult | null> {
  if (normalizeOrderStatus(order.status) !== "aguardando_entregador") return null;
  if (order.driverId) return null;

  const enabled = await isAutoDispatchEnabled(db, order.tenantId);
  if (!enabled) return null;

  const driver = await pickNextAvailableDriver(db, order.tenantId);
  if (!driver) return null;

  const [updated] = await db
    .update(schema.orders)
    .set({ driverId: driver.id, updatedAt: new Date() })
    .where(and(eq(schema.orders.id, order.id), eq(schema.orders.tenantId, order.tenantId)))
    .returning({ id: schema.orders.id });

  if (!updated) return null;

  await logEvent(
    order.id,
    order.tenantId,
    actorId,
    "aguardando_entregador",
    "aguardando_entregador",
    `Despacho automático → ${driver.name}`,
  );

  await markDriverEmRota(db, driver.id, order.tenantId);
  await syncDriversForOrderChange(db, null, driver.id);

  void notifyDriverAssigned({
    orderId: order.id,
    tenantId: order.tenantId,
    driverId: driver.id,
  }).catch(() => {});

  return { driverId: driver.id, driverName: driver.name };
}

/** Despacha pedidos já em fila (sem entregador) quando o modo automático é ligado. */
export async function autoDispatchPendingOrders(
  db: Db,
  tenantId: string,
  actorId: string | null,
  logEvent: (
    orderId: string,
    tenantId: string,
    actorId: string | null,
    fromStatus: string,
    toStatus: string,
    note?: string,
  ) => Promise<void>,
): Promise<number> {
  const enabled = await isAutoDispatchEnabled(db, tenantId);
  if (!enabled) return 0;

  const pending = await db
    .select({
      id: schema.orders.id,
      tenantId: schema.orders.tenantId,
      driverId: schema.orders.driverId,
      status: schema.orders.status,
    })
    .from(schema.orders)
    .where(
      and(
        eq(schema.orders.tenantId, tenantId),
        eq(schema.orders.status, "aguardando_entregador"),
      ),
    );

  let assigned = 0;
  for (const order of pending) {
    if (order.driverId) continue;
    const result = await tryAutoAssignDriver(db, order, actorId, logEvent);
    if (result) assigned++;
  }
  return assigned;
}
