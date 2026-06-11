import type { CheckoutResult, PaymentMethod, PaymentProvider, PaymentWebhookMeta } from "./types";
import { verifyMercadoPagoWebhookSignature } from "./mercadopagoSignature";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/connection.server";
import { schema } from "@/db";

/** Integração Mercado Pago — Pix real com MERCADOPAGO_ACCESS_TOKEN */
export class MercadoPagoProvider implements PaymentProvider {
  readonly name = "mercadopago";

  private get token(): string {
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
    if (!token) throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurado");
    return token;
  }

  async createCheckout(input: {
    orderId: string;
    tenantId: string;
    amount: number;
    method: PaymentMethod;
    customerEmail?: string;
  }): Promise<CheckoutResult> {
    if (input.method === "on_delivery") {
      throw new Error("Pagamento na entrega não usa checkout online");
    }

    if (input.method === "pix") {
      return this.createPixPayment(input);
    }

    return this.createCardPreference(input);
  }

  private async createPixPayment(input: {
    orderId: string;
    amount: number;
    customerEmail?: string;
  }): Promise<CheckoutResult> {
    const res = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": `pix-${input.orderId}-${Date.now()}`,
      },
      body: JSON.stringify({
        transaction_amount: input.amount,
        description: `Pedido ${input.orderId.slice(0, 8)}`,
        payment_method_id: "pix",
        payer: { email: input.customerEmail ?? "cliente@deliveryos.demo" },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Mercado Pago: ${errText.slice(0, 200)}`);
    }

    const body = (await res.json()) as {
      id: number;
      status: string;
      point_of_interaction?: {
        transaction_data?: { qr_code?: string; qr_code_base64?: string };
      };
    };

    return {
      payment_id: String(body.id),
      external_id: String(body.id),
      status: body.status === "approved" ? "pago" : "pendente",
      pix_copy_paste: body.point_of_interaction?.transaction_data?.qr_code,
      pix_qr_base64: body.point_of_interaction?.transaction_data?.qr_code_base64,
    };
  }

  private async createCardPreference(input: {
    orderId: string;
    amount: number;
    customerEmail?: string;
  }): Promise<CheckoutResult> {
    const baseUrl =
      process.env.PUBLIC_APP_URL ?? process.env.VITE_APP_URL ?? "http://localhost:3000";

    const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [
          {
            title: `Pedido ${input.orderId.slice(0, 8)}`,
            quantity: 1,
            unit_price: input.amount,
            currency_id: "BRL",
          },
        ],
        payer: { email: input.customerEmail ?? "cliente@deliveryos.demo" },
        external_reference: input.orderId,
        back_urls: {
          success: `${baseUrl.replace(/\/$/, "")}/rastreio/${input.orderId}`,
          failure: `${baseUrl.replace(/\/$/, "")}/rastreio/${input.orderId}`,
          pending: `${baseUrl.replace(/\/$/, "")}/rastreio/${input.orderId}`,
        },
        auto_return: "approved",
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Mercado Pago: ${errText.slice(0, 200)}`);
    }

    const body = (await res.json()) as { id: string; init_point?: string };
    return {
      payment_id: body.id,
      external_id: body.id,
      status: "pendente",
      checkout_url: body.init_point,
    };
  }

  async handleWebhook(
    payload: unknown,
    meta?: PaymentWebhookMeta,
  ): Promise<{
    externalId: string;
    status: "pago" | "falhou";
    tenantId?: string;
  } | null> {
    const body = payload as {
      type?: string;
      data?: { id?: string | number };
    };

    const paymentId =
      body.type === "payment" && body.data?.id != null
        ? String(body.data.id)
        : (payload as { external_id?: string }).external_id;

    if (!paymentId) return null;

    if (
      !verifyMercadoPagoWebhookSignature({
        signature: meta?.signature,
        requestId: meta?.requestId,
        dataId: meta?.dataId ?? paymentId,
      })
    ) {
      return null;
    }

    try {
      const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${this.token}` },
      });
      if (!res.ok) return null;

      const payment = (await res.json()) as {
        id: number;
        status: string;
        external_reference?: string;
      };

      let tenantId: string | undefined;
      if (payment.external_reference) {
        const db = getDb();
        const [order] = await db
          .select({ tenantId: schema.orders.tenantId })
          .from(schema.orders)
          .where(eq(schema.orders.id, payment.external_reference))
          .limit(1);
        tenantId = order?.tenantId;
      }

      if (payment.status === "approved") {
        return { externalId: String(payment.id), status: "pago", tenantId };
      }
      if (payment.status === "rejected" || payment.status === "cancelled") {
        return { externalId: String(payment.id), status: "falhou", tenantId };
      }
    } catch {
      return null;
    }

    return null;
  }
}
