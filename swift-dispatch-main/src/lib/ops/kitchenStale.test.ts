import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isStaleKitchenOrder, KITCHEN_STALE_HOURS } from "./kitchenStale";

describe("isStaleKitchenOrder", () => {
  const now = Date.parse("2026-06-11T18:00:00.000Z");

  it("ignora pedidos fora da cozinha", () => {
    assert.equal(
      isStaleKitchenOrder(
        { placed_at: "2026-06-10T00:00:00.000Z", status: "entregue", sla_minutes: 45 },
        now,
      ),
      false,
    );
  });

  it("marca pedido antigo em preparo", () => {
    const placed = new Date(now - (KITCHEN_STALE_HOURS + 1) * 3_600_000).toISOString();
    assert.equal(
      isStaleKitchenOrder({ placed_at: placed, status: "em_preparo", sla_minutes: 45 }, now),
      true,
    );
  });

  it("mantém pedido recente na fila", () => {
    assert.equal(
      isStaleKitchenOrder(
        { placed_at: "2026-06-11T17:30:00.000Z", status: "novo", sla_minutes: 45 },
        now,
      ),
      false,
    );
  });
});
