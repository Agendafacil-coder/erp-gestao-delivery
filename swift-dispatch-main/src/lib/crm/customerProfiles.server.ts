import { and, desc, eq, sql } from "drizzle-orm";
import type { getDb } from "@/db/connection.server";
import { schema } from "@/db";
import { normalizeOrderStatus } from "@/lib/ops/orderWorkflow";

type Db = ReturnType<typeof getDb>;

function normalizePhone(phone: string | null | undefined): string {
  return (phone ?? "").replace(/\D/g, "");
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
  const phone = normalizePhone(input.phone);
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
  const digits = normalizePhone(phone);
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
        sql`regexp_replace(coalesce(${schema.orders.customerPhone}, ''), '\\D', '', 'g') = ${digits}`,
      ),
    )
    .orderBy(desc(schema.orders.deliveredAt));

  if (delivered.length === 0) return null;

  const totalSpent = delivered.reduce((acc, o) => acc + Number(o.totalAmount), 0);
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

import type { CustomerSegment } from "@/lib/crm/segments";
