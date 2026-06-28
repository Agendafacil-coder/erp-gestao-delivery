export type PaymentMethod = "pix" | "card" | "on_delivery";

export type CheckoutResult = {
  payment_id: string;
  external_id: string;
  checkout_url?: string;
  pix_copy_paste?: string;
  pix_qr_base64?: string;
  status: "pendente" | "pago" | "falhou";
};

export type PaymentWebhookMeta = {
  signature?: string;
  requestId?: string;
  dataId?: string;
  /** Corpo bruto — obrigatório para validar stripe-signature */
  rawBody?: string;
  /** Header asaas-access-token */
  webhookToken?: string;
};

export type PaymentWebhookResult = {
  externalId: string;
  status: "pago" | "falhou";
  tenantId?: string;
};

export interface PaymentProvider {
  readonly name: string;
  createCheckout(input: {
    orderId: string;
    tenantId: string;
    trackingToken: string;
    amount: number;
    method: PaymentMethod;
    customerEmail?: string;
  }): Promise<CheckoutResult>;
  handleWebhook(
    payload: unknown,
    meta?: PaymentWebhookMeta,
  ): Promise<PaymentWebhookResult | null>;
}
