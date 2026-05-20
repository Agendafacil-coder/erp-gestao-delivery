import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getPaymentProvider } from "@/lib/payments";
import { markPaymentPaid } from "@/lib/payments/markPaid";

export async function handlePaymentWebhookRequest(
  request: Request,
): Promise<Response | null> {
  const url = new URL(request.url);

  if (url.pathname === "/api/payments/confirm-mock" && request.method === "POST") {
    let body: { orderId?: string; token?: string };
    try {
      body = await request.json();
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }
    if (!body.orderId || !body.token) {
      return new Response("orderId e token obrigatórios", { status: 400 });
    }

    const db = getDb();
    const [order] = await db
      .select()
      .from(schema.orders)
      .where(
        and(eq(schema.orders.id, body.orderId), eq(schema.orders.trackingToken, body.token)),
      )
      .limit(1);

    if (!order) return new Response("Pedido não encontrado", { status: 404 });

    const [payment] = await db
      .select()
      .from(schema.payments)
      .where(eq(schema.payments.orderId, order.id))
      .limit(1);

    if (payment?.externalId) {
      await markPaymentPaid(payment.externalId);
    } else {
      await db
        .update(schema.orders)
        .set({ paymentStatus: "pago", updatedAt: new Date() })
        .where(eq(schema.orders.id, order.id));
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  if (url.pathname !== "/api/payments/webhook") return null;

  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const signature = request.headers.get("x-payment-signature") ?? undefined;
  const provider = getPaymentProvider();
  const result = await provider.handleWebhook(payload, signature);

  if (!result) {
    return new Response(JSON.stringify({ ok: false }), { status: 400 });
  }

  if (result.status === "pago") {
    await markPaymentPaid(result.externalId);
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
}
