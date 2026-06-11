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

function asaasBaseUrl(): string {
  return (
    process.env.ASAAS_API_URL?.trim() ??
    (process.env.ASAAS_SANDBOX === "true"
      ? "https://api-sandbox.asaas.com/v3"
      : "https://api.asaas.com/v3")
  ).replace(/\/$/, "");
}

function asaasApiKey(): string {
  const key = process.env.ASAAS_API_KEY?.trim();
  if (!key) throw new Error("ASAAS_API_KEY não configurado");
  return key;
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function verifyAsaasWebhook(meta?: PaymentWebhookMeta): boolean {
  const expected = process.env.ASAAS_WEBHOOK_TOKEN?.trim();
  if (!expected) {
    return process.env.NODE_ENV !== "production";
  }
  return meta?.webhookToken === expected;
}

async function asaasJson<T>(
  path: string,
  init?: RequestInit & { method?: string },
): Promise<T> {
  const res = await fetch(`${asaasBaseUrl()}${path}`, {
    ...init,
    headers: {
      access_token: asaasApiKey(),
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Asaas: ${errText.slice(0, 240)}`);
  }
  return res.json() as Promise<T>;
}

async function ensureAsaasCustomer(input: {
  name: string;
  email?: string;
  phone?: string;
}): Promise<string> {
  const list = await asaasJson<{ data?: Array<{ id: string }> }>(
    `/customers?email=${encodeURIComponent(input.email ?? "cliente@deliveryos.demo")}&limit=1`,
    { method: "GET" },
  );
  if (list.data?.[0]?.id) return list.data[0].id;

  const created = await asaasJson<{ id: string }>("/customers", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      email: input.email ?? "cliente@deliveryos.demo",
      mobilePhone: input.phone,
    }),
  });
  return created.id;
}

/** Asaas — Pix e cartão via cobrança / link de pagamento. */
export class AsaasPaymentProvider implements PaymentProvider {
  readonly name = "asaas";

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

    const customerId = await ensureAsaasCustomer({
      name: `Cliente ${input.orderId.slice(0, 8)}`,
      email: input.customerEmail,
    });

    const billingType = input.method === "pix" ? "PIX" : "CREDIT_CARD";

    const payment = await asaasJson<{
      id: string;
      status: string;
      invoiceUrl?: string;
    }>("/payments", {
      method: "POST",
      body: JSON.stringify({
        customer: customerId,
        billingType,
        value: Number(input.amount.toFixed(2)),
        dueDate: todayIsoDate(),
        description: `Pedido ${input.orderId.slice(0, 8)}`,
        externalReference: input.orderId,
      }),
    });

    if (input.method === "pix") {
      const qr = await asaasJson<{
        encodedImage?: string;
        payload?: string;
      }>(`/payments/${payment.id}/pixQrCode`, { method: "GET" });

      return {
        payment_id: payment.id,
        external_id: payment.id,
        status: payment.status === "RECEIVED" ? "pago" : "pendente",
        pix_copy_paste: qr.payload,
        pix_qr_base64: qr.encodedImage,
      };
    }

    return {
      payment_id: payment.id,
      external_id: payment.id,
      status: "pendente",
      checkout_url: payment.invoiceUrl,
    };
  }

  async handleWebhook(
    payload: unknown,
    meta?: PaymentWebhookMeta,
  ): Promise<PaymentWebhookResult | null> {
    if (!verifyAsaasWebhook(meta)) return null;

    const body = payload as {
      event?: string;
      payment?: {
        id?: string;
        status?: string;
        externalReference?: string;
      };
    };

    const payment = body.payment;
    if (!payment?.id) return null;

    const paidEvents = new Set(["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED"]);
    const failEvents = new Set(["PAYMENT_OVERDUE", "PAYMENT_DELETED", "PAYMENT_REFUNDED"]);

    let tenantId: string | undefined;
    if (payment.externalReference) {
      const db = getDb();
      const [order] = await db
        .select({ tenantId: schema.orders.tenantId })
        .from(schema.orders)
        .where(eq(schema.orders.id, payment.externalReference))
        .limit(1);
      tenantId = order?.tenantId;
    }

    if (paidEvents.has(body.event ?? "") || payment.status === "RECEIVED") {
      return { externalId: payment.id, status: "pago", tenantId };
    }
    if (failEvents.has(body.event ?? "")) {
      return { externalId: payment.id, status: "falhou", tenantId };
    }

    return null;
  }
}
