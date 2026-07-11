import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { getDb } from "@/db/connection.server";
import { schema } from "@/db";
import {
  getCustomerTopItems,
  normalizeCrmPhone,
  orderPhoneNormalizedSql,
  rebuildCustomerProfilesFromOrders,
} from "@/lib/crm/customerProfiles.server";
import { dispatchWhatsappMessage } from "@/lib/whatsapp/orderNotifications";
import { assertCanAccessWhatsapp } from "@/lib/rbac";
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

function normalizePromoPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) {
    throw new Error("Telefone inválido. Use DDD + número.");
  }
  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  return `+${withCountry}`;
}

export type CrmCustomerListItem = {
  phone: string;
  name: string | null;
  order_count: number;
  total_spent: number;
  last_order_at: string | null;
};

export type CrmCustomerDetail = {
  phone: string;
  name: string | null;
  notes: string | null;
  order_count: number;
  total_spent: number;
  avg_ticket: number;
  last_order_at: string | null;
  top_items: Array<{ name: string; quantity: number; times_ordered: number }>;
  recent_orders: Array<{
    id: string;
    code: string;
    total_amount: number;
    status: string;
    placed_at: string;
    channel: string | null;
    items: Array<{ name: string; quantity: number }>;
  }>;
};

export const listCrmCustomersFn = createServerFn({ method: "GET" })
  .inputValidator((data: { tenantId: string; q?: string; limit?: number }) => data)
  .handler(async ({ data }): Promise<CrmCustomerListItem[]> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);

    const db = getDb();
    const limit = Math.min(data.limit ?? 200, 500);
    const q = data.q?.trim();

    const profiles = await db
      .select()
      .from(schema.customerProfiles)
      .where(
        q
          ? and(
              eq(schema.customerProfiles.tenantId, data.tenantId),
              or(
                ilike(schema.customerProfiles.name, `%${q}%`),
                ilike(schema.customerProfiles.phone, `%${q.replace(/\D/g, "")}%`),
              ),
            )
          : eq(schema.customerProfiles.tenantId, data.tenantId),
      )
      .orderBy(desc(schema.customerProfiles.lastOrderAt))
      .limit(limit);

    return profiles.map((p) => ({
      phone: p.phone,
      name: p.name,
      order_count: p.orderCount,
      total_spent: Number(p.totalSpent),
      last_order_at: p.lastOrderAt?.toISOString() ?? null,
    }));
  });

export const getCrmCustomerDetailFn = createServerFn({ method: "GET" })
  .inputValidator((data: { tenantId: string; phone: string }) => data)
  .handler(async ({ data }): Promise<CrmCustomerDetail | null> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);

    const digits = normalizeCrmPhone(data.phone);
    if (digits.length < 10) return null;

    const db = getDb();

    const [profile] = await db
      .select()
      .from(schema.customerProfiles)
      .where(
        and(
          eq(schema.customerProfiles.tenantId, data.tenantId),
          eq(schema.customerProfiles.phone, digits),
        ),
      )
      .limit(1);

    const recentOrders = await db
      .select({
        id: schema.orders.id,
        code: schema.orders.code,
        customerName: schema.orders.customerName,
        totalAmount: schema.orders.totalAmount,
        status: schema.orders.status,
        placedAt: schema.orders.placedAt,
        channel: schema.orders.channel,
      })
      .from(schema.orders)
      .where(
        and(
          eq(schema.orders.tenantId, data.tenantId),
          sql`${orderPhoneNormalizedSql()} = ${digits}`,
        ),
      )
      .orderBy(desc(schema.orders.placedAt))
      .limit(20);

    if (!profile && recentOrders.length === 0) return null;

    const orderIds = recentOrders.map((o) => o.id);
    const lineRows =
      orderIds.length > 0
        ? await db
            .select({
              orderId: schema.orderLineItems.orderId,
              name: schema.orderLineItems.name,
              quantity: schema.orderLineItems.quantity,
            })
            .from(schema.orderLineItems)
            .where(inArray(schema.orderLineItems.orderId, orderIds))
        : [];

    const itemsByOrder = new Map<string, Array<{ name: string; quantity: number }>>();
    for (const line of lineRows) {
      const list = itemsByOrder.get(line.orderId) ?? [];
      list.push({ name: line.name, quantity: line.quantity });
      itemsByOrder.set(line.orderId, list);
    }

    const topItems = await getCustomerTopItems(db, data.tenantId, digits, 8);
    const orderCount = profile?.orderCount ?? recentOrders.length;
    const totalSpent = profile
      ? Number(profile.totalSpent)
      : recentOrders.reduce((a, o) => a + Number(o.totalAmount), 0);
    const displayName =
      profile?.name?.trim() ||
      recentOrders.find((o) => o.customerName?.trim())?.customerName?.trim() ||
      null;

    return {
      phone: digits,
      name: displayName,
      notes: profile?.notes ?? null,
      order_count: orderCount,
      total_spent: totalSpent,
      avg_ticket: orderCount > 0 ? totalSpent / orderCount : 0,
      last_order_at: profile?.lastOrderAt?.toISOString() ?? recentOrders[0]?.placedAt.toISOString() ?? null,
      top_items: topItems,
      recent_orders: recentOrders.map((o) => ({
        id: o.id,
        code: o.code,
        total_amount: Number(o.totalAmount),
        status: o.status,
        placed_at: o.placedAt.toISOString(),
        channel: o.channel,
        items: itemsByOrder.get(o.id) ?? [],
      })),
    };
  });

export const syncCrmCustomersFn = createServerFn({ method: "POST" })
  .inputValidator((data: { tenantId: string }) => data)
  .handler(async ({ data }): Promise<{ upserted: number }> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    const db = getDb();
    return rebuildCustomerProfilesFromOrders(db, data.tenantId);
  });

export const sendCrmPromoFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      tenantId: string;
      phone: string;
      message: string;
      imageUrl?: string | null;
      recipientLabel?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanAccessWhatsapp(user, data.tenantId);

    const message = data.message.trim();
    if (!message && !data.imageUrl?.trim()) {
      throw new Error("Informe um texto ou uma imagem para a promoção.");
    }

    const phone = normalizePromoPhone(data.phone);
    return dispatchWhatsappMessage({
      tenantId: data.tenantId,
      recipientType: "cliente",
      recipientPhone: phone,
      recipientLabel: data.recipientLabel ?? phone,
      templateKey: "campaign",
      content: message || "(imagem)",
      mediaUrl: data.imageUrl?.trim() || null,
    });
  });
