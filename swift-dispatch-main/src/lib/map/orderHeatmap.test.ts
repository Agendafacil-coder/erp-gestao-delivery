import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildOrderHeatmapPoints } from "./orderHeatmap";
import type { LocalOrder } from "@/lib/db/localDb";

const baseOrder: LocalOrder = {
  id: "1",
  code: "#1",
  tenant_id: "t1",
  customer_name: "Cliente",
  customer_phone: "",
  address: "Rua A",
  items_count: 1,
  total_amount: 10,
  channel: "app",
  sla_minutes: 40,
  placed_at: new Date().toISOString(),
  driver_id: null,
  status: "em_preparo",
  priority: "normal",
  lat: -23.55,
  lng: -46.63,
};

describe("buildOrderHeatmapPoints", () => {
  it("ignora pedidos finalizados e sem coordenadas", () => {
    assert.deepEqual(
      buildOrderHeatmapPoints([
        { ...baseOrder, status: "entregue" },
        { ...baseOrder, id: "2", lat: null, lng: null },
      ]),
      [],
    );
  });

  it("pondera prioridade crítica mais forte", () => {
    const points = buildOrderHeatmapPoints([
      baseOrder,
      { ...baseOrder, id: "2", priority: "critica" },
    ]);
    assert.equal(points.length, 2);
    assert.ok(points.find((p) => p.weight === 3));
    assert.ok(points.find((p) => p.weight === 1.4));
  });
});
