import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { LocalOrder } from "@/lib/db/localDb";
import type { OrderStatus } from "@/lib/ops/mock";
import { mapOrder } from "./mappers";
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

async function logOrderEvent(
  orderId: string,
  tenantId: string,
  actorId: string,
  fromStatus: OrderStatus | null,
  toStatus: OrderStatus,
) {
  const db = getDb();
  await db.insert(schema.orderEvents).values({
    orderId,
    tenantId,
    actorId,
    fromStatus: fromStatus ?? undefined,
    toStatus,
  });
}

export const listOrdersFn = createServerFn({ method: "GET" })
  .inputValidator((data: { tenantId: string }) => data)
  .handler(async ({ data }): Promise<LocalOrder[]> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);

    const db = getDb();
    const rows = await db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.tenantId, data.tenantId))
      .orderBy(desc(schema.orders.placedAt));

    return rows.map(mapOrder);
  });

export const updateOrderStatusFn = createServerFn({ method: "POST" })
  .inputValidator((data: { orderId: string; status: OrderStatus }) => data)
  .handler(async ({ data }): Promise<LocalOrder> => {
    const user = await requireSessionUser();
    const db = getDb();

    const [existing] = await db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.id, data.orderId))
      .limit(1);

    if (!existing) throw new Error("Pedido não encontrado");
    await assertTenantAccess(user.id, existing.tenantId);

    const updates: Partial<typeof schema.orders.$inferInsert> = {
      status: data.status,
      updatedAt: new Date(),
    };

    if (data.status === "pronto" && !existing.readyAt) updates.readyAt = new Date();
    if (data.status === "retirado" && !existing.pickedUpAt) updates.pickedUpAt = new Date();
    if (data.status === "entregue" && !existing.deliveredAt) updates.deliveredAt = new Date();
    if (["novo", "em_preparo", "aguardando_entregador"].includes(data.status)) {
      updates.driverId = null;
    }

    const [updated] = await db
      .update(schema.orders)
      .set(updates)
      .where(eq(schema.orders.id, data.orderId))
      .returning();

    await logOrderEvent(
      data.orderId,
      existing.tenantId,
      user.id,
      existing.status as OrderStatus,
      data.status,
    );

    return mapOrder(updated);
  });

export const updateOrderDriverFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { orderId: string; driverId: string | null; status: OrderStatus }) => data,
  )
  .handler(async ({ data }): Promise<LocalOrder> => {
    const user = await requireSessionUser();
    const db = getDb();

    const [existing] = await db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.id, data.orderId))
      .limit(1);

    if (!existing) throw new Error("Pedido não encontrado");
    await assertTenantAccess(user.id, existing.tenantId);

    const [updated] = await db
      .update(schema.orders)
      .set({
        driverId: data.driverId,
        status: data.status,
        updatedAt: new Date(),
      })
      .where(eq(schema.orders.id, data.orderId))
      .returning();

    if (existing.status !== data.status) {
      await logOrderEvent(
        data.orderId,
        existing.tenantId,
        user.id,
        existing.status as OrderStatus,
        data.status,
      );
    }

    return mapOrder(updated);
  });

export const createOrderFn = createServerFn({ method: "POST" })
  .inputValidator((data: { order: Omit<LocalOrder, "id" | "placed_at"> }) => data)
  .handler(async ({ data }): Promise<LocalOrder> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.order.tenant_id);

    const db = getDb();
    const [created] = await db
      .insert(schema.orders)
      .values({
        tenantId: data.order.tenant_id,
        code: data.order.code,
        status: data.order.status,
        priority: data.order.priority,
        customerName: data.order.customer_name,
        customerPhone: data.order.customer_phone,
        address: data.order.address,
        lat: data.order.lat,
        lng: data.order.lng,
        itemsCount: data.order.items_count,
        totalAmount: String(data.order.total_amount),
        channel: data.order.channel,
        slaMinutes: data.order.sla_minutes,
        driverId: data.order.driver_id,
      })
      .returning();

    await logOrderEvent(created.id, created.tenantId, user.id, null, created.status as OrderStatus);

    return mapOrder(created);
  });

export const batchUpdateOrdersFn = createServerFn({ method: "POST" })
  .inputValidator((data: { orders: LocalOrder[] }) => data)
  .handler(async ({ data }): Promise<void> => {
    const user = await requireSessionUser();
    const db = getDb();

    for (const order of data.orders) {
      await assertTenantAccess(user.id, order.tenant_id);
      await db
        .update(schema.orders)
        .set({
          status: order.status,
          priority: order.priority,
          driverId: order.driver_id,
          lat: order.lat,
          lng: order.lng,
          updatedAt: new Date(),
        })
        .where(eq(schema.orders.id, order.id));
    }
  });
