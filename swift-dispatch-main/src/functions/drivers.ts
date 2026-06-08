import { createServerFn } from "@tanstack/react-start";
import { and, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { LocalDriver } from "@/lib/db/localDb";
import { mapDriver } from "./mappers";
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

export const listDriversFn = createServerFn({ method: "GET" })
  .inputValidator((data: { tenantId: string }) => data)
  .handler(async ({ data }): Promise<LocalDriver[]> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);

    const db = getDb();
    const rows = await db
      .select()
      .from(schema.drivers)
      .where(eq(schema.drivers.tenantId, data.tenantId));

    return rows.map(mapDriver);
  });

export const updateDriverStatusFn = createServerFn({ method: "POST" })
  .inputValidator((data: { driverId: string; status: LocalDriver["status"] }) => data)
  .handler(async ({ data }): Promise<LocalDriver> => {
    const user = await requireSessionUser();
    const db = getDb();

    const [existing] = await db
      .select()
      .from(schema.drivers)
      .where(eq(schema.drivers.id, data.driverId))
      .limit(1);

    if (!existing) throw new Error("Entregador não encontrado");
    await assertTenantAccess(user.id, existing.tenantId);

    const [updated] = await db
      .update(schema.drivers)
      .set({ status: data.status, updatedAt: new Date() })
      .where(eq(schema.drivers.id, data.driverId))
      .returning();

    return mapDriver(updated);
  });

export const getMyDriverFn = createServerFn({ method: "GET" })
  .inputValidator((data: { tenantId: string }) => data)
  .handler(async ({ data }): Promise<LocalDriver | null> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);

    const db = getDb();
    const [driver] = await db
      .select()
      .from(schema.drivers)
      .where(and(eq(schema.drivers.userId, user.id), eq(schema.drivers.tenantId, data.tenantId)))
      .limit(1);

    return driver ? mapDriver(driver) : null;
  });

export const updateDriverCoordsFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { driverId: string; lat: number; lng: number; heading?: number }) => data,
  )
  .handler(async ({ data }): Promise<LocalDriver> => {
    const user = await requireSessionUser();
    const db = getDb();

    const [existing] = await db
      .select()
      .from(schema.drivers)
      .where(eq(schema.drivers.id, data.driverId))
      .limit(1);

    if (!existing) throw new Error("Entregador não encontrado");

    const isOwnDriver = existing.userId === user.id;
    if (!isOwnDriver) {
      await assertTenantAccess(user.id, existing.tenantId);
    } else {
      await assertTenantAccess(user.id, existing.tenantId);
    }

    const [activeOrder] = await db
      .select({ id: schema.orders.id })
      .from(schema.orders)
      .where(
        and(
          eq(schema.orders.driverId, data.driverId),
          inArray(schema.orders.status, ["em_rota_entrega", "em_rota_coleta", "retirado"]),
        ),
      )
      .limit(1);

    const [updated] = await db
      .update(schema.drivers)
      .set({ lat: data.lat, lng: data.lng, updatedAt: new Date() })
      .where(eq(schema.drivers.id, data.driverId))
      .returning();

    await db.insert(schema.driverLocations).values({
      tenantId: existing.tenantId,
      driverId: data.driverId,
      orderId: activeOrder?.id ?? null,
      lat: data.lat,
      lng: data.lng,
      heading: data.heading ?? null,
    });

    return mapDriver(updated);
  });

export const batchUpdateDriversFn = createServerFn({ method: "POST" })
  .inputValidator((data: { drivers: LocalDriver[] }) => data)
  .handler(async ({ data }): Promise<void> => {
    const user = await requireSessionUser();
    const db = getDb();

    for (const driver of data.drivers) {
      await assertTenantAccess(user.id, driver.tenant_id);
      await db
        .update(schema.drivers)
        .set({
          status: driver.status,
          lat: driver.lat,
          lng: driver.lng,
          activeOrders: driver.active_orders,
          updatedAt: new Date(),
        })
        .where(eq(schema.drivers.id, driver.id));
    }
  });
