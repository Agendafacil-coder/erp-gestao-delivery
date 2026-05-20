import { MockPaymentProvider } from "./mockProvider";
import type { PaymentProvider } from "./types";

const providers: Record<string, PaymentProvider> = {
  mock: new MockPaymentProvider(),
};

export function getPaymentProvider(): PaymentProvider {
  const name = process.env.PAYMENT_PROVIDER ?? "mock";
  return providers[name] ?? providers.mock;
}

export * from "./types";
