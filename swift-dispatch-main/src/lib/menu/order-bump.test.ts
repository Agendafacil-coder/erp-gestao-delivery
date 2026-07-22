import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { MenuItemDto, PublicMenuPayload } from "@/functions/menu";
import type { CartItem } from "@/lib/public-cart";
import { DEFAULT_MENU_SETTINGS } from "./public-settings";
import {
  canShowOrderBumpSession,
  cartHasFoodWithoutDrink,
  itemNeedsProductModal,
  pickOrderBumpItem,
  shouldSuggestDrinkAfterAdd,
} from "./order-bump";

const drink: MenuItemDto = {
  id: "drink-1",
  category_id: "cat-bebidas",
  name: "Refrigerante",
  description: null,
  price: 7.9,
  image_url: null,
  available: true,
  sort_order: 0,
  is_featured: false,
  is_combo: false,
  is_drink: true,
  sales_count: 0,
  unit_cost: null,
  stock_quantity: null,
  stock_min: 0,
  ifood_item_id: null,
  variations: [],
  addons: [],
};

const burger: MenuItemDto = {
  ...drink,
  id: "food-1",
  name: "X-Burger",
  price: 32.9,
  is_drink: false,
};

const menu: PublicMenuPayload = {
  tenant: { id: "t1", name: "Loja", slug: "loja" },
  settings: { ...DEFAULT_MENU_SETTINGS },
  categories: [
    {
      id: "cat-lanches",
      name: "Lanches",
      sort_order: 0,
      items: [burger],
    },
    {
      id: "cat-bebidas",
      name: "Bebidas",
      sort_order: 1,
      items: [drink],
    },
  ],
  featured: [],
  combos: [],
  drinks: [drink],
};

const line = (menuItemId: string): CartItem => ({
  line_id: `line-${menuItemId}`,
  menu_item_id: menuItemId,
  name: menuItemId,
  unit_price: 10,
  quantity: 1,
});

describe("pickOrderBumpItem", () => {
  it("sugere bebida barata quando há comida sem bebida", () => {
    const bump = pickOrderBumpItem(menu, [line("food-1")]);
    assert.equal(bump?.id, "drink-1");
  });

  it("não sugere quando sacola só tem bebida", () => {
    assert.equal(pickOrderBumpItem(menu, [line("drink-1")]), null);
  });

  it("não sugere quando bebida já está na sacola", () => {
    assert.equal(pickOrderBumpItem(menu, [line("food-1"), line("drink-1")]), null);
  });
});

describe("cartHasFoodWithoutDrink", () => {
  it("detecta comida sem bebida", () => {
    assert.equal(cartHasFoodWithoutDrink([line("food-1")], menu), true);
  });

  it("retorna falso para sacola só com bebida", () => {
    assert.equal(cartHasFoodWithoutDrink([line("drink-1")], menu), false);
  });
});

describe("itemNeedsProductModal", () => {
  it("exige modal com variações", () => {
    assert.equal(itemNeedsProductModal({ ...drink, variations: [{ id: "v1", name: "L", price: 0, sort_order: 0 }] }), true);
  });
});

describe("canShowOrderBumpSession", () => {
  it("permite bump se ainda não viu nem dispensou", () => {
    assert.equal(canShowOrderBumpSession({ shown: false, dismissed: false }), true);
  });

  it("bloqueia após ver o sheet", () => {
    assert.equal(canShowOrderBumpSession({ shown: true, dismissed: false }), false);
  });

  it("bloqueia após dispensar", () => {
    assert.equal(canShowOrderBumpSession({ shown: false, dismissed: true }), false);
  });
});

describe("shouldSuggestDrinkAfterAdd", () => {
  it("sugere após comida", () => {
    assert.equal(shouldSuggestDrinkAfterAdd(burger, menu, "Lanches"), true);
  });

  it("não sugere após bebida", () => {
    assert.equal(shouldSuggestDrinkAfterAdd(drink, menu, "Bebidas"), false);
  });
});
