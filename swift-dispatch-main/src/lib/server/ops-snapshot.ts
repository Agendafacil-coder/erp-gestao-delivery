import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/connection.server";
import { schema } from "@/db";
import type { OpsSnapshot } from "@/lib/ops/opsSnapshot.types";
import { getServerAutomationEvents } from "@/lib/ops/automationEventBus";
import { detectServerAutomationMetrics } from "@/lib/ops/serverAutomationDetector";
import { assertCanAccessOpsSnapshot } from "@/lib/rbac";
import { backfillMissingOrderGeocodes } from "@/lib/geo/orderGeocodeBackfill";
import { mapAlert, mapDriver, mapOrder } from "@/functions/mappers";
import type { SessionUser } from "@/functions/session";

async function assertTenantAccess(userId: string, tenantId: string) {
  const db = getDb();
  const [row] = await db
    .select({ id: schema.userRoles.id })
    .from(schema.userRoles)
    .where(and(eq(schema.userRoles.userId, userId), eq(schema.userRoles.tenantId, tenantId)))
    .limit(1);
  if (!row) throw new Error("Sem permissão para este tenant");
}

/** Pedidos/entregadores/alertas — leve, usado no SSE a cada tick. */
export async function fetchOpsSnapshotCore(
  tenantId: string,
): Promise<Pick<OpsSnapshot, "orders" | "drivers" | "alerts" | "ts">> {
  const db = getDb();
  const [orderRows, driverRows, alertRows] = await Promise.all([
    db.select().from(schema.orders).where(eq(schema.orders.tenantId, tenantId)),
    db.select().from(schema.drivers).where(eq(schema.drivers.tenantId, tenantId)),
    db.select().from(schema.alerts).where(eq(schema.alerts.tenantId, tenantId)),
  ]);

  const orders = orderRows.map(mapOrder);
  const drivers = driverRows.map(mapDriver);

  void detectServerAutomationMetrics(tenantId, orders, drivers).catch(() => {});
  void backfillMissingOrderGeocodes(tenantId, 3).catch(() => {});

  return {
    orders,
    drivers,
    alerts: alertRows.map(mapAlert).reverse(),
    ts: Date.now(),
  };
}

/** Snapshot completo (HTTP bootstrap) — inclui histórico de automações do Postgres. */
export async function fetchOpsSnapshot(tenantId: string): Promise<OpsSnapshot> {
  const core = await fetchOpsSnapshotCore(tenantId);
  return {
    ...core,
    automationEvents: await getServerAutomationEvents(tenantId),
  };
}

export async function fetchOpsSnapshotForUser(
  user: SessionUser,
  tenantId: string,
): Promise<OpsSnapshot> {
  await assertTenantAccess(user.id, tenantId);
  assertCanAccessOpsSnapshot(user, tenantId);
  return fetchOpsSnapshot(tenantId);
}
