import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { OrderStatus } from "@/lib/ops/mock";
import { requireSessionUser } from "./session";

export type CartLine = {
  menu_item_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  notes?: string;
};

export type CreatePublicOrderInput = {
  tenantSlug: string;
  customer_name: string;
  customer_phone: string;
  address: string;
  lat?: number;
  lng?: number;
  lines: CartLine[];
  notes?: string;
  payment_method?: "pix" | "card" | "on_delivery";
};

export type CreatePublicOrderResult = {
  order_id: string;
  tracking_token: string;
  code: string;
  total_amount: number;
  payment_status: string;
};

function nextOrderCode(existingCount: number): string {
  return `#${String(existingCount + 1).padStart(4, "0")}`;
}

export const createPublicOrderFn = createServerFn({ method: "POST" })
  .inputValidator((data: CreatePublicOrderInput) => data)
  .handler(async ({ data }): Promise<CreatePublicOrderResult> => {
    const db = getDb();

    const [tenant] = await db
      .select()
      .from(schema.tenants)
      .where(eq(schema.tenants.slug, data.tenantSlug))
      .limit(1);

    if (!tenant) throw new Error("Restaurante não encontrado");
    if (!data.lines.length) throw new Error("Carrinho vazio");

    const [store] = await db
      .select()
      .from(schema.stores)
      .where(and(eq(schema.stores.tenantId, tenant.id), eq(schema.stores.active, true)))
      .limit(1);

    const existingOrders = await db
      .select({ id: schema.orders.id })
      .from(schema.orders)
      .where(eq(schema.orders.tenantId, tenant.id));

    const total = data.lines.reduce((s, l) => s + l.unit_price * l.quantity, 0);
    const payOnDelivery = data.payment_method === "on_delivery";
    const paymentStatus = payOnDelivery ? "pendente" : "pendente";

    const [order] = await db
      .insert(schema.orders)
      .values({
        tenantId: tenant.id,
        storeId: store?.id ?? null,
        code: nextOrderCode(existingOrders.length),
        status: "novo" as OrderStatus,
        customerName: data.customer_name.trim(),
        customerPhone: data.customer_phone.trim(),
        address: data.address.trim(),
        lat: data.lat ?? null,
        lng: data.lng ?? null,
        itemsCount: data.lines.reduce((s, l) => s + l.quantity, 0),
        subtotalAmount: String(total.toFixed(2)),
        totalAmount: String(total.toFixed(2)),
        paymentMethod: data.payment_method ?? null,
        channel: "site",
        notes: data.notes ?? null,
        paymentStatus,
      })
      .returning();

    for (const line of data.lines) {
      await db.insert(schema.orderLineItems).values({
        orderId: order.id,
        menuItemId: line.menu_item_id,
        name: line.name,
        quantity: line.quantity,
        unitPrice: String(line.unit_price),
        notes: line.notes ?? null,
      });
    }

    await db.insert(schema.orderEvents).values({
      orderId: order.id,
      tenantId: tenant.id,
      toStatus: "novo",
      note: "Pedido via cardápio digital",
    });

    return {
      order_id: order.id,
      tracking_token: order.trackingToken!,
      code: order.code,
      total_amount: total,
      payment_status: order.paymentStatus,
    };
  });

export const listOrderLineItemsFn = createServerFn({ method: "GET" })
  .inputValidator((data: { orderId: string; tenantId: string }) => data)
  .handler(async ({ data }) => {
    const user = await requireSessionUser();
    const db = getDb();
    const [role] = await db
      .select({ id: schema.userRoles.id })
      .from(schema.userRoles)
      .where(
        and(eq(schema.userRoles.userId, user.id), eq(schema.userRoles.tenantId, data.tenantId)),
      )
      .limit(1);
    if (!role) throw new Error("Sem permissão");

    const rows = await db
      .select()
      .from(schema.orderLineItems)
      .where(eq(schema.orderLineItems.orderId, data.orderId));

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      quantity: r.quantity,
      unit_price: Number(r.unitPrice),
      notes: r.notes,
    }));
  });
