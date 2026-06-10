import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { toPaymentProviderEnum } from "./providerName";

describe("toPaymentProviderEnum", () => {
  it("mapeia provedores conhecidos", () => {
    assert.equal(toPaymentProviderEnum("stripe"), "stripe");
    assert.equal(toPaymentProviderEnum("asaas"), "asaas");
    assert.equal(toPaymentProviderEnum("mercadopago"), "mercadopago");
  });

  it("cai em mock para nome desconhecido", () => {
    assert.equal(toPaymentProviderEnum("paypal"), "mock");
  });
});
