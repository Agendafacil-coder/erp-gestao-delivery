import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeCmvFromLineItems, estimateCmvFromRevenue } from "./cmvPlaceholder";

describe("estimateCmvFromRevenue", () => {
  it("aplica margem padrão de 35%", () => {
    assert.equal(estimateCmvFromRevenue(100), 65);
  });

  it("retorna 0 para receita zero", () => {
    assert.equal(estimateCmvFromRevenue(0), 0);
  });
});

describe("computeCmvFromLineItems", () => {
  it("soma custos do cardápio quando disponíveis", () => {
    const costs = new Map([
      ["a", 10],
      ["b", 5],
    ]);
    const result = computeCmvFromLineItems(
      [
        { menu_item_id: "a", quantity: 2 },
        { menu_item_id: "b", quantity: 1 },
      ],
      costs,
      100,
    );
    assert.equal(result.source, "menu");
    assert.equal(result.cmvTotal, 25);
    assert.equal(result.itemsWithCost, 3);
    assert.equal(result.itemsWithoutCost, 0);
  });

  it("usa estimativa quando nenhum item tem custo", () => {
    const result = computeCmvFromLineItems(
      [{ menu_item_id: "x", quantity: 1 }],
      new Map(),
      200,
    );
    assert.equal(result.source, "estimate");
    assert.equal(result.cmvTotal, 130);
    assert.equal(result.itemsWithCost, 0);
    assert.equal(result.itemsWithoutCost, 1);
  });

  it("conta itens sem custo mesmo com custo parcial", () => {
    const costs = new Map([["a", 8]]);
    const result = computeCmvFromLineItems(
      [
        { menu_item_id: "a", quantity: 1 },
        { menu_item_id: null, quantity: 2 },
      ],
      costs,
      50,
    );
    assert.equal(result.source, "menu");
    assert.equal(result.cmvTotal, 8);
    assert.equal(result.itemsWithCost, 1);
    assert.equal(result.itemsWithoutCost, 2);
  });
});
