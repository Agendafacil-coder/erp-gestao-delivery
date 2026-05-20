export type PaymentMethod = "pix" | "card" | "on_delivery";

export type CheckoutResult = {
  payment_id: string;
  external_id: string;
  checkout_url?: string;
  pix_copy_paste?: string;
  status: "pendente" | "pago" | "falhou";
};

export interface PaymentProvider {
  readonly name: string;
  createCheckout(input: {
    orderId: string;
    tenantId: string;
    amount: number;
    method: PaymentMethod;
    customerEmail?: string;
  }): Promise<CheckoutResult>;
  handleWebhook(payload: unknown, signature?: string): Promise<{
    externalId: string;
    status: "pago" | "falhou";
  } | null>;
}
