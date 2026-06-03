import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { LocalOrder } from "@/lib/db/localDb";
import type { OrderAction, OrderStatus } from "@/lib/ops/orderWorkflow";
import {
  assertValidTransition,
  getActionTargetStatus,
  normalizeOrderStatus,
  canApplyAction,
} from "@/lib/ops/orderWorkflow";
import {
  assertCanAssignDriver,
  assertCanCreateOrder,
  assertCanUpdateOrderStatus,
} from "@/lib/rbac";
import { mapOrder } from "./mappers";
import type { CartLine } from "./publicOrders";
import { requireSessionUser } from "./session";

export type { OrderStatus } from "@/lib/ops/orderWorkflow";

export type CreateOrderExtras = {
  lines?: CartLine[];
  order_notes?: string;
};

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
  actorId: string | null,
  fromStatus: OrderStatus | null,
  toStatus: OrderStatus,
  note?: string,
) {
  const db = getDb();
  await db.insert(schema.orderEvents).values({
    orderId,
    tenantId,
    actorId: actorId ?? undefined,
    fromStatus: fromStatus ?? undefined,
    toStatus,
    note,
  });
}

function statusTimestamps(
  status: OrderStatus,
  existing: { confirmedAt?: Date | null; readyAt?: Date | null; pickedUpAt?: Date | null; deliveredAt?: Date | null },
): Partial<typeof schema.orders.$inferInsert> {
  const updates: Partial<typeof schema.orders.$inferInsert> = {};
  if (status === "confirmado" && !existing.confirmedAt) updates.confirmedAt = new Date();
  if (status === "pronto" && !existing.readyAt) updates.readyAt = new Date();
  if (status === "em_rota_entrega" && !existing.pickedUpAt) updates.pickedUpAt = new Date();
  if (status === "entregue" && !existing.deliveredAt) updates.deliveredAt = new Date();
  return updates;
}

function clearDriverOnStatus(status: OrderStatus): boolean {
  return ["novo", "confirmado", "em_preparo", "pronto"].includes(status);
}

const orderListSelect = {
  id: schema.orders.id,
  tenantId: schema.orders.tenantId,
  code: schema.orders.code,
  status: schema.orders.status,
  priority: schema.orders.priority,
  customerName: schema.orders.customerName,
  customerPhone: schema.orders.customerPhone,
  address: schema.orders.address,
  lat: schema.orders.lat,
  lng: schema.orders.lng,
  itemsCount: schema.orders.itemsCount,
  subtotalAmount: schema.orders.subtotalAmount,
  deliveryFee: schema.orders.deliveryFee,
  discountAmount: schema.orders.discountAmount,
  totalAmount: schema.orders.totalAmount,
  paymentMethod: schema.orders.paymentMethod,
  channel: schema.orders.channel,
  notes: schema.orders.notes,
  slaMinutes: schema.orders.slaMinutes,
  placedAt: schema.orders.placedAt,
  driverId: schema.orders.driverId,
  trackingToken: schema.orders.trackingToken,
};

const orderListSelectLegacy = {
  id: schema.orders.id,
  tenantId: schema.orders.tenantId,
  code: schema.orders.code,
  status: schema.orders.status,
  priority: schema.orders.priority,
  customerName: schema.orders.customerName,
  customerPhone: schema.orders.customerPhone,
  address: schema.orders.address,
  lat: schema.orders.lat,
  lng: schema.orders.lng,
  itemsCount: schema.orders.itemsCount,
  totalAmount: schema.orders.totalAmount,
  channel: schema.orders.channel,
  notes: schema.orders.notes,
  slaMinutes: schema.orders.slaMinutes,
  placedAt: schema.orders.placedAt,
  driverId: schema.orders.driverId,
  trackingToken: schema.orders.trackingToken,
};

export const listOrdersFn = createServerFn({ method: "GET" })
  .inputValidator((data: { tenantId: string }) => data)
  .handler(async ({ data }): Promise<LocalOrder[]> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);

    const db = getDb();

    try {
      const rows = await db
        .select(orderListSelect)
        .from(schema.orders)
        .where(eq(schema.orders.tenantId, data.tenantId))
        .orderBy(desc(schema.orders.placedAt));
      return rows.map(mapOrder);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("53300") || msg.includes("muitos clientes")) {
        throw new Error(
          "PostgreSQL com limite de conexões atingido. Reinicie o npm run dev e o PostgreSQL, depois execute npm run db:push.",
        );
      }
      if (
        msg.includes("subtotal_amount") ||
        msg.includes("payment_method") ||
        msg.includes("confirmed_at") ||
        msg.includes("does not exist")
      ) {
        const rows = await db
          .select(orderListSelectLegacy)
          .from(schema.orders)
          .where(eq(schema.orders.tenantId, data.tenantId))
          .orderBy(desc(schema.orders.placedAt));
        return rows.map(mapOrder);
      }
      throw err;
    }
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

    const fromStatus = normalizeOrderStatus(existing.status);
    const toStatus = normalizeOrderStatus(data.status);

    let isAssignedDriver = false;
    if (existing.driverId) {
      const [drv] = await db
        .select({ userId: schema.drivers.userId })
        .from(schema.drivers)
        .where(eq(schema.drivers.id, existing.driverId))
        .limit(1);
      isAssignedDriver = drv?.userId === user.id;
    }
    assertCanUpdateOrderStatus(user, existing.tenantId, fromStatus, toStatus, isAssignedDriver);
    assertValidTransition(fromStatus, toStatus);

    if (toStatus === "em_rota_entrega" && !existing.driverId) {
      throw new Error("Atribua um entregador antes de marcar saída para entrega.");
    }
    if (toStatus === "entregue" && fromStatus !== "em_rota_entrega") {
      throw new Error("O pedido precisa estar em rota antes de ser marcado como entregue.");
    }

    const updates: Partial<typeof schema.orders.$inferInsert> = {
      status: toStatus,
      updatedAt: new Date(),
      ...statusTimestamps(toStatus, existing),
    };

    if (clearDriverOnStatus(toStatus)) updates.driverId = null;

    const [updated] = await db
      .update(schema.orders)
      .set(updates)
      .where(eq(schema.orders.id, data.orderId))
      .returning();

    await logOrderEvent(data.orderId, existing.tenantId, user.id, fromStatus, toStatus);

    return mapOrder(updated);
  });

export const applyOrderActionFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { orderId: string; action: OrderAction; driverId?: string | null }) => data,
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

    const fromStatus = normalizeOrderStatus(existing.status);
    const toStatus = getActionTargetStatus(data.action);

    if (data.action === "atribuir_entregador") {
      if (!data.driverId) throw new Error("Selecione um entregador.");
      assertCanAssignDriver(user, existing.tenantId);
      if (!canApplyAction(fromStatus, data.action)) {
        throw new Error("Não é possível atribuir entregador neste status.");
      }

      const [updated] = await db
        .update(schema.orders)
        .set({
          driverId: data.driverId,
          status: "aguardando_entregador",
          updatedAt: new Date(),
        })
        .where(eq(schema.orders.id, data.orderId))
        .returning();

      await logOrderEvent(
        data.orderId,
        existing.tenantId,
        user.id,
        fromStatus,
        "aguardando_entregador",
        `Entregador atribuído`,
      );
      return mapOrder(updated);
    }

    if (!canApplyAction(fromStatus, data.action, { hasDriver: !!existing.driverId })) {
      throw new Error(`Ação "${data.action}" não permitida no status atual.`);
    }

    if (data.action === "saiu_entrega" && !existing.driverId) {
      throw new Error("Atribua um entregador antes de marcar saída para entrega.");
    }

    let isAssignedDriver = false;
    if (existing.driverId) {
      const [drv] = await db
        .select({ userId: schema.drivers.userId })
        .from(schema.drivers)
        .where(eq(schema.drivers.id, existing.driverId))
        .limit(1);
      isAssignedDriver = drv?.userId === user.id;
    }
    assertCanUpdateOrderStatus(user, existing.tenantId, fromStatus, toStatus, isAssignedDriver);
    assertValidTransition(fromStatus, toStatus);

    const updates: Partial<typeof schema.orders.$inferInsert> = {
      status: toStatus,
      updatedAt: new Date(),
      ...statusTimestamps(toStatus, existing),
    };
    if (clearDriverOnStatus(toStatus)) updates.driverId = null;

    const [updated] = await db
      .update(schema.orders)
      .set(updates)
      .where(eq(schema.orders.id, data.orderId))
      .returning();

    await logOrderEvent(data.orderId, existing.tenantId, user.id, fromStatus, toStatus);

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
    assertCanAssignDriver(user, existing.tenantId);

    const fromStatus = normalizeOrderStatus(existing.status);
    const toStatus = normalizeOrderStatus(data.status);
    assertValidTransition(fromStatus, toStatus);

    const [updated] = await db
      .update(schema.orders)
      .set({
        driverId: data.driverId,
        status: toStatus,
        updatedAt: new Date(),
        ...statusTimestamps(toStatus, existing),
      })
      .where(eq(schema.orders.id, data.orderId))
      .returning();

    if (fromStatus !== toStatus) {
      await logOrderEvent(data.orderId, existing.tenantId, user.id, fromStatus, toStatus);
    }

    return mapOrder(updated);
  });

export const createOrderFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { order: Omit<LocalOrder, "id" | "placed_at"> } & CreateOrderExtras) => data,
  )
  .handler(async ({ data }): Promise<LocalOrder> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.order.tenant_id);
    assertCanCreateOrder(user, data.order.tenant_id);

    const lines = data.lines ?? [];
    if (lines.length === 0) throw new Error("Selecione ao menos um item do cardápio");

    const itemsCount = lines.reduce((s, l) => s + l.quantity, 0);
    const subtotal = lines.reduce((s, l) => s + l.unit_price * l.quantity, 0);
    const deliveryFee = data.order.delivery_fee ?? 0;
    const discount = data.order.discount_amount ?? 0;
    const total = subtotal + deliveryFee - discount;

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
        itemsCount,
        subtotalAmount: String(subtotal.toFixed(2)),
        deliveryFee: String(deliveryFee.toFixed(2)),
        discountAmount: String(discount.toFixed(2)),
        totalAmount: String(total.toFixed(2)),
        paymentMethod: data.order.payment_method ?? null,
        channel: data.order.channel,
        notes: data.order_notes?.trim() || null,
        slaMinutes: data.order.sla_minutes,
        driverId: data.order.driver_id,
      })
      .returning();

    for (const line of lines) {
      await db.insert(schema.orderLineItems).values({
        orderId: created.id,
        menuItemId: line.menu_item_id,
        name: line.name,
        quantity: line.quantity,
        unitPrice: String(line.unit_price),
        notes: line.notes?.trim() || null,
      });
    }

    await logOrderEvent(created.id, created.tenantId, user.id, null, "novo");

    return mapOrder(created);
  });

export type OrderAuditEvent = {
  id: string;
  orderId: string;
  orderCode: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  note?: string | null;
  createdAt: string;
};

export const listOrderEventsFn = createServerFn({ method: "GET" })
  .inputValidator((data: { tenantId: string; limit?: number; orderId?: string }) => data)
  .handler(async ({ data }): Promise<OrderAuditEvent[]> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);

    const db = getDb();
    const limit = Math.min(data.limit ?? 50, 100);
    const conditions = [eq(schema.orderEvents.tenantId, data.tenantId)];
    if (data.orderId) conditions.push(eq(schema.orderEvents.orderId, data.orderId));

    const rows = await db
      .select({
        id: schema.orderEvents.id,
        orderId: schema.orderEvents.orderId,
        orderCode: schema.orders.code,
        fromStatus: schema.orderEvents.fromStatus,
        toStatus: schema.orderEvents.toStatus,
        note: schema.orderEvents.note,
        createdAt: schema.orderEvents.createdAt,
      })
      .from(schema.orderEvents)
      .innerJoin(schema.orders, eq(schema.orderEvents.orderId, schema.orders.id))
      .where(and(...conditions))
      .orderBy(desc(schema.orderEvents.createdAt))
      .limit(limit);

    return rows.map((r) => ({
      id: r.id,
      orderId: r.orderId,
      orderCode: r.orderCode,
      fromStatus: r.fromStatus ? normalizeOrderStatus(r.fromStatus) : null,
      toStatus: normalizeOrderStatus(r.toStatus),
      note: r.note,
      createdAt: r.createdAt.toISOString(),
    }));
  });

export const batchUpdateOrdersFn = createServerFn({ method: "POST" })
  .inputValidator((data: { orders: LocalOrder[] }) => data)
  .handler(async ({ data }): Promise<void> => {
    const user = await requireSessionUser();
    const db = getDb();

    for (const order of data.orders) {
      await assertTenantAccess(user.id, order.tenant_id);

      const [existing] = await db
        .select()
        .from(schema.orders)
        .where(eq(schema.orders.id, order.id))
        .limit(1);

      if (!existing) continue;

      const fromStatus = normalizeOrderStatus(existing.status);
      const toStatus = normalizeOrderStatus(order.status);
      assertValidTransition(fromStatus, toStatus);

      await db
        .update(schema.orders)
        .set({
          status: toStatus,
          priority: order.priority,
          driverId: order.driver_id,
          lat: order.lat,
          lng: order.lng,
          updatedAt: new Date(),
          ...statusTimestamps(toStatus, existing),
        })
        .where(eq(schema.orders.id, order.id));

      if (fromStatus !== toStatus) {
        await logOrderEvent(order.id, order.tenant_id, user.id, fromStatus, toStatus, "Despacho automático");
      }
    }
  });
