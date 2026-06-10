export type PaymentProviderName = "mock" | "mercadopago" | "stripe" | "asaas";

const KNOWN = new Set<string>(["mock", "mercadopago", "stripe", "asaas"]);

export function toPaymentProviderEnum(name: string): PaymentProviderName {
  if (KNOWN.has(name)) return name as PaymentProviderName;
  return "mock";
}
