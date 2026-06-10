import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildInventoryOverview, marginPct } from "./inventorySummary";

describe("buildInventoryOverview", () => {
  it("calcula cobertura de custo e estoque baixo", () => {
    const overview = buildInventoryOverview([
      {
        id: "1",
        name: "Burger",
        price: 30,
        unit_cost: 12,
        stock_quantity: 2,
        stock_min: 5,
        available: true,
      },
      {
        id: "2",
        name: "Suco",
        price: 10,
        unit_cost: null,
        stock_quantity: null,
        stock_min: 0,
        available: true,
      },
      {
        id: "3",
        name: "Pizza",
        price: 45,
        unit_cost: 18,
        stock_quantity: 20,
        stock_min: 3,
        available: true,
      },
    ]);

    assert.equal(overview.totalProducts, 3);
    assert.equal(overview.withUnitCost, 2);
    assert.equal(overview.withoutUnitCost, 1);
    assert.equal(overview.costCoveragePct, 67);
    assert.equal(overview.trackedStock, 2);
    assert.equal(overview.lowStock.length, 1);
    assert.equal(overview.lowStock[0].name, "Burger");
    assert.equal(overview.missingCost.length, 1);
    assert.equal(overview.missingCost[0].name, "Suco");
  });
});

describe("marginPct", () => {
  it("calcula margem percentual", () => {
    assert.equal(marginPct(100, 40), 60);
  });

  it("retorna null sem custo", () => {
    assert.equal(marginPct(100, null), null);
  });
});
