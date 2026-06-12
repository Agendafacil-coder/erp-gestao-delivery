import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  fallbackUpsellFromMenu,
  mergeUpsellSuggestions,
  rankCoPurchaseCounts,
} from "@/lib/menu/smartUpsell";

describe("smartUpsell", () => {
  it("ignora itens já no carrinho", () => {
    const menuItems = new Map([
      [
        "a",
        {
          id: "a",
          name: "Batata",
          price: 12,
          image_url: null,
          available: true,
          is_drink: false,
          is_combo: false,
          is_featured: false,
          category_id: "c1",
          sales_count: 0,
          variations: [],
          addons: [],
        },
      ],
    ]);

    const result = rankCoPurchaseCounts(
      [{ menu_item_id: "a", count: 10 }],
      new Set(["a"]),
      menuItems,
      3,
    );
    assert.equal(result.length, 0);
  });

  it("mescla histórico com fallback sem duplicar", () => {
    const fallback = fallbackUpsellFromMenu(
      [
        {
          id: "b",
          name: "Sobremesa",
          price: 8,
          image_url: null,
          available: true,
          is_drink: false,
          is_combo: false,
          is_featured: false,
          category_id: "c1",
          sales_count: 0,
          variations: [],
          addons: [],
        },
      ],
      new Set(),
      2,
    );

    const merged = mergeUpsellSuggestions(
      [{ menu_item_id: "b", name: "Sobremesa", price: 8, image_url: null, reason: "hist" }],
      fallback,
      2,
    );
    assert.equal(merged.length, 1);
  });
});
