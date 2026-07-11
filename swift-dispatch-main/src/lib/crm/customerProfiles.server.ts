import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import type { getDb } from "@/db/connection.server";
import { schema } from "@/db";

type Db = ReturnType<typeof getDb>;

export function normalizeCrmPhone(phone: string | null | undefined): string {
  let digits = (phone ?? "").replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length > 11) {
    digits = digits.slice(2);
  }
  return digits;
}

/** Telefone do pedido normalizado (só dígitos, sem 55 do país). */
export function orderPhoneNormalizedSql(): SQL {
  return sql`CASE
    WHEN length(regexp_replace(coalesce(${schema.orders.customerPhone}, ''), '\\D', '', 'g')) > 11
      AND regexp_replace(coalesce(${schema.orders.customerPhone}, ''), '\\D', '', 'g') LIKE '55%'
    THEN substring(regexp_replace(coalesce(${schema.orders.customerPhone}, ''), '\\D', '', 'g') from 3)
    ELSE regexp_replace(coalesce(${schema.orders.customerPhone}, ''), '\\D', '', 'g')
  END`;
}

/** Atualiza ou cria perfil CRM após pedido entregue */
export async function upsertCustomerProfileFromOrder(
  db: Db,
  input: {
    tenantId: string;
    phone: string | null | undefined;
    name: string;
    totalAmount: number;
    deliveredAt: Date;
  },
): Promise<void> {
  const phone = normalizeCrmPhone(input.phone);
  if (phone.length < 10) return;

  const [existing] = await db
    .select()
    .from(schema.customerProfiles)
    .where(
      and(
        eq(schema.customerProfiles.tenantId, input.tenantId),
        eq(schema.customerProfiles.phone, phone),
      ),
    )
    .limit(1);

  if (existing) {
    await db
      .update(schema.customerProfiles)
      .set({
        name: input.name.trim() || existing.name,
        orderCount: existing.orderCount + 1,
        totalSpent: String(Number(existing.totalSpent) + input.totalAmount),
        lastOrderAt: input.deliveredAt,
        updatedAt: new Date(),
      })
      .where(eq(schema.customerProfiles.id, existing.id));
    return;
  }

  await db.insert(schema.customerProfiles).values({
    tenantId: input.tenantId,
    phone,
    name: input.name.trim() || null,
    orderCount: 1,
    totalSpent: String(input.totalAmount),
    lastOrderAt: input.deliveredAt,
  });
}

/** Reconstrói stats do perfil a partir de pedidos entregues */
export async function syncCustomerProfileStats(
  db: Db,
  tenantId: string,
  phone: string,
) {
  const digits = normalizeCrmPhone(phone);
  const delivered = await db
    .select({
      total: schema.orders.totalAmount,
      name: schema.orders.customerName,
      deliveredAt: schema.orders.deliveredAt,
    })
    .from(schema.orders)
    .where(
      and(
        eq(schema.orders.tenantId, tenantId),
        eq(schema.orders.status, "entregue"),
        sql`${orderPhoneNormalizedSql()} = ${digits}`,
      ),
    )
    .orderBy(desc(schema.orders.deliveredAt));

  if (delivered.length === 0) return null;

  const totalSpent = delivered.reduce((acc, o) => acc + Number(o.total), 0);
  const last = delivered[0];

  return {
    phone: digits,
    name: last.name,
    orderCount: delivered.length,
    totalSpent,
    lastOrderAt: last.deliveredAt?.toISOString() ?? null,
    avgTicket: totalSpent / delivered.length,
  };
}

type AggregatedCustomer = {
  phone: string;
  name: string | null;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: Date | null;
};

/**
 * Agrega pedidos com telefone e grava/atualiza customer_profiles.
 * Conta todos os pedidos (exceto cancelados) para o CRM refletir a base real.
 */
export async function rebuildCustomerProfilesFromOrders(
  db: Db,
  tenantId: string,
): Promise<{ upserted: number }> {
  const rows = await db
    .select({
      phone: schema.orders.customerPhone,
      name: schema.orders.customerName,
      total: schema.orders.totalAmount,
      placedAt: schema.orders.placedAt,
      status: schema.orders.status,
    })
    .from(schema.orders)
    .where(eq(schema.orders.tenantId, tenantId));

  const byPhone = new Map<string, AggregatedCustomer>();

  for (const row of rows) {
    if (row.status === "cancelado") continue;
    const phone = normalizeCrmPhone(row.phone);
    if (phone.length < 10) continue;

    const existing = byPhone.get(phone);
    const placedAt = row.placedAt;
    if (!existing) {
      byPhone.set(phone, {
        phone,
        name: row.name?.trim() || null,
        orderCount: 1,
        totalSpent: Number(row.total),
        lastOrderAt: placedAt,
      });
      continue;
    }

    existing.orderCount += 1;
    existing.totalSpent += Number(row.total);
    if (!existing.name && row.name?.trim()) existing.name = row.name.trim();
    if (placedAt && (!existing.lastOrderAt || placedAt > existing.lastOrderAt)) {
      existing.lastOrderAt = placedAt;
      if (row.name?.trim()) existing.name = row.name.trim();
    }
  }

  let upserted = 0;
  for (const agg of byPhone.values()) {
    const [existing] = await db
      .select({ id: schema.customerProfiles.id, notes: schema.customerProfiles.notes, tags: schema.customerProfiles.tags })
      .from(schema.customerProfiles)
      .where(
        and(
          eq(schema.customerProfiles.tenantId, tenantId),
          eq(schema.customerProfiles.phone, agg.phone),
        ),
      )
      .limit(1);

    if (existing) {
      await db
        .update(schema.customerProfiles)
        .set({
          name: agg.name,
          orderCount: agg.orderCount,
          totalSpent: String(agg.totalSpent),
          lastOrderAt: agg.lastOrderAt,
          updatedAt: new Date(),
        })
        .where(eq(schema.customerProfiles.id, existing.id));
    } else {
      await db.insert(schema.customerProfiles).values({
        tenantId,
        phone: agg.phone,
        name: agg.name,
        orderCount: agg.orderCount,
        totalSpent: String(agg.totalSpent),
        lastOrderAt: agg.lastOrderAt,
      });
    }
    upserted += 1;
  }

  return { upserted };
}

export type CustomerTopItem = {
  name: string;
  quantity: number;
  times_ordered: number;
};

/** Itens mais pedidos pelo cliente (preferência). */
export async function getCustomerTopItems(
  db: Db,
  tenantId: string,
  phone: string,
  limit = 8,
): Promise<CustomerTopItem[]> {
  const digits = normalizeCrmPhone(phone);
  if (digits.length < 10) return [];

  const lines = await db
    .select({
      name: schema.orderLineItems.name,
      quantity: schema.orderLineItems.quantity,
    })
    .from(schema.orderLineItems)
    .innerJoin(schema.orders, eq(schema.orderLineItems.orderId, schema.orders.id))
    .where(
      and(
        eq(schema.orders.tenantId, tenantId),
        sql`${orderPhoneNormalizedSql()} = ${digits}`,
        sql`${schema.orders.status} <> 'cancelado'`,
      ),
    );

  const map = new Map<string, { quantity: number; times: number }>();
  for (const line of lines) {
    const key = line.name.trim();
    if (!key) continue;
    const cur = map.get(key) ?? { quantity: 0, times: 0 };
    cur.quantity += line.quantity;
    cur.times += 1;
    map.set(key, cur);
  }

  return [...map.entries()]
    .map(([name, v]) => ({
      name,
      quantity: v.quantity,
      times_ordered: v.times,
    }))
    .sort((a, b) => b.quantity - a.quantity || b.times_ordered - a.times_ordered)
    .slice(0, limit);
}
