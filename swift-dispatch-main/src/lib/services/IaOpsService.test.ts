import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { LocalOrder, LocalDriver } from "@/lib/db/localDb";
import { IaOpsService } from "@/lib/services/IaOpsService";
import { DEFAULT_SLA_SETTINGS } from "@/lib/ops/slaSettings";

function order(partial: Partial<LocalOrder> & Pick<LocalOrder, "id" | "code" | "status">): LocalOrder {
  return {
    tenant_id: "t1",
    customer_name: "Cliente",
    address: "Rua A",
    placed_at: new Date(Date.now() - 50 * 60_000).toISOString(),
    items_count: 1,
    channel: "balcao",
    priority: "normal",
    sla_minutes: 40,
    payment_method: "on_delivery",
    payment_status: "pendente",
    driver_id: null,
    ...partial,
  };
}

function driver(partial: Partial<LocalDriver> & Pick<LocalDriver, "id" | "name" | "status">): LocalDriver {
  return {
    tenant_id: "t1",
    vehicle: "moto",
    lat: null,
    lng: null,
    active_orders: 0,
    rating: 4.5,
    vx: 0,
    vy: 0,
    ...partial,
  };
}

describe("IaOpsService.generateDiagnostics", () => {
  it("dispara alerta de SLA com limiar customizado mais baixo", () => {
    const orders = [
      order({
        id: "1",
        code: "#1",
        status: "em_preparo",
        sla_minutes: 40,
        placed_at: new Date(Date.now() - 30 * 60_000).toISOString(),
      }),
    ];
    const strict = IaOpsService.generateDiagnostics(orders, [], {
      ...DEFAULT_SLA_SETTINGS,
      slaRiskRatio: 0.5,
    });
    const relaxed = IaOpsService.generateDiagnostics(orders, [], {
      ...DEFAULT_SLA_SETTINGS,
      slaRiskRatio: 0.95,
    });
    assert.ok(strict.some((i) => i.id === "ia-sla-risk"));
    assert.ok(!relaxed.some((i) => i.id === "ia-sla-risk"));
  });

  it("dispara gargalo de cozinha conforme kitchenBottleneckMin", () => {
    const orders = Array.from({ length: 4 }, (_, i) =>
      order({ id: String(i), code: `#${i}`, status: "em_preparo" }),
    );
    const defaultInsights = IaOpsService.generateDiagnostics(orders, []);
    const sensitive = IaOpsService.generateDiagnostics(orders, [], {
      ...DEFAULT_SLA_SETTINGS,
      kitchenBottleneckMin: 3,
    });
    assert.ok(!defaultInsights.some((i) => i.id === "ia-kitchen-bottleneck"));
    assert.ok(sensitive.some((i) => i.id === "ia-kitchen-bottleneck"));
  });

  it("retorna insight de operação livre sem pedidos ativos", () => {
    const insights = IaOpsService.generateDiagnostics(
      [order({ id: "1", code: "#1", status: "entregue" })],
      [driver({ id: "d1", name: "João", status: "offline" })],
    );
    assert.equal(insights[0]?.id, "ia-idle");
  });
});
