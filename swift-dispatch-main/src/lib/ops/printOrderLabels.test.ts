import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildLabelsPrintHtml } from "./printOrderLabels";
import type { LocalOrder } from "@/lib/db/localDb";

const sampleOrder: LocalOrder = {
  id: "o1",
  code: "#0042",
  tenant_id: "t1",
  customer_name: "Maria",
  customer_phone: "11999990000",
  address: "Rua Teste, 10",
  items_count: 2,
  total_amount: 50,
  channel: "Cardápio",
  sla_minutes: 45,
  placed_at: "2026-06-11T12:00:00.000Z",
  status: "novo",
  priority: "normal",
  notes: "Sem cebola",
};

describe("buildLabelsPrintHtml", () => {
  it("gera comanda de cozinha com observação", () => {
    const html = buildLabelsPrintHtml(
      [
        {
          order: sampleOrder,
          lines: [{ name: "X-Burger", quantity: 2, notes: "Bem passado" }],
        },
      ],
      "Burger House",
      { format: "kitchen" },
    );
    assert.match(html, /COMANDA COZINHA/);
    assert.match(html, /#0042/);
    assert.match(html, /Sem cebola/);
    assert.match(html, /Bem passado/);
  });

  it("gera etiqueta de entrega com endereço", () => {
    const html = buildLabelsPrintHtml(
      [{ order: sampleOrder, lines: [] }],
      "Burger House",
      { format: "delivery" },
    );
    assert.match(html, /Rua Teste, 10/);
    assert.doesNotMatch(html, /COMANDA COZINHA/);
  });

  it("duplica conteúdo conforme cópias", () => {
    const html = buildLabelsPrintHtml(
      [{ order: sampleOrder, lines: [] }],
      "Burger House",
      { format: "kitchen", copies: 2 },
    );
    const matches = html.match(/#0042/g) ?? [];
    assert.ok(matches.length >= 2);
  });
});
