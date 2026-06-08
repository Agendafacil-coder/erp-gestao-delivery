import { MockPaymentProvider } from "./mockProvider";
import { MercadoPagoProvider } from "./mercadopagoProvider";
import type { PaymentProvider } from "./types";

const providers: Record<string, PaymentProvider> = {
  mock: new MockPaymentProvider(),
  mercadopago: new MercadoPagoProvider(),
};

export function getPaymentProvider(): PaymentProvider {
  const isProd = process.env.NODE_ENV === "production";
  const name = process.env.PAYMENT_PROVIDER ?? (isProd ? "mercadopago" : "mock");
  const provider = providers[name];
  if (!provider) {
    if (isProd) {
      throw new Error(`PAYMENT_PROVIDER inválido: ${name}`);
    }
    return providers.mock;
  }
  return provider;
}

export * from "./types";
