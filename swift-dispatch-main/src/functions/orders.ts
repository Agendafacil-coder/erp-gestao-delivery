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
  assertCanBatchDispatch,
  assertCanUpdateOrderStatus,
} from "@/lib/rbac";
import { mapOrder } from "./mappers";
import type { CartLine } from "./publicOrders";
import { requireSessionUser } from "./session";
import { syncDriversForOrderChange, syncDriverActiveOrders } from "@/lib/drivers/syncActiveOrders";
import {
  assertDriverAvailableForAssignment,
  markDriverEmRota,
} from "@/lib/drivers/driverAssignment";
import { buildNavigationAddress } from "@/lib/geo/addressNavigation";
import { resolveOrderCoordinates } from "@/lib/geo/geocode";
import { mapTenantMenuSettingsRow, DEFAULT_MENU_SETTINGS } from "@/lib/menu/public-settings";
import { notifyOrderStatusChange, notifyDriverAssigned } from "@/lib/whatsapp/orderNotifications";
import { tryAutoAssignDriver } from "@/lib/drivers/autoDispatch";

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

  void notifyOrderStatusChange({ orderId, tenantId, fromStatus, toStatus }).catch(() => {
    /* não bloqueia fluxo do pedido */
  });
}

function statusTimestamps(
  status: OrderStatus,
  existing: { confirmedAt?: Date | null; readyAt?: Date | null; pickedUpAt?: Date | null; deliveredAt?: Date | null },
): Partial<typeof schema.orders.$inferInsert> {
  const updates: Partial<typeof schema.orders.$inferInsert> = {};
  if (status === "em_preparo" && !existing.confirmedAt) updates.confirmedAt = new Date();
  if (status === "aguardando_entregador" && !existing.readyAt) updates.readyAt = new Date();
  if (status === "entregue" && !existing.deliveredAt) updates.deliveredAt = new Date();
  return updates;
}

function requirePickupBeforeRoute(
  toStatus: OrderStatus,
  existing: { pickedUpAt?: Date | null },
): void {
  if (normalizeOrderStatus(toStatus) === "em_rota_entrega" && !existing.pickedUpAt) {
    throw new Error("Registre a retirada do pedido antes de marcar saída para entrega.");
  }
}

function clearDriverOnStatus(status: OrderStatus): boolean {
  return ["novo", "em_preparo"].includes(normalizeOrderStatus(status));
}

type Db = ReturnType<typeof getDb>;

async function maybeAutoAssignDriver(
  db: Db,
  order: { id: string; tenantId: string; driverId: string | null; status: string },
  actorId: string | null,
) {
  const assigned = await tryAutoAssignDriver(db, order, actorId, async (orderId, tenantId, actor, from, to, note) => {
    await logOrderEvent(orderId, tenantId, actor, from as OrderStatus, to as OrderStatus, note);
  });
  if (!assigned) return order;

  const [fresh] = await db
    .select()
    .from(schema.orders)
    .where(and(eq(schema.orders.id, order.id), eq(schema.orders.tenantId, order.tenantId)))
    .limit(1);
  return fresh ?? order;
}

/** Pagamento na entrega: marca pago ao finalizar (alinha Postgres com modo local). */
function deliveryPaymentUpdate(
  toStatus: OrderStatus,
  existing: { paymentMethod?: string | null },
): Partial<typeof schema.orders.$inferInsert> {
  if (normalizeOrderStatus(toStatus) !== "entregue") return {};
  if (existing.paymentMethod === "on_delivery") {
    return { paymentStatus: "pago" };
  }
  return {};
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
  neighborhood: schema.orders.neighborhood,
  postalCode: schema.orders.postalCode,
  lat: schema.orders.lat,
  lng: schema.orders.lng,
  itemsCount: schema.orders.itemsCount,
  subtotalAmount: schema.orders.subtotalAmount,
  deliveryFee: schema.orders.deliveryFee,
  discountAmount: schema.orders.discountAmount,
  totalAmount: schema.orders.totalAmount,
  paymentMethod: schema.orders.paymentMethod,
  paymentStatus: schema.orders.paymentStatus,
  channel: schema.orders.channel,
  notes: schema.orders.notes,
  slaMinutes: schema.orders.slaMinutes,
  placedAt: schema.orders.placedAt,
  pickedUpAt: schema.orders.pickedUpAt,
  deliveredAt: schema.orders.deliveredAt,
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
    requirePickupBeforeRoute(toStatus, existing);
    if (toStatus === "entregue" && fromStatus !== "em_rota_entrega") {
      throw new Error("O pedido precisa estar em rota antes de ser finalizado.");
    }

    const updates: Partial<typeof schema.orders.$inferInsert> = {
      status: toStatus,
      updatedAt: new Date(),
      ...statusTimestamps(toStatus, existing),
      ...deliveryPaymentUpdate(toStatus, existing),
    };

    if (clearDriverOnStatus(toStatus)) updates.driverId = null;

    let [updated] = await db
      .update(schema.orders)
      .set(updates)
      .where(and(eq(schema.orders.id, data.orderId), eq(schema.orders.tenantId, existing.tenantId)))
      .returning();

    await logOrderEvent(data.orderId, existing.tenantId, user.id, fromStatus, toStatus);

    if (toStatus === "aguardando_entregador" && !updated.driverId) {
      updated = await maybeAutoAssignDriver(db, updated, user.id);
    }

    await syncDriversForOrderChange(db, existing.driverId, updated.driverId);

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

    if (data.action === "retirei_pedido") {
      if (!existing.driverId) throw new Error("Pedido não atribuído a você.");
      let isAssignedDriver = false;
      const [drv] = await db
        .select({ userId: schema.drivers.userId })
        .from(schema.drivers)
        .where(eq(schema.drivers.id, existing.driverId))
        .limit(1);
      isAssignedDriver = drv?.userId === user.id;
      assertCanUpdateOrderStatus(
        user,
        existing.tenantId,
        fromStatus,
        fromStatus,
        isAssignedDriver,
      );
      if (
        !canApplyAction(fromStatus, data.action, {
          hasDriver: !!existing.driverId,
          pickedUp: !!existing.pickedUpAt,
        })
      ) {
        throw new Error("Não é possível registrar retirada neste status.");
      }
      if (existing.pickedUpAt) {
        return mapOrder(existing);
      }

      const [updated] = await db
        .update(schema.orders)
        .set({ pickedUpAt: new Date(), updatedAt: new Date() })
        .where(and(eq(schema.orders.id, data.orderId), eq(schema.orders.tenantId, existing.tenantId)))
        .returning();

      await logOrderEvent(
        data.orderId,
        existing.tenantId,
        user.id,
        fromStatus,
        fromStatus,
        "Pedido retirado no restaurante",
      );
      return mapOrder(updated);
    }

    if (data.action === "atribuir_entregador") {
      if (!data.driverId) throw new Error("Selecione um entregador.");
      assertCanAssignDriver(user, existing.tenantId);
      if (!canApplyAction(fromStatus, data.action)) {
        throw new Error("Não é possível atribuir entregador neste status.");
      }

      await assertDriverAvailableForAssignment(db, data.driverId, existing.tenantId);

      const [updated] = await db
        .update(schema.orders)
        .set({
          driverId: data.driverId,
          status: "aguardando_entregador",
          updatedAt: new Date(),
        })
        .where(and(eq(schema.orders.id, data.orderId), eq(schema.orders.tenantId, existing.tenantId)))
        .returning();

      await logOrderEvent(
        data.orderId,
        existing.tenantId,
        user.id,
        fromStatus,
        "aguardando_entregador",
        `Entregador atribuído`,
      );

      await markDriverEmRota(db, data.driverId, existing.tenantId);

      await syncDriversForOrderChange(db, existing.driverId, data.driverId);

      void notifyDriverAssigned({
        orderId: data.orderId,
        tenantId: existing.tenantId,
        driverId: data.driverId,
      }).catch(() => {});

      return mapOrder(updated);
    }

    if (
      !canApplyAction(fromStatus, data.action, {
        hasDriver: !!existing.driverId,
        pickedUp: !!existing.pickedUpAt,
      })
    ) {
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
    requirePickupBeforeRoute(toStatus, existing);

    const updates: Partial<typeof schema.orders.$inferInsert> = {
      status: toStatus,
      updatedAt: new Date(),
      ...statusTimestamps(toStatus, existing),
      ...deliveryPaymentUpdate(toStatus, existing),
    };
    if (clearDriverOnStatus(toStatus)) updates.driverId = null;

    let [updated] = await db
      .update(schema.orders)
      .set(updates)
      .where(and(eq(schema.orders.id, data.orderId), eq(schema.orders.tenantId, existing.tenantId)))
      .returning();

    await logOrderEvent(data.orderId, existing.tenantId, user.id, fromStatus, toStatus);

    if (toStatus === "aguardando_entregador" && !updated.driverId) {
      updated = await maybeAutoAssignDriver(db, updated, user.id);
    }

    await syncDriversForOrderChange(db, existing.driverId, updated.driverId);

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
    requirePickupBeforeRoute(toStatus, existing);

    if (data.driverId && data.driverId !== existing.driverId) {
      await assertDriverAvailableForAssignment(db, data.driverId, existing.tenantId);
    }

    const [updated] = await db
      .update(schema.orders)
      .set({
        driverId: data.driverId,
        status: toStatus,
        updatedAt: new Date(),
        ...statusTimestamps(toStatus, existing),
      })
      .where(and(eq(schema.orders.id, data.orderId), eq(schema.orders.tenantId, existing.tenantId)))
      .returning();

    if (fromStatus !== toStatus) {
      await logOrderEvent(data.orderId, existing.tenantId, user.id, fromStatus, toStatus);
    }

    await syncDriversForOrderChange(db, existing.driverId, updated.driverId);

    if (data.driverId && data.driverId !== existing.driverId) {
      await markDriverEmRota(db, data.driverId, existing.tenantId);
      void notifyDriverAssigned({
        orderId: data.orderId,
        tenantId: existing.tenantId,
        driverId: data.driverId,
      }).catch(() => {});
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

    if (data.order.driver_id) {
      throw new Error("Entregador só pode ser atribuído após a criação do pedido.");
    }
    const requestedStatus = data.order.status ? normalizeOrderStatus(data.order.status) : "novo";
    if (requestedStatus !== "novo") {
      throw new Error("Novos pedidos devem iniciar com status 'novo'.");
    }

    const lines = data.lines ?? [];
    if (lines.length === 0) throw new Error("Selecione ao menos um item do cardápio");

    const itemsCount = lines.reduce((s, l) => s + l.quantity, 0);
    const subtotal = lines.reduce((s, l) => s + l.unit_price * l.quantity, 0);
    const deliveryFee = data.order.delivery_fee ?? 0;
    const discount = data.order.discount_amount ?? 0;
    const total = subtotal + deliveryFee - discount;

    const db = getDb();

    const [storeRow] = await db
      .select({ lat: schema.stores.lat, lng: schema.stores.lng })
      .from(schema.stores)
      .where(eq(schema.stores.tenantId, data.order.tenant_id))
      .limit(1);

    const [settingsRow] = await db
      .select()
      .from(schema.tenantMenuSettings)
      .where(eq(schema.tenantMenuSettings.tenantId, data.order.tenant_id))
      .limit(1);
    const storeSettings = settingsRow
      ? mapTenantMenuSettingsRow(settingsRow)
      : DEFAULT_MENU_SETTINGS;

    const neighborhood = data.order.neighborhood ?? null;
    const coords = await resolveOrderCoordinates({
      address: data.order.address,
      neighborhood,
      cityRegion: storeSettings.store_region,
      city: storeSettings.store_city,
      state: storeSettings.store_state,
      storeProximity:
        storeRow?.lat != null && storeRow?.lng != null
          ? { lat: storeRow.lat, lng: storeRow.lng }
          : null,
    });

    const created = await db.transaction(async (tx) => {
      let orderRow;
      try {
        [orderRow] = await tx
          .insert(schema.orders)
          .values({
            tenantId: data.order.tenant_id,
            storeId: null,
            driverId: null,
            code: data.order.code,
            status: "novo",
            priority: data.order.priority,
            customerName: data.order.customer_name,
            customerPhone: data.order.customer_phone,
            address: buildNavigationAddress({
              address: data.order.address,
              neighborhood,
              cityRegion: storeSettings.store_region,
              city: storeSettings.store_city,
              state: storeSettings.store_state,
            }),
            lat: coords.lat,
            lng: coords.lng,
            itemsCount,
            subtotalAmount: String(subtotal.toFixed(2)),
            deliveryFee: String(deliveryFee.toFixed(2)),
            discountAmount: String(discount.toFixed(2)),
            totalAmount: String(total.toFixed(2)),
            paymentMethod: data.order.payment_method ?? null,
            fulfillmentType: "delivery",
            couponCode: null,
            neighborhood,
            channel: data.order.channel,
            notes: data.order_notes?.trim() || null,
            slaMinutes: data.order.sla_minutes,
            paymentStatus: "pendente",
          })
          .returning();
      } catch (err: unknown) {
        const pgMsg =
          err && typeof err === "object" && "cause" in err
            ? (err as { cause?: { message?: string } }).cause?.message
            : undefined;
        if (pgMsg?.includes("não existe")) {
          throw new Error(
            "Banco de dados desatualizado. Na pasta swift-dispatch-main, execute: npm run db:migrate",
          );
        }
        throw err instanceof Error ? err : new Error("Erro ao criar pedido");
      }

      for (const line of lines) {
        await tx.insert(schema.orderLineItems).values({
          orderId: orderRow.id,
          menuItemId: line.menu_item_id,
          name: line.name,
          quantity: line.quantity,
          unitPrice: String(line.unit_price),
          notes: line.notes?.trim() || null,
        });
      }

      await tx.insert(schema.orderEvents).values({
        orderId: orderRow.id,
        tenantId: orderRow.tenantId,
        actorId: user.id,
        toStatus: "novo",
      });

      return orderRow;
    });

    void notifyOrderStatusChange({
      orderId: created.id,
      tenantId: created.tenantId,
      fromStatus: null,
      toStatus: "novo",
    }).catch(() => {});

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

    if (data.orders.length === 0) return;

    const tenantId = data.orders[0].tenant_id;
    await assertTenantAccess(user.id, tenantId);
    assertCanBatchDispatch(user, tenantId);

    const affectedDrivers = new Set<string>();

    for (const order of data.orders) {
      if (order.tenant_id !== tenantId) {
        throw new Error("Despacho em lote deve ser de um único tenant");
      }

      const [existing] = await db
        .select()
        .from(schema.orders)
        .where(eq(schema.orders.id, order.id))
        .limit(1);

      if (!existing) {
        throw new Error(`Pedido ${order.code ?? order.id} não encontrado`);
      }
      if (existing.tenantId !== tenantId) {
        throw new Error("Pedido não pertence a este tenant");
      }

      const fromStatus = normalizeOrderStatus(existing.status);
      const toStatus = normalizeOrderStatus(order.status);
      const nextDriverId = order.driver_id ?? existing.driverId ?? null;
      const statusChanged = fromStatus !== toStatus;
      const driverChanged =
        order.driver_id != null && order.driver_id !== (existing.driverId ?? null);

      if (!statusChanged && !driverChanged) continue;

      if (statusChanged) {
        assertValidTransition(fromStatus, toStatus);
      }

      if (toStatus === "em_rota_entrega" && !nextDriverId) {
        throw new Error(`Pedido ${order.code}: atribua entregador antes de sair para entrega.`);
      }
      requirePickupBeforeRoute(toStatus, existing);
      if (toStatus === "entregue" && fromStatus !== "em_rota_entrega") {
        throw new Error(`Pedido ${order.code}: precisa estar em rota antes de finalizar.`);
      }

      if (driverChanged && order.driver_id) {
        assertCanAssignDriver(user, tenantId);
        await assertDriverAvailableForAssignment(db, order.driver_id, tenantId);
      }

      const updates: Partial<typeof schema.orders.$inferInsert> = {
        updatedAt: new Date(),
      };

      if (statusChanged) {
        updates.status = toStatus;
        Object.assign(updates, statusTimestamps(toStatus, existing));
        Object.assign(updates, deliveryPaymentUpdate(toStatus, existing));
      }

      if (driverChanged) {
        updates.driverId = order.driver_id;
      }

      if (statusChanged && clearDriverOnStatus(toStatus)) {
        updates.driverId = null;
      }

      const [updated] = await db
        .update(schema.orders)
        .set(updates)
        .where(and(eq(schema.orders.id, order.id), eq(schema.orders.tenantId, tenantId)))
        .returning();

      if (statusChanged) {
        await logOrderEvent(
          order.id,
          order.tenant_id,
          user.id,
          fromStatus,
          toStatus,
          "Despacho automático",
        );
      }

      if (driverChanged && order.driver_id) {
        await markDriverEmRota(db, order.driver_id, tenantId);

        void notifyDriverAssigned({
          orderId: order.id,
          tenantId: order.tenant_id,
          driverId: order.driver_id,
        }).catch(() => {});
      }

      if (existing.driverId) affectedDrivers.add(existing.driverId);
      if (updated.driverId) affectedDrivers.add(updated.driverId);
    }

    await Promise.all([...affectedDrivers].map((driverId) => syncDriverActiveOrders(db, driverId)));
  });
