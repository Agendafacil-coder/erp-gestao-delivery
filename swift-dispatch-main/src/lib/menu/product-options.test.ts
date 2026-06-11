import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseAddonForms, parseVariationForms } from "./product-options";

describe("parseVariationForms", () => {
  it("ignora linhas vazias e parseia preço com vírgula", () => {
    const result = parseVariationForms([
      { name: "", price: "10" },
      { name: "Duplo", price: "32,90" },
    ]);
    assert.ok(!("error" in result));
    assert.deepEqual(result.variations, [{ name: "Duplo", price: 32.9 }]);
  });

  it("rejeita preço inválido", () => {
    const result = parseVariationForms([{ name: "Grande", price: "abc" }]);
    assert.ok("error" in result);
    assert.match(result.error!, /Grande/);
  });
});

describe("parseAddonForms", () => {
  it("aplica grupo padrão e quantidade máxima", () => {
    const result = parseAddonForms([
      {
        name: "Bacon",
        price: "5,00",
        groupName: "",
        required: false,
        maxQuantity: "2",
        isSuggested: true,
      },
    ]);
    assert.ok(!("error" in result));
    assert.equal(result.addons[0].groupName, "Adicionais");
    assert.equal(result.addons[0].maxQuantity, 2);
    assert.equal(result.addons[0].isSuggested, true);
  });

  it("rejeita quantidade máxima inválida", () => {
    const result = parseAddonForms([
      {
        name: "Queijo",
        price: "3",
        groupName: "Extras",
        required: false,
        maxQuantity: "0",
        isSuggested: false,
      },
    ]);
    assert.ok("error" in result);
    assert.match(result.error!, /Queijo/);
  });
});
