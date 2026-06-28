import { eq } from "drizzle-orm";
import { getDb } from "@/db/connection.server";
import { schema } from "@/db";
import type {
  CheckoutResult,
  PaymentMethod,
  PaymentProvider,
  PaymentWebhookMeta,
  PaymentWebhookResult,
} from "./types";
import { verifyStripeWebhookSignature } from "./stripeSignature";
import { publicTrackingReturnUrl } from "@/lib/ops/trackingUrl";

function stripeAuthHeader(): string {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error("STRIPE_SECRET_KEY não configurado");
  return `Bearer ${key}`;
}

function appBaseUrl(): string {
  return (
    process.env.PUBLIC_APP_URL ?? process.env.VITE_APP_URL ?? "http://localhost:3000"
  ).replace(/\/$/, "");
}

async function stripeFormPost<T>(path: string, fields: Record<string, string>): Promise<T> {
  const body = new URLSearchParams(fields);
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: "POST",
    headers: {
      Authorization: stripeAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Stripe: ${errText.slice(0, 240)}`);
  }
  return res.json() as Promise<T>;
}

/** Stripe Checkout + PaymentIntent Pix (BRL). */
export class StripePaymentProvider implements PaymentProvider {
  readonly name = "stripe";

  async createCheckout(input: {
    orderId: string;
    tenantId: string;
    trackingToken: string;
    amount: number;
    method: PaymentMethod;
    customerEmail?: string;
  }): Promise<CheckoutResult> {
    if (input.method === "on_delivery") {
      throw new Error("Pagamento na entrega não usa checkout online");
    }

    const amountCents = Math.round(input.amount * 100);
    const base = appBaseUrl();

    if (input.method === "pix") {
      const intent = await stripeFormPost<{
        id: string;
        status: string;
        next_action?: {
          pix_display_qr_code?: {
            data?: string;
            image_url_png?: string;
          };
        };
      }>("/payment_intents", {
        amount: String(amountCents),
        currency: "brl",
        "payment_method_types[0]": "pix",
        "metadata[order_id]": input.orderId,
        "metadata[tenant_id]": input.tenantId,
        ...(input.customerEmail ? { receipt_email: input.customerEmail } : {}),
      });

      const pix = intent.next_action?.pix_display_qr_code;
      return {
        payment_id: intent.id,
        external_id: intent.id,
        status: intent.status === "succeeded" ? "pago" : "pendente",
        pix_copy_paste: pix?.data,
        checkout_url: pix?.image_url_png,
      };
    }

    const session = await stripeFormPost<{
      id: string;
      url?: string;
      payment_status?: string;
    }>("/checkout/sessions", {
      mode: "payment",
      success_url: publicTrackingReturnUrl(input.orderId, input.trackingToken, { paid: "1" }, base),
      cancel_url: publicTrackingReturnUrl(input.orderId, input.trackingToken, { cancelled: "1" }, base),
      "line_items[0][price_data][currency]": "brl",
      "line_items[0][price_data][product_data][name]": `Pedido ${input.orderId.slice(0, 8)}`,
      "line_items[0][price_data][unit_amount]": String(amountCents),
      "line_items[0][quantity]": "1",
      "payment_method_types[0]": "card",
      "metadata[order_id]": input.orderId,
      "metadata[tenant_id]": input.tenantId,
      ...(input.customerEmail ? { customer_email: input.customerEmail } : {}),
    });

    return {
      payment_id: session.id,
      external_id: session.id,
      status: session.payment_status === "paid" ? "pago" : "pendente",
      checkout_url: session.url,
    };
  }

  async handleWebhook(
    payload: unknown,
    meta?: PaymentWebhookMeta,
  ): Promise<PaymentWebhookResult | null> {
    if (!verifyStripeWebhookSignature(meta ?? {})) return null;

    const event = payload as {
      type?: string;
      data?: {
        object?: {
          id?: string;
          status?: string;
          metadata?: { order_id?: string; tenant_id?: string };
        };
      };
    };

    const obj = event.data?.object;
    if (!obj?.id) return null;

    const successTypes = new Set([
      "payment_intent.succeeded",
      "checkout.session.completed",
    ]);
    const failTypes = new Set(["payment_intent.payment_failed"]);

    if (!successTypes.has(event.type ?? "") && !failTypes.has(event.type ?? "")) {
      return null;
    }

    let tenantId = obj.metadata?.tenant_id;
    const orderId = obj.metadata?.order_id;

    if (!tenantId && orderId) {
      const db = getDb();
      const [order] = await db
        .select({ tenantId: schema.orders.tenantId })
        .from(schema.orders)
        .where(eq(schema.orders.id, orderId))
        .limit(1);
      tenantId = order?.tenantId;
    }

    if (successTypes.has(event.type ?? "")) {
      return { externalId: obj.id, status: "pago", tenantId };
    }
    return { externalId: obj.id, status: "falhou", tenantId };
  }
}
