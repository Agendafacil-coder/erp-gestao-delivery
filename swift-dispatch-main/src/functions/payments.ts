import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/connection.server";
import { schema } from "@/db";
import { getPaymentProvider } from "@/lib/payments";
import { toPaymentProviderEnum } from "@/lib/payments/providerName";

const ONLINE_METHODS = new Set(["pix", "card"]);

export const createCheckoutFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      orderId: string;
      tenantSlug: string;
      trackingToken: string;
      method: "pix" | "card" | "on_delivery";
      amount?: number;
    }) => data,
  )
  .handler(async ({ data }) => {
    if (!ONLINE_METHODS.has(data.method)) {
      throw new Error("Checkout online disponível apenas para Pix ou cartão.");
    }

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
      .where(
        and(
          eq(schema.orders.id, data.orderId),
          eq(schema.orders.tenantId, tenant.id),
          eq(schema.orders.trackingToken, data.trackingToken),
        ),
      )
      .limit(1);

    if (!order) throw new Error("Pedido não encontrado ou link inválido");

    if (order.paymentMethod === "on_delivery") {
      throw new Error("Este pedido será pago na entrega.");
    }

    if (order.paymentStatus === "pago") {
      throw new Error("Pedido já está pago.");
    }

    const amount = Number(order.totalAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Valor do pedido inválido.");
    }

    if (data.amount != null && Math.abs(data.amount - amount) > 0.01) {
      throw new Error("Valor informado não confere com o pedido.");
    }

    const [existingPayment] = await db
      .select()
      .from(schema.payments)
      .where(
        and(eq(schema.payments.orderId, order.id), eq(schema.payments.status, "pendente")),
      )
      .limit(1);

    if (existingPayment?.externalId) {
      return {
        payment_id: existingPayment.id,
        external_id: existingPayment.externalId,
        status: existingPayment.status,
        pix_copy_paste: existingPayment.pixCopyPaste ?? undefined,
        pix_qr_base64: existingPayment.pixQrBase64 ?? undefined,
        checkout_url: existingPayment.checkoutUrl ?? undefined,
        provider: existingPayment.provider,
      };
    }

    const provider = getPaymentProvider();
    const checkout = await provider.createCheckout({
      orderId: order.id,
      tenantId: tenant.id,
      amount,
      method: data.method,
    });

    const providerName = toPaymentProviderEnum(provider.name);

    const [payment] = await db
      .insert(schema.payments)
      .values({
        orderId: order.id,
        tenantId: tenant.id,
        provider: providerName,
        externalId: checkout.external_id,
        amount: String(amount.toFixed(2)),
        status: checkout.status === "pago" ? "pago" : "pendente",
        method: data.method,
        pixCopyPaste: checkout.pix_copy_paste ?? null,
        pixQrBase64: checkout.pix_qr_base64 ?? null,
        checkoutUrl: checkout.checkout_url ?? null,
      })
      .returning();

    return {
      payment_id: payment.id,
      external_id: checkout.external_id,
      pix_copy_paste: checkout.pix_copy_paste,
      pix_qr_base64: checkout.pix_qr_base64,
      checkout_url: checkout.checkout_url,
      status: checkout.status,
      provider: provider.name,
    };
  });
