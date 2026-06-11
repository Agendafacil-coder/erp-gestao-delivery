import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { clearServerAutomationEvents, getServerAutomationEvents } from "./automationEventBus";
import {
  resetServerAutomationDetectorState,
  runServerAutomationDetection,
} from "./serverAutomationDetector";
import { DEFAULT_SLA_SETTINGS } from "./slaSettings";
import { DEFAULT_AUTOMATION_SETTINGS } from "./automationSettings";
import type { LocalDriver, LocalOrder } from "@/lib/db/localDb";

const baseOrder: LocalOrder = {
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

describe("serverAutomationDetector", () => {
  beforeEach(() => {
    resetServerAutomationDetectorState();
    clearServerAutomationEvents();
  });

  it("não emite sla-delay quando regra está desligada", async () => {
    runServerAutomationDetection({
      tenantId: "t1",
      orders: [baseOrder],
      drivers: [],
      slaSettings: DEFAULT_SLA_SETTINGS,
      automationSettings: {
        enabled: { ...DEFAULT_AUTOMATION_SETTINGS.enabled, "sla-delay": false },
      },
    });
    const events = await getServerAutomationEvents("t1");
    assert.equal(events.some((e) => e.ruleId === "sla-delay"), false);
  });

  it("emite sla-delay na transição para atraso", async () => {
    runServerAutomationDetection({
      tenantId: "t1",
      orders: [baseOrder],
      drivers: [],
      slaSettings: DEFAULT_SLA_SETTINGS,
    });
    const events = await getServerAutomationEvents("t1");
    assert.ok(events.some((e) => e.ruleId === "sla-delay"));
  });

  it("emite kitchen-bottleneck ao cruzar limiar", async () => {
    const orders = Array.from({ length: 5 }, (_, i) => ({
      ...baseOrder,
      id: `o${i}`,
      code: `#${i}`,
      status: "em_preparo" as const,
      placed_at: new Date().toISOString(),
    }));

    runServerAutomationDetection({
      tenantId: "t1",
      orders,
      drivers: [],
      slaSettings: { ...DEFAULT_SLA_SETTINGS, kitchenBottleneckMin: 5 },
    });

    const events = await getServerAutomationEvents("t1");
    assert.ok(events.some((e) => e.ruleId === "kitchen-bottleneck"));
  });

  it("emite ops-alerts quando há entregadores ociosos e fila", async () => {
    const drivers: LocalDriver[] = [
      {
        id: "d1",
        tenant_id: "t1",
        name: "João",
        phone: "",
        status: "disponivel",
        active_orders: 0,
        lat: null,
        lng: null,
        rating: 5,
      },
      {
        id: "d2",
        tenant_id: "t1",
        name: "Maria",
        phone: "",
        status: "disponivel",
        active_orders: 0,
        lat: null,
        lng: null,
        rating: 5,
      },
    ];
    const orders: LocalOrder[] = [
      {
        ...baseOrder,
        id: "w1",
        status: "aguardando_entregador",
        placed_at: new Date().toISOString(),
      },
    ];

    runServerAutomationDetection({
      tenantId: "t1",
      orders,
      drivers,
      slaSettings: DEFAULT_SLA_SETTINGS,
    });

    const events = await getServerAutomationEvents("t1");
    assert.ok(events.some((e) => e.ruleId === "ops-alerts" && e.message.includes("ocioso")));
  });
});
