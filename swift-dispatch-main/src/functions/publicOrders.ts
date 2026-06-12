import { createServerFn } from "@tanstack/react-start";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/connection.server";
import { schema } from "@/db";
import type { OrderStatus } from "@/lib/ops/orderWorkflow";
import { quotePublicOrder } from "@/lib/menu/order-pricing";
import { isStoreOpenNow } from "@/lib/menu/store-hours";
import { aggregateMenuItemQuantities } from "@/lib/menu/menu-stock";
import { deductMenuStock } from "@/lib/menu/menu-stock.server";
import type { CartAddonSelection } from "@/lib/menu/cart-line";
import { buildNavigationAddress, parseOptionalPostalCode } from "@/lib/geo/addressNavigation";
import { resolveOrderCoordinates } from "@/lib/geo/geocode";
import { markAbandonedCartConverted } from "@/lib/marketing/abandonedCart";
import { redeemLoyaltyPoints } from "@/lib/loyalty/loyaltyWallet.server";
import { requireSessionUser } from "./session";
import { assertCanAccessOpsSnapshot } from "@/lib/rbac";

async function assertTenantAccess(userId: string, tenantId: string) {
  const db = getDb();
  const [row] = await db
    .select({ id: schema.userRoles.id })
    .from(schema.userRoles)
    .where(and(eq(schema.userRoles.userId, userId), eq(schema.userRoles.tenantId, tenantId)))
    .limit(1);
  if (!row) throw new Error("Sem permissão para este tenant");
}

export type CartLine = {
  menu_item_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  notes?: string;
  variation_id?: string;
  variation_name?: string;
  addons?: CartAddonSelection[];
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
  fulfillment_type?: "delivery" | "pickup";
  neighborhood?: string;
  postal_code?: string;
  coupon_code?: string;
  use_loyalty?: boolean;
};

export type CreatePublicOrderResult = {
  order_id: string;
  tracking_token: string;
  code: string;
  total_amount: number;
  subtotal_amount: number;
  delivery_fee: number;
  discount_amount: number;
  payment_status: string;
};

export type QuotePublicOrderInput = {
  tenantSlug: string;
  lines: CartLine[];
  fulfillment_type: "delivery" | "pickup";
  neighborhood?: string;
  coupon_code?: string;
  customer_phone?: string;
  use_loyalty?: boolean;
};

function nextOrderCode(existingCount: number): string {
  return `#${String(existingCount + 1).padStart(4, "0")}`;
}

export const quotePublicOrderFn = createServerFn({ method: "POST" })
  .inputValidator((data: QuotePublicOrderInput) => data)
  .handler(async ({ data }) => quotePublicOrder(data));

export const createPublicOrderFn = createServerFn({ method: "POST" })
  .inputValidator((data: CreatePublicOrderInput) => data)
  .handler(async ({ data }): Promise<CreatePublicOrderResult> => {
    const db = getDb();
    const fulfillment = data.fulfillment_type ?? "delivery";

    const quote = await quotePublicOrder({
      tenantSlug: data.tenantSlug,
      lines: data.lines,
      fulfillment_type: fulfillment,
      neighborhood: data.neighborhood,
      coupon_code: data.coupon_code,
      customer_phone: data.customer_phone,
      use_loyalty: data.use_loyalty,
    });

    if (!quote.meets_minimum) {
      throw new Error(
        `Pedido mínimo de R$ ${quote.min_order_amount.toFixed(2).replace(".", ",")}. Adicione mais itens.`,
      );
    }

    if (fulfillment === "delivery" && !quote.settings.delivery_enabled) {
      throw new Error("Entrega indisponível no momento");
    }
    if (fulfillment === "pickup" && !quote.settings.pickup_enabled) {
      throw new Error("Retirada indisponível no momento");
    }
    if (!isStoreOpenNow(quote.settings.opening_hours)) {
      throw new Error("A loja está fechada no momento. Confira o horário de funcionamento.");
    }

    const [tenant] = await db
      .select()
      .from(schema.tenants)
      .where(eq(schema.tenants.slug, data.tenantSlug))
      .limit(1);

    if (!tenant) throw new Error("Restaurante não encontrado");

    const [store] = await db
      .select()
      .from(schema.stores)
      .where(and(eq(schema.stores.tenantId, tenant.id), eq(schema.stores.active, true)))
      .limit(1);

    const existingOrders = await db
      .select({ id: schema.orders.id })
      .from(schema.orders)
      .where(eq(schema.orders.tenantId, tenant.id));

    const address =
      fulfillment === "pickup"
        ? (quote.settings.store_address ?? store?.address ?? "Retirada na loja")
        : data.address.trim();

    if (fulfillment === "delivery" && !address) {
      throw new Error("Informe o endereço de entrega");
    }

    const neighborhood = data.neighborhood?.trim() || null;
    const postalCode =
      fulfillment === "delivery" ? parseOptionalPostalCode(data.postal_code) : null;
    const storeProximity =
      store?.lat != null && store?.lng != null ? { lat: store.lat, lng: store.lng } : null;
    const coords =
      fulfillment === "delivery"
        ? await resolveOrderCoordinates({
            address,
            neighborhood,
            postalCode,
            cityRegion: quote.settings.store_region,
            city: quote.settings.store_city,
            state: quote.settings.store_state,
            storeProximity,
          })
        : { lat: null as number | null, lng: null as number | null, navigationAddress: address };

    const payOnDelivery = data.payment_method === "on_delivery";
    const paymentStatus = payOnDelivery ? "pendente" : "pendente";

    const stockQty = aggregateMenuItemQuantities(quote.lines);

    const order = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(schema.orders)
        .values({
          tenantId: tenant.id,
          storeId: store?.id ?? null,
          code: nextOrderCode(existingOrders.length),
          status: "novo" as OrderStatus,
          customerName: data.customer_name.trim(),
          customerPhone: data.customer_phone.trim(),
          address:
            fulfillment === "delivery"
              ? buildNavigationAddress({
                  address,
                  neighborhood,
                  postalCode,
                  cityRegion: quote.settings.store_region,
                  city: quote.settings.store_city,
                  state: quote.settings.store_state,
                })
              : address,
          lat: coords.lat,
          lng: coords.lng,
          itemsCount: quote.lines.reduce((s, l) => s + l.quantity, 0),
          subtotalAmount: String(quote.subtotal.toFixed(2)),
          deliveryFee: String(quote.delivery_fee.toFixed(2)),
          discountAmount: String(quote.discount.toFixed(2)),
          totalAmount: String(quote.total.toFixed(2)),
          loyaltyPointsRedeemed: quote.loyalty_points_redeemed,
          loyaltyPointsEarned: quote.points_earned_preview,
          paymentMethod: data.payment_method ?? null,
          fulfillmentType: fulfillment,
          couponCode: data.coupon_code?.trim() || null,
          neighborhood,
          postalCode,
          channel: "site",
          notes: data.notes ?? null,
          paymentStatus,
        })
        .returning();

      for (const line of quote.lines) {
        await tx.insert(schema.orderLineItems).values({
          orderId: created.id,
          menuItemId: line.menu_item_id,
          name: line.name,
          quantity: line.quantity,
          unitPrice: String(line.unit_price),
          notes: line.notes ?? null,
        });

        await tx
          .update(schema.menuItems)
          .set({
            salesCount: sql`${schema.menuItems.salesCount} + ${line.quantity}`,
            updatedAt: new Date(),
          })
          .where(eq(schema.menuItems.id, line.menu_item_id));
      }

      await deductMenuStock(tx, tenant.id, stockQty);

      if (quote.loyalty_points_redeemed > 0) {
        await redeemLoyaltyPoints(
          tx,
          tenant.id,
          data.customer_phone,
          quote.loyalty_points_redeemed,
        );
      }

      await tx.insert(schema.orderEvents).values({
        orderId: created.id,
        tenantId: tenant.id,
        toStatus: "novo",
        note: "Pedido via cardápio digital",
      });

      return created;
    });

    await markAbandonedCartConverted(tenant.id, data.customer_phone).catch(() => {});

    const { logAutomationNewOrder } = await import("@/lib/ops/automationEventHelpers");
    logAutomationNewOrder(tenant.id, order.id, order.code, order.customerName, "site");

    return {
      order_id: order.id,
      tracking_token: order.trackingToken!,
      code: order.code,
      total_amount: quote.total,
      subtotal_amount: quote.subtotal,
      delivery_fee: quote.delivery_fee,
      discount_amount: quote.discount,
      payment_status: order.paymentStatus,
    };
  });

export const listOrderLineItemsFn = createServerFn({ method: "GET" })
  .inputValidator((data: { orderId: string; tenantId: string }) => data)
  .handler(async ({ data }) => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanAccessOpsSnapshot(user, data.tenantId);

    const db = getDb();
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
      menu_item_id: r.menuItemId,
    }));
  });
