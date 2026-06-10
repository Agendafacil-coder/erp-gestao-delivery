import { and, eq, notInArray, sql } from "drizzle-orm";
import type { getDb } from "@/db";
import { schema } from "@/db";
import { DRIVER_TERMINAL_STATUSES, MAX_DRIVER_ROUTE_ORDERS } from "@/lib/drivers/driverCapacity";

type Db = ReturnType<typeof getDb>;

export async function assertDriverAvailableForAssignment(
  db: Db,
  driverId: string,
  tenantId: string,
): Promise<void> {
  const [driver] = await db
    .select({
      id: schema.drivers.id,
      status: schema.drivers.status,
      tenantId: schema.drivers.tenantId,
    })
    .from(schema.drivers)
    .where(and(eq(schema.drivers.id, driverId), eq(schema.drivers.tenantId, tenantId)))
    .limit(1);

  if (!driver) throw new Error("Entregador não encontrado neste tenant");
  if (driver.status === "pausado") {
    throw new Error("Entregador está em pausa");
  }

  const [load] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.orders)
    .where(
      and(
        eq(schema.orders.driverId, driverId),
        notInArray(schema.orders.status, [...DRIVER_TERMINAL_STATUSES]),
      ),
    );

  const activeCount = load?.count ?? 0;
  if (activeCount >= MAX_DRIVER_ROUTE_ORDERS) {
    throw new Error(
      `Entregador já atingiu o limite de ${MAX_DRIVER_ROUTE_ORDERS} pedidos simultâneos`,
    );
  }
}

export async function markDriverEmRota(
  db: Db,
  driverId: string,
  tenantId: string,
): Promise<void> {
  await db
    .update(schema.drivers)
    .set({ status: "em_rota", updatedAt: new Date() })
    .where(and(eq(schema.drivers.id, driverId), eq(schema.drivers.tenantId, tenantId)));
}
