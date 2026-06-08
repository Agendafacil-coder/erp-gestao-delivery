import { and, eq, inArray, sql } from "drizzle-orm";
import type { getDb } from "@/db";
import { schema } from "@/db";

/** Status em que o pedido conta como carga ativa do entregador */
const DRIVER_LOAD_STATUSES = ["aguardando_entregador", "em_rota_entrega"] as const;

type Db = ReturnType<typeof getDb>;

export async function syncDriverActiveOrders(db: Db, driverId: string): Promise<void> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.orders)
    .where(
      and(
        eq(schema.orders.driverId, driverId),
        inArray(schema.orders.status, [...DRIVER_LOAD_STATUSES]),
      ),
    );

  const activeCount = row?.count ?? 0;
  const patch: Partial<typeof schema.drivers.$inferInsert> = {
    activeOrders: activeCount,
    updatedAt: new Date(),
  };

  if (activeCount === 0) {
    const [driver] = await db
      .select({ status: schema.drivers.status })
      .from(schema.drivers)
      .where(eq(schema.drivers.id, driverId))
      .limit(1);
    if (driver?.status === "em_rota") {
      patch.status = "disponivel";
    }
  }

  await db.update(schema.drivers).set(patch).where(eq(schema.drivers.id, driverId));
}

export async function syncDriversForOrderChange(
  db: Db,
  previousDriverId: string | null | undefined,
  nextDriverId: string | null | undefined,
): Promise<void> {
  const ids = new Set<string>();
  if (previousDriverId) ids.add(previousDriverId);
  if (nextDriverId) ids.add(nextDriverId);
  await Promise.all([...ids].map((id) => syncDriverActiveOrders(db, id)));
}
