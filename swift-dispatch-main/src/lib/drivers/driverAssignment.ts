import { and, eq, inArray, sql } from "drizzle-orm";
import type { getDb } from "@/db";
import { schema } from "@/db";

const DRIVER_LOAD_STATUSES = ["aguardando_entregador", "em_rota_entrega"] as const;

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
  if (driver.status === "offline") {
    throw new Error("Entregador está offline");
  }
  if (driver.status !== "disponivel") {
    throw new Error("Entregador não está disponível para nova atribuição");
  }

  const [load] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.orders)
    .where(
      and(
        eq(schema.orders.driverId, driverId),
        inArray(schema.orders.status, [...DRIVER_LOAD_STATUSES]),
      ),
    );

  if ((load?.count ?? 0) > 0) {
    throw new Error("Entregador já possui entregas ativas");
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
