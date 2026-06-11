import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseCsvLine, parseMenuImportCsv } from "./menu-import";

describe("parseCsvLine", () => {
  it("respeita aspas com delimitador interno", () => {
    assert.deepEqual(parseCsvLine('"X-Burger",32,90', ","), ["X-Burger", "32", "90"]);
  });

  it("decodifica aspas escapadas (\"\") dentro de células", () => {
    assert.deepEqual(parseCsvLine('"Molho ""especial""",32,90', ","), [
      'Molho "especial"',
      "32",
      "90",
    ]);
  });
});

describe("parseMenuImportCsv", () => {
  it("parseia CSV com ponto e vírgula", () => {
    const result = parseMenuImportCsv(`categoria;nome;preco;estoque
Lanches;X-Burger;32,90;15`);
    assert.equal(result.errors.length, 0);
    assert.equal(result.rows.length, 1);
    assert.equal(result.rows[0].name, "X-Burger");
    assert.equal(result.rows[0].price, 32.9);
    assert.equal(result.rows[0].stockQuantity, 15);
  });

  it("rejeita CSV sem colunas obrigatórias", () => {
    const result = parseMenuImportCsv(`nome,preco
Burger,10`);
    assert.ok(result.errors.some((e) => e.includes("categoria")));
    assert.equal(result.rows.length, 0);
  });

  it("interpreta flags booleanas em português", () => {
    const result = parseMenuImportCsv(`categoria,nome,preco,destaque,combo
Bebidas,Suco,8,sim,nao`);
    assert.equal(result.rows[0].isFeatured, true);
    assert.equal(result.rows[0].isCombo, false);
  });

  it("rejeita estoque decimal em vez de truncar dígitos", () => {
    const result = parseMenuImportCsv(`categoria;nome;preco;estoque
Lanches;X-Burger;32,90;5.5`);
    assert.ok(result.errors.some((e) => e.includes("estoque inválido")));
    assert.equal(result.rows[0]?.stockQuantity, undefined);
  });

  it("rejeita estoque mínimo com vírgula decimal", () => {
    const result = parseMenuImportCsv(`categoria;nome;preco;estoque_minimo
Lanches;X-Burger;32,90;2,5`);
    assert.ok(result.errors.some((e) => e.includes("estoque mínimo inválido")));
    assert.equal(result.rows[0]?.stockMin, undefined);
  });
});
