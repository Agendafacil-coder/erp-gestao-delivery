import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";

export async function markPaymentPaid(externalId: string): Promise<boolean> {
  const db = getDb();
  const [payment] = await db
    .select()
    .from(schema.payments)
    .where(eq(schema.payments.externalId, externalId))
    .limit(1);

  if (!payment) return false;

  await db
    .update(schema.payments)
    .set({ status: "pago", paidAt: new Date(), updatedAt: new Date() })
    .where(eq(schema.payments.id, payment.id));

  await db
    .update(schema.orders)
    .set({ paymentStatus: "pago", updatedAt: new Date() })
    .where(eq(schema.orders.id, payment.orderId));

  return true;
}
