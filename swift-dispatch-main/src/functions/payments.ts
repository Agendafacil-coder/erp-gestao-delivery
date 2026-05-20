import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getPaymentProvider } from "@/lib/payments";

export const createCheckoutFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      orderId: string;
      tenantSlug: string;
      amount: number;
      method: "pix" | "card" | "on_delivery";
    }) => data,
  )
  .handler(async ({ data }) => {
    const db = getDb();
    const [tenant] = await db
      .select()
      .from(schema.tenants)
      .where(eq(schema.tenants.slug, data.tenantSlug))
      .limit(1);

    if (!tenant) throw new Error("Restaurante não encontrado");

    const [order] = await db
      .select()
      .from(schema.orders)
      .where(and(eq(schema.orders.id, data.orderId), eq(schema.orders.tenantId, tenant.id)))
      .limit(1);

    if (!order) throw new Error("Pedido não encontrado");

    const provider = getPaymentProvider();
    const checkout = await provider.createCheckout({
      orderId: order.id,
      tenantId: tenant.id,
      amount: data.amount,
      method: data.method,
    });

    const [payment] = await db
      .insert(schema.payments)
      .values({
        orderId: order.id,
        tenantId: tenant.id,
        provider: "mock",
        externalId: checkout.external_id,
        amount: String(data.amount),
        status: "pendente",
        method: data.method,
      })
      .returning();

    return {
      payment_id: payment.id,
      external_id: checkout.external_id,
      pix_copy_paste: checkout.pix_copy_paste,
      checkout_url: checkout.checkout_url,
      status: checkout.status,
    };
  });
