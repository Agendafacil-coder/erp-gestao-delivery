import type { PaymentMethodGroup } from "./types";

/** Normaliza formas de pagamento do pedido para grupos do relatório financeiro */
export function normalizePaymentMethod(raw?: string | null): PaymentMethodGroup {
  const m = (raw ?? "").toLowerCase().trim();
  if (!m) return "outros";
  if (m.includes("pix")) return "pix";
  if (
    m.includes("dinheiro") ||
    m.includes("cash") ||
    m === "on_delivery" ||
    m.includes("entrega")
  ) {
    return "dinheiro";
  }
  if (
    m.includes("card") ||
    m.includes("cart") ||
    m.includes("credito") ||
    m.includes("crédito") ||
    m.includes("debito") ||
    m.includes("débito")
  ) {
    return "cartao";
  }
  if (
    m.includes("online") ||
    m.includes("stripe") ||
    m.includes("mercadopago") ||
    m.includes("asaas") ||
    m.includes("mock")
  ) {
    return "online";
  }
  return "outros";
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodGroup, string> = {
  pix: "PIX",
  dinheiro: "Dinheiro",
  cartao: "Cartão",
  online: "Online",
  outros: "Outros",
};

export function emptyPaymentBreakdown(): Record<PaymentMethodGroup, number> {
  return { pix: 0, dinheiro: 0, cartao: 0, online: 0, outros: 0 };
}
