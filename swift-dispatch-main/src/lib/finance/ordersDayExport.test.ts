import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { LocalOrder } from "@/lib/db/localDb";
import { buildAccountingDayCsv, filterOrdersForAccountingDay } from "./ordersDayExport";

function order(partial: Partial<LocalOrder> & Pick<LocalOrder, "id" | "code" | "placed_at">): LocalOrder {
  return {
    tenant_id: "t1",
    customer_name: "Maria",
    customer_phone: "11999999999",
    address: "Rua A, 1",
    items_count: 2,
    total_amount: 50,
    channel: "whatsapp",
    sla_minutes: 45,
    driver_id: null,
    status: "entregue",
    priority: "normal",
    lat: null,
    lng: null,
    ...partial,
  };
}

describe("ordersDayExport", () => {
  it("filters by calendar day", () => {
    const rows = [
      order({ id: "1", code: "#1", placed_at: "2026-07-21T12:00:00.000Z" }),
      order({ id: "2", code: "#2", placed_at: "2026-07-22T12:00:00.000Z" }),
    ];
    assert.equal(filterOrdersForAccountingDay(rows, "2026-07-21").length, 1);
  });

  it("builds csv with header and BOM-friendly content", () => {
    const csv = buildAccountingDayCsv(
      [order({ id: "1", code: "#5042", placed_at: "2026-07-21T15:30:00.000Z", total_amount: 42.5 })],
      "2026-07-21",
    );
    assert.match(csv, /^data;hora;codigo;/);
    assert.match(csv, /#5042/);
    assert.match(csv, /42,50/);
  });
});
