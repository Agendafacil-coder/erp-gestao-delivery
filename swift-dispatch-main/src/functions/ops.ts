import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { LocalAlert, LocalDriver, LocalOrder } from "@/lib/db/localDb";
import { mapAlert, mapDriver, mapOrder } from "./mappers";
import { requireSessionUser } from "./session";

export type OpsSnapshot = {
  orders: LocalOrder[];
  drivers: LocalDriver[];
  alerts: LocalAlert[];
  ts: number;
};

async function assertTenantAccess(userId: string, tenantId: string) {
  const db = getDb();
  const [row] = await db
    .select({ id: schema.userRoles.id })
    .from(schema.userRoles)
    .where(eq(schema.userRoles.userId, userId))
    .limit(1);
  if (!row) throw new Error("Sem permissão");
}

export async function fetchOpsSnapshot(tenantId: string): Promise<OpsSnapshot> {
  const db = getDb();
  const [orderRows, driverRows, alertRows] = await Promise.all([
    db.select().from(schema.orders).where(eq(schema.orders.tenantId, tenantId)),
    db.select().from(schema.drivers).where(eq(schema.drivers.tenantId, tenantId)),
    db.select().from(schema.alerts).where(eq(schema.alerts.tenantId, tenantId)),
  ]);

  return {
    orders: orderRows.map(mapOrder),
    drivers: driverRows.map(mapDriver),
    alerts: alertRows.map(mapAlert).reverse(),
    ts: Date.now(),
  };
}

export const getOpsSnapshotFn = createServerFn({ method: "GET" })
  .inputValidator((data: { tenantId: string }) => data)
  .handler(async ({ data }): Promise<OpsSnapshot> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    return fetchOpsSnapshot(data.tenantId);
  });
