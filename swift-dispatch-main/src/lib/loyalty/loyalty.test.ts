import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculatePointsEarned,
  calculateRedeemDiscount,
  normalizeLoyaltyPhone,
} from "@/lib/loyalty/loyalty";

describe("normalizeLoyaltyPhone", () => {
  it("aceita celular com DDD", () => {
    assert.equal(normalizeLoyaltyPhone("(11) 99999-9999"), "11999999999");
  });

  it("remove prefixo 55", () => {
    assert.equal(normalizeLoyaltyPhone("+55 11 98888-7777"), "11988887777");
  });

  it("rejeita telefone curto", () => {
    assert.equal(normalizeLoyaltyPhone("9999"), null);
  });
});

describe("calculateRedeemDiscount", () => {
  it("aplica bloco de 50 coins = R$ 5", () => {
    const result = calculateRedeemDiscount(120, 40, true);
    assert.equal(result.pointsToRedeem, 50);
    assert.equal(result.discount, 5);
  });

  it("respeita teto de 20% do pedido", () => {
    const result = calculateRedeemDiscount(500, 30, true);
    assert.equal(result.discount, 5);
    assert.equal(result.pointsToRedeem, 50);
  });

  it("não resgata sem saldo mínimo", () => {
    const result = calculateRedeemDiscount(30, 50, true);
    assert.equal(result.discount, 0);
  });
});

describe("calculatePointsEarned", () => {
  it("1 ponto por real pago", () => {
    assert.equal(calculatePointsEarned(47.9), 47);
  });
});
