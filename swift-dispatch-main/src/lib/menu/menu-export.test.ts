import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PublicMenuPayload } from "@/functions/menu";
import { DEFAULT_MENU_SETTINGS } from "./public-settings";
import { buildMenuExportCsv } from "./menu-export";
import { parseMenuImportCsv } from "./menu-import";

const sampleMenu: PublicMenuPayload = {
  tenant: { id: "t1", name: "Test", slug: "test" },
  settings: { ...DEFAULT_MENU_SETTINGS },
  featured: [],
  combos: [],
  drinks: [],
  categories: [
    {
      id: "c1",
      name: "Lanches",
      sort_order: 0,
      items: [
        {
          id: "i1",
          category_id: "c1",
          name: "X-Burger",
          description: "Com queijo",
          price: 32.9,
          image_url: null,
          available: true,
          sort_order: 0,
          is_featured: true,
          is_combo: false,
          is_drink: false,
          sales_count: 0,
          unit_cost: null,
          stock_quantity: 10,
          stock_min: 2,
          variations: [],
          addons: [],
        },
      ],
    },
  ],
};

describe("buildMenuExportCsv", () => {
  it("gera CSV importável com colunas principais", () => {
    const csv = buildMenuExportCsv(sampleMenu);
    const parsed = parseMenuImportCsv(csv);
    assert.equal(parsed.errors.length, 0);
    assert.equal(parsed.rows.length, 1);
    assert.equal(parsed.rows[0]?.name, "X-Burger");
    assert.equal(parsed.rows[0]?.price, 32.9);
    assert.equal(parsed.rows[0]?.stockQuantity, 10);
    assert.equal(parsed.rows[0]?.isFeatured, true);
  });

  it("escapa e reimporta células com aspas internas", () => {
    const menu: PublicMenuPayload = {
      ...sampleMenu,
      categories: [
        {
          ...sampleMenu.categories[0]!,
          items: [
            {
              ...sampleMenu.categories[0]!.items[0]!,
              description: 'Molho "especial"',
            },
          ],
        },
      ],
    };
    const csv = buildMenuExportCsv(menu);
    const parsed = parseMenuImportCsv(csv);
    assert.equal(parsed.errors.length, 0);
    assert.equal(parsed.rows[0]?.description, 'Molho "especial"');
  });

  it("escapa células com ponto e vírgula", () => {
    const menu: PublicMenuPayload = {
      ...sampleMenu,
      categories: [
        {
          ...sampleMenu.categories[0]!,
          items: [
            {
              ...sampleMenu.categories[0]!.items[0]!,
              description: "Molho; extra picante",
            },
          ],
        },
      ],
    };
    const csv = buildMenuExportCsv(menu);
    assert.match(csv, /"Molho; extra picante"/);
  });
});
