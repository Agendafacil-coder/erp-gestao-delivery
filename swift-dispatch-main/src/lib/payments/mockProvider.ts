import type { CheckoutResult, PaymentProvider } from "./types";

/** Provedor mock para desenvolvimento até escolher PSP real */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock";

  async createCheckout(input: {
    orderId: string;
    amount: number;
    method: string;
  }): Promise<CheckoutResult> {
    const externalId = `mock_${input.orderId}_${Date.now()}`;
    return {
      payment_id: externalId,
      external_id: externalId,
      status: "pendente",
      pix_copy_paste:
        input.method === "pix"
          ? `00020126MOCK${input.amount.toFixed(2)}ORDER${input.orderId.slice(0, 8)}`
          : undefined,
      checkout_url:
        input.method === "card" ? `#mock-pay-${input.orderId}` : undefined,
    };
  }

  async handleWebhook(payload: unknown): Promise<{
    externalId: string;
    status: "pago" | "falhou";
  } | null> {
    const body = payload as { external_id?: string; status?: string };
    if (!body?.external_id) return null;
    return {
      externalId: body.external_id,
      status: body.status === "paid" || body.status === "pago" ? "pago" : "falhou",
    };
  }
}
