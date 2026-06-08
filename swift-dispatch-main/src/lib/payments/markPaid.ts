import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";

export async function markPaymentPaid(
  externalId: string,
  tenantId?: string,
): Promise<boolean> {
  const db = getDb();

  const [row] = await db
    .select({
      paymentId: schema.payments.id,
      orderId: schema.payments.orderId,
      orderTenantId: schema.orders.tenantId,
    })
    .from(schema.payments)
    .innerJoin(schema.orders, eq(schema.payments.orderId, schema.orders.id))
    .where(eq(schema.payments.externalId, externalId))
    .limit(1);

  if (!row) return false;
  if (tenantId && row.orderTenantId !== tenantId) return false;

  await db
    .update(schema.payments)
    .set({ status: "pago", paidAt: new Date(), updatedAt: new Date() })
    .where(eq(schema.payments.id, row.paymentId));

  await db
    .update(schema.orders)
    .set({ paymentStatus: "pago", updatedAt: new Date() })
    .where(eq(schema.orders.id, row.orderId));

  return true;
}
