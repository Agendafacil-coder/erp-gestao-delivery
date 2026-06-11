import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  aggregateMenuItemQuantities,
  isMenuItemLowStock,
  validateMenuStock,
  type MenuStockItem,
} from "./menu-stock";

const items: MenuStockItem[] = [
  { id: "a", name: "Burger", available: true, stockQuantity: 3 },
  { id: "b", name: "Suco", available: true, stockQuantity: null },
  { id: "c", name: "Pizza", available: false, stockQuantity: 10 },
  { id: "d", name: "Brownie", available: true, stockQuantity: 0 },
];

describe("isMenuItemLowStock", () => {
  it("ignora produtos sem controle de estoque", () => {
    assert.equal(isMenuItemLowStock(null, 5), false);
    assert.equal(isMenuItemLowStock(undefined, 0), false);
  });

  it("detecta estoque no mínimo ou abaixo", () => {
    assert.equal(isMenuItemLowStock(5, 5), true);
    assert.equal(isMenuItemLowStock(2, 5), true);
    assert.equal(isMenuItemLowStock(6, 5), false);
    assert.equal(isMenuItemLowStock(0, 0), true);
  });
});

describe("aggregateMenuItemQuantities", () => {
  it("soma quantidades do mesmo produto", () => {
    const qty = aggregateMenuItemQuantities([
      { menu_item_id: "a", quantity: 1 },
      { menu_item_id: "a", quantity: 2 },
      { menu_item_id: "b", quantity: 1 },
    ]);
    assert.equal(qty.get("a"), 3);
    assert.equal(qty.get("b"), 1);
  });
});

describe("validateMenuStock", () => {
  it("aceita produto sem controle de estoque", () => {
    const qty = aggregateMenuItemQuantities([{ menu_item_id: "b", quantity: 99 }]);
    assert.doesNotThrow(() => validateMenuStock(items, qty));
  });

  it("rejeita produto indisponível", () => {
    const qty = aggregateMenuItemQuantities([{ menu_item_id: "c", quantity: 1 }]);
    assert.throws(() => validateMenuStock(items, qty), /indisponível: Pizza/);
  });

  it("rejeita estoque insuficiente", () => {
    const qty = aggregateMenuItemQuantities([{ menu_item_id: "a", quantity: 4 }]);
    assert.throws(() => validateMenuStock(items, qty), /Estoque insuficiente de Burger/);
  });

  it("mensagem específica para estoque zerado", () => {
    const qty = aggregateMenuItemQuantities([{ menu_item_id: "d", quantity: 1 }]);
    assert.throws(() => validateMenuStock(items, qty), /Brownie esgotou/);
  });
});
