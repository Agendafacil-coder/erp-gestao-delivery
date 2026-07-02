import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/connection.server";
import { schema } from "@/db";
import { normalizeOrderStatus } from "@/lib/ops/orderWorkflow";
import { isFeatureEnabled } from "@/lib/tenant/featureFlags";
import { loadTenantFeatureFlags } from "@/lib/tenant/featureFlags.server";

export type LastOrderDto = {
  order_id: string;
  code: string;
  items: Array<{
    menu_item_id: string | null;
    name: string;
    quantity: number;
    unit_price: number;
    image_url: string | null;
  }>;
};

export const getLastOrderByPhoneFn = createServerFn({ method: "GET" })
  .inputValidator((data: { tenantSlug: string; phone: string }) => data)
  .handler(async ({ data }): Promise<LastOrderDto | null> => {
    const digits = data.phone.replace(/\D/g, "");
    if (digits.length < 10) return null;

    const db = getDb();
    const [tenant] = await db
      .select({ id: schema.tenants.id })
      .from(schema.tenants)
      .where(eq(schema.tenants.slug, data.tenantSlug))
      .limit(1);

    if (!tenant) return null;

    const [order] = await db
      .select({
        id: schema.orders.id,
        code: schema.orders.code,
        status: schema.orders.status,
      })
      .from(schema.orders)
      .where(
        and(
          eq(schema.orders.tenantId, tenant.id),
          sql`regexp_replace(coalesce(${schema.orders.customerPhone}, ''), '\\D', '', 'g') = ${digits}`,
          eq(schema.orders.status, "entregue"),
        ),
      )
      .orderBy(desc(schema.orders.deliveredAt))
      .limit(1);

    if (!order || normalizeOrderStatus(order.status) !== "entregue") return null;

    const lines = await db
      .select({
        menuItemId: schema.orderLineItems.menuItemId,
        name: schema.orderLineItems.name,
        quantity: schema.orderLineItems.quantity,
        unitPrice: schema.orderLineItems.unitPrice,
        imageUrl: schema.menuItems.imageUrl,
      })
      .from(schema.orderLineItems)
      .leftJoin(schema.menuItems, eq(schema.orderLineItems.menuItemId, schema.menuItems.id))
      .where(eq(schema.orderLineItems.orderId, order.id));

    if (lines.length === 0) return null;

    return {
      order_id: order.id,
      code: order.code,
      items: lines.map((l) => ({
        menu_item_id: l.menuItemId,
        name: l.name,
        quantity: l.quantity,
        unit_price: Number(l.unitPrice),
        image_url: l.imageUrl,
      })),
    };
  });

export const listCustomerFavoritesFn = createServerFn({ method: "GET" })
  .inputValidator((data: { tenantSlug: string; phone: string }) => data)
  .handler(async ({ data }) => {
    const digits = data.phone.replace(/\D/g, "");
    if (digits.length < 10) return [];

    const db = getDb();
    const [tenant] = await db
      .select({ id: schema.tenants.id })
      .from(schema.tenants)
      .where(eq(schema.tenants.slug, data.tenantSlug))
      .limit(1);

    if (!tenant) return [];

    const flags = await loadTenantFeatureFlags(tenant.id);
    if (!isFeatureEnabled(flags, "customer_favorites")) return [];

    const rows = await db
      .select({
        menuItemId: schema.customerFavorites.menuItemId,
        name: schema.menuItems.name,
        price: schema.menuItems.price,
        imageUrl: schema.menuItems.imageUrl,
        available: schema.menuItems.available,
      })
      .from(schema.customerFavorites)
      .innerJoin(schema.menuItems, eq(schema.customerFavorites.menuItemId, schema.menuItems.id))
      .where(
        and(
          eq(schema.customerFavorites.tenantId, tenant.id),
          eq(schema.customerFavorites.phone, digits),
          eq(schema.menuItems.available, true),
        ),
      )
      .limit(20);

    return rows.map((r) => ({
      menu_item_id: r.menuItemId,
      name: r.name,
      price: Number(r.price),
      image_url: r.imageUrl,
    }));
  });

export const toggleCustomerFavoriteFn = createServerFn({ method: "POST" })
  .inputValidator((data: { tenantSlug: string; phone: string; menuItemId: string }) => data)
  .handler(async ({ data }): Promise<{ favorited: boolean }> => {
    const digits = data.phone.replace(/\D/g, "");
    if (digits.length < 10) throw new Error("Telefone inválido");

    const db = getDb();
    const [tenant] = await db
      .select({ id: schema.tenants.id })
      .from(schema.tenants)
      .where(eq(schema.tenants.slug, data.tenantSlug))
      .limit(1);

    if (!tenant) throw new Error("Loja não encontrada");

    const flags = await loadTenantFeatureFlags(tenant.id);
    if (!isFeatureEnabled(flags, "customer_favorites")) {
      throw new Error("Favoritos não disponíveis nesta loja.");
    }

    const [existing] = await db
      .select({ id: schema.customerFavorites.id })
      .from(schema.customerFavorites)
      .where(
        and(
          eq(schema.customerFavorites.tenantId, tenant.id),
          eq(schema.customerFavorites.phone, digits),
          eq(schema.customerFavorites.menuItemId, data.menuItemId),
        ),
      )
      .limit(1);

    if (existing) {
      await db.delete(schema.customerFavorites).where(eq(schema.customerFavorites.id, existing.id));
      return { favorited: false };
    }

    await db.insert(schema.customerFavorites).values({
      tenantId: tenant.id,
      phone: digits,
      menuItemId: data.menuItemId,
    });

    return { favorited: true };
  });
