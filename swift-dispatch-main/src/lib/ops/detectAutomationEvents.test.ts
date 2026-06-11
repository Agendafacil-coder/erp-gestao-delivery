import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { detectAutomationEvents } from "./detectAutomationEvents";
import { DEFAULT_SLA_SETTINGS } from "./slaSettings";
import type { LocalOrder } from "@/lib/db/localDb";

const base: LocalOrder = {
  id: "o1",
  code: "#100",
  tenant_id: "t1",
  customer_name: "Ana",
  customer_phone: "",
  address: "Rua A",
  items_count: 1,
  total_amount: 30,
  channel: "app",
  sla_minutes: 30,
  placed_at: new Date(Date.now() - 40 * 60_000).toISOString(),
  driver_id: null,
  status: "em_preparo",
  priority: "normal",
  lat: null,
  lng: null,
};

describe("detectAutomationEvents", () => {
  it("não dispara SLA quando regra sla-delay está desligada", () => {
    const prev = new Map<string, LocalOrder>([
      ["o1", { ...base, placed_at: new Date().toISOString() }],
    ]);
    const { events } = detectAutomationEvents({
      orders: [base],
      drivers: [],
      prevById: prev,
      slaSettings: DEFAULT_SLA_SETTINGS,
      kitchenWasHot: false,
      isRuleEnabled: (ruleId) => ruleId !== "sla-delay",
    });
    assert.equal(events.some((e) => e.ruleId === "sla-delay"), false);
  });

  it("dispara SLA quando pedido entra em atraso", () => {
    const prev = new Map<string, LocalOrder>([
      ["o1", { ...base, placed_at: new Date().toISOString() }],
    ]);
    const { events } = detectAutomationEvents({
      orders: [base],
      drivers: [],
      prevById: prev,
      slaSettings: DEFAULT_SLA_SETTINGS,
      kitchenWasHot: false,
    });
    assert.ok(events.some((e) => e.ruleId === "sla-delay"));
  });

  it("skipServerHandled omite geofence e auto-complete", () => {
    const prev = new Map<string, LocalOrder>([
      [
        "o1",
        {
          ...base,
          status: "em_rota_entrega",
          arrived_at: null,
        },
      ],
    ]);
    const arrived: LocalOrder = {
      ...base,
      status: "em_rota_entrega",
      arrived_at: new Date().toISOString(),
    };
    const { events } = detectAutomationEvents({
      orders: [arrived],
      drivers: [],
      prevById: prev,
      slaSettings: DEFAULT_SLA_SETTINGS,
      kitchenWasHot: false,
      skipServerHandled: true,
    });
    assert.equal(
      events.some((e) => e.ruleId === "geofence-arrived"),
      false,
    );
  });

  it("detecta gargalo de cozinha ao cruzar limiar", () => {
    const orders = Array.from({ length: 5 }, (_, i) => ({
      ...base,
      id: `o${i}`,
      code: `#${i}`,
      status: "em_preparo" as const,
    }));
    const { events, kitchenIsHot } = detectAutomationEvents({
      orders,
      drivers: [],
      prevById: new Map(),
      slaSettings: { ...DEFAULT_SLA_SETTINGS, kitchenBottleneckMin: 5 },
      kitchenWasHot: false,
    });
    assert.equal(kitchenIsHot, true);
    assert.ok(events.some((e) => e.ruleId === "kitchen-bottleneck"));
  });
});
