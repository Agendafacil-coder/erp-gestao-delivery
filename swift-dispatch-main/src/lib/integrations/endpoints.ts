/** Endpoints HTTP expostos pelo servidor — referência para configurar gateways externos */

export const WEBHOOK_ENDPOINTS = {
  payments: {
    webhook: {
      method: "POST" as const,
      path: "/api/payments/webhook",
      description:
        "Webhook do PSP ativo (Mercado Pago, Stripe ou Asaas). Defina PAYMENT_PROVIDER no .env.",
      env: ["PAYMENT_PROVIDER", "MERCADOPAGO_* | STRIPE_* | ASAAS_*"],
    },
    mercadopago: {
      method: "POST" as const,
      path: "/api/payments/webhook",
      description: "Mercado Pago — Pix/cartão.",
      env: ["PAYMENT_PROVIDER=mercadopago", "MERCADOPAGO_ACCESS_TOKEN"],
    },
    stripe: {
      method: "POST" as const,
      path: "/api/payments/webhook",
      description: "Stripe — Pix e cartão (BRL). Eventos payment_intent / checkout.session.",
      env: ["PAYMENT_PROVIDER=stripe", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
    },
    asaas: {
      method: "POST" as const,
      path: "/api/payments/webhook",
      description: "Asaas — Pix e cartão. Header asaas-access-token = ASAAS_WEBHOOK_TOKEN.",
      env: ["PAYMENT_PROVIDER=asaas", "ASAAS_API_KEY", "ASAAS_WEBHOOK_TOKEN"],
    },
    mockConfirm: {
      method: "POST" as const,
      path: "/api/payments/confirm-mock",
      description: "Simula pagamento aprovado em desenvolvimento (body: orderId, token).",
      body: { orderId: "uuid", token: "tracking-token" },
    },
  },
  whatsapp: {
    evolution: {
      description: "Disparo outbound via Evolution API (variáveis WHATSAPP_* no .env).",
      env: ["WHATSAPP_API_URL", "WHATSAPP_API_KEY", "WHATSAPP_INSTANCE"],
    },
  },
  ifood: {
    orders: {
      method: "POST" as const,
      path: "/api/integrations/ifood/webhook",
      description: "Pedidos e status iFood. Header x-ifood-merchant-id ou query ?merchantId=.",
      headers: {
        "x-ifood-signature": "HMAC SHA256 do body (quando webhook_secret configurado)",
        "x-ifood-merchant-id": "ID do merchant no iFood",
      },
    },
  },
  ops: {
    sse: {
      method: "GET" as const,
      path: "/api/ops/stream",
      description: "Stream SSE da central operacional (requer sessão autenticada).",
    },
  },
} as const;

export function publicWebhookBaseUrl(): string {
  return (
    process.env.PUBLIC_APP_URL ??
    process.env.VITE_APP_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export function webhookUrl(path: string): string {
  return `${publicWebhookBaseUrl()}${path}`;
}
