import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { verifyStripeWebhookSignature } from "./stripeSignature";

describe("verifyStripeWebhookSignature", () => {
  const prevSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const prevNodeEnv = process.env.NODE_ENV;

  before(() => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";
    process.env.NODE_ENV = "test";
  });

  after(() => {
    if (prevSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = prevSecret;
    process.env.NODE_ENV = prevNodeEnv;
  });

  it("aceita assinatura HMAC válida", () => {
    const rawBody = '{"id":"evt_1"}';
    const ts = "1710000000";
    const signed = `${ts}.${rawBody}`;
    const v1 = createHmac("sha256", "whsec_test_secret").update(signed, "utf8").digest("hex");

    const ok = verifyStripeWebhookSignature({
      signature: `t=${ts},v1=${v1}`,
      rawBody,
    });
    assert.equal(ok, true);
  });

  it("rejeita assinatura inválida", () => {
    const ok = verifyStripeWebhookSignature({
      signature: "t=1,v1=deadbeef",
      rawBody: "{}",
    });
    assert.equal(ok, false);
  });
});
