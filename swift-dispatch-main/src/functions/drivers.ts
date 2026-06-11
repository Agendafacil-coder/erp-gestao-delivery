import { createServerFn } from "@tanstack/react-start";
import { and, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { LocalDriver } from "@/lib/db/localDb";
import { mapDriver } from "./mappers";
import {
  assertCanBatchDispatch,
  assertCanAccessOpsSnapshot,
  assertCanManageDrivers,
  assertCanUpdateDriverStatus,
} from "@/lib/rbac";
import { requireSessionUser } from "./session";
import { syncDriverActiveOrders } from "@/lib/drivers/syncActiveOrders";

async function assertTenantAccess(userId: string, tenantId: string) {
  const db = getDb();
  const [row] = await db
    .select({ id: schema.userRoles.id })
    .from(schema.userRoles)
    .where(and(eq(schema.userRoles.userId, userId), eq(schema.userRoles.tenantId, tenantId)))
    .limit(1);
  if (!row) throw new Error("Sem permissão para este tenant");
}

export const createDriverFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      tenantId: string;
      name: string;
      phone?: string;
      vehicle: LocalDriver["vehicle"];
      email?: string;
    }) => data,
  )
  .handler(async ({ data }): Promise<LocalDriver> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanManageDrivers(user, data.tenantId);

    const name = data.name.trim();
    if (!name) throw new Error("Informe o nome do entregador");

    const db = getDb();
    let linkedUserId: string | null = null;

    if (data.email?.trim()) {
      const email = data.email.toLowerCase().trim();
      const [target] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, email))
        .limit(1);

      if (!target) {
        throw new Error(
          "Usuário não encontrado. O entregador precisa criar conta em /login com este e-mail antes do vínculo.",
        );
      }

      const [linked] = await db
        .select({ id: schema.drivers.id })
        .from(schema.drivers)
        .where(
          and(eq(schema.drivers.userId, target.id), eq(schema.drivers.tenantId, data.tenantId)),
        )
        .limit(1);

      if (linked) {
        throw new Error("Este usuário já está vinculado a outro entregador nesta operação.");
      }

      linkedUserId = target.id;

      const [existingRole] = await db
        .select({ id: schema.userRoles.id })
        .from(schema.userRoles)
        .where(
          and(
            eq(schema.userRoles.userId, target.id),
            eq(schema.userRoles.tenantId, data.tenantId),
            eq(schema.userRoles.role, "driver"),
          ),
        )
        .limit(1);

      if (!existingRole) {
        await db.insert(schema.userRoles).values({
          userId: target.id,
          tenantId: data.tenantId,
          role: "driver",
        });
      }
    }

    const [driver] = await db
      .insert(schema.drivers)
      .values({
        tenantId: data.tenantId,
        userId: linkedUserId,
        name,
        phone: data.phone?.trim() || null,
        vehicle: data.vehicle,
        status: "offline",
      })
      .returning();

    return mapDriver(driver);
  });

export const listDriversFn = createServerFn({ method: "GET" })
  .inputValidator((data: { tenantId: string }) => data)
  .handler(async ({ data }): Promise<LocalDriver[]> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanAccessOpsSnapshot(user, data.tenantId);

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
    assertCanUpdateDriverStatus(user, existing.tenantId, existing.userId, data.status);

    const [updated] = await db
      .update(schema.drivers)
      .set({ status: data.status, updatedAt: new Date() })
      .where(and(eq(schema.drivers.id, data.driverId), eq(schema.drivers.tenantId, existing.tenantId)))
      .returning();

    await syncDriverActiveOrders(db, data.driverId);

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
    if (existing.userId !== user.id) {
      throw new Error("Só o próprio entregador pode enviar localização.");
    }
    await assertTenantAccess(user.id, existing.tenantId);

    const [activeOrder] = await db
      .select({ id: schema.orders.id })
      .from(schema.orders)
      .where(
        and(
          eq(schema.orders.driverId, data.driverId),
          inArray(schema.orders.status, [
            "aguardando_entregador",
            "em_rota_entrega",
            "em_rota_coleta",
            "retirado",
          ]),
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

    void import("@/lib/geo/proximityGeofence").then(({ processDriverProximityGeofence }) =>
      processDriverProximityGeofence(db, {
        tenantId: existing.tenantId,
        driverId: data.driverId,
        lat: data.lat,
        lng: data.lng,
      }).catch(() => {}),
    );

    return mapDriver(updated);
  });

export const batchUpdateDriversFn = createServerFn({ method: "POST" })
  .inputValidator((data: { drivers: LocalDriver[]; tenantId?: string }) => data)
  .handler(async ({ data }): Promise<void> => {
    const user = await requireSessionUser();
    const db = getDb();

    if (data.drivers.length === 0) return;

    const tenantId = data.tenantId ?? data.drivers[0].tenant_id;
    await assertTenantAccess(user.id, tenantId);
    assertCanBatchDispatch(user, tenantId);

    for (const driver of data.drivers) {
      if (driver.tenant_id !== tenantId) {
        throw new Error("Despacho em lote deve ser de um único tenant");
      }

      const [existing] = await db
        .select({ id: schema.drivers.id, tenantId: schema.drivers.tenantId })
        .from(schema.drivers)
        .where(eq(schema.drivers.id, driver.id))
        .limit(1);

      if (!existing) {
        throw new Error(`Entregador ${driver.id} não encontrado`);
      }
      if (existing.tenantId !== tenantId) {
        throw new Error("Entregador não pertence a este tenant");
      }

      await db
        .update(schema.drivers)
        .set({
          status: driver.status,
          lat: driver.lat,
          lng: driver.lng,
          activeOrders: driver.active_orders,
          updatedAt: new Date(),
        })
        .where(and(eq(schema.drivers.id, driver.id), eq(schema.drivers.tenantId, tenantId)));
    }
  });
