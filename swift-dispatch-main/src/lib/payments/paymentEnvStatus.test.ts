import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { buildPaymentHubStatus } from "./paymentEnvStatus";

describe("buildPaymentHubStatus", () => {
  const snapshot = { ...process.env };

  after(() => {
    process.env = snapshot;
  });

  it("retorna mock pronto em desenvolvimento", () => {
    process.env.NODE_ENV = "development";
    delete process.env.PAYMENT_PROVIDER;
    const hub = buildPaymentHubStatus();
    assert.equal(hub.provider, "mock");
    assert.equal(hub.ready, true);
    assert.ok(hub.webhookUrl.includes("/api/payments/webhook"));
  });

  it("detecta stripe configurado", () => {
    process.env.PAYMENT_PROVIDER = "stripe";
    process.env.STRIPE_SECRET_KEY = "sk_test_abc";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_xyz";
    const hub = buildPaymentHubStatus();
    assert.equal(hub.provider, "stripe");
    assert.equal(hub.ready, true);
    assert.equal(hub.credentials.stripe.secretKeySet, true);
    assert.equal(hub.credentials.stripe.webhookSecretSet, true);
  });
});
