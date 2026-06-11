import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/connection.server";
import { schema } from "@/db";
import { assertCanAccessFinance } from "@/lib/rbac";
import { buildPaymentHubStatus, type PaymentHubStatus } from "@/lib/payments/paymentEnvStatus";
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

export type RecentPaymentRow = {
  id: string;
  order_id: string;
  order_code: string | null;
  provider: string;
  method: string | null;
  amount: number;
  status: string;
  created_at: string;
  paid_at: string | null;
};

export const getPaymentHubStatusFn = createServerFn({ method: "GET" })
  .inputValidator((data: { tenantId: string }) => data)
  .handler(async ({ data }): Promise<PaymentHubStatus> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanAccessFinance(user, data.tenantId);
    return buildPaymentHubStatus();
  });

export const listRecentPaymentsFn = createServerFn({ method: "GET" })
  .inputValidator((data: { tenantId: string; limit?: number }) => data)
  .handler(async ({ data }): Promise<RecentPaymentRow[]> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanAccessFinance(user, data.tenantId);

    const db = getDb();
    const limit = Math.min(data.limit ?? 30, 80);

    const rows = await db
      .select({
        id: schema.payments.id,
        orderId: schema.payments.orderId,
        orderCode: schema.orders.code,
        provider: schema.payments.provider,
        method: schema.payments.method,
        amount: schema.payments.amount,
        status: schema.payments.status,
        createdAt: schema.payments.createdAt,
        paidAt: schema.payments.paidAt,
      })
      .from(schema.payments)
      .innerJoin(schema.orders, eq(schema.payments.orderId, schema.orders.id))
      .where(eq(schema.payments.tenantId, data.tenantId))
      .orderBy(desc(schema.payments.createdAt))
      .limit(limit);

    return rows.map((r) => ({
      id: r.id,
      order_id: r.orderId,
      order_code: r.orderCode,
      provider: r.provider,
      method: r.method,
      amount: Number(r.amount),
      status: r.status,
      created_at: r.createdAt.toISOString(),
      paid_at: r.paidAt?.toISOString() ?? null,
    }));
  });
