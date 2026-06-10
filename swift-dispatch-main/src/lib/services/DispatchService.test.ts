import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { LocalOrder } from "@/lib/db/localDb";
import { DispatchService } from "@/lib/services/DispatchService";

function order(partial: Partial<LocalOrder> & Pick<LocalOrder, "id" | "code" | "status">): LocalOrder {
  return {
    tenant_id: "t1",
    customer_name: "Cliente",
    address: "Rua A",
    placed_at: new Date().toISOString(),
    items_count: 1,
    channel: "balcao",
    priority: "normal",
    sla_minutes: 30,
    payment_method: "on_delivery",
    payment_status: "pendente",
    driver_id: null,
    ...partial,
  };
}

describe("DispatchService.processTicketScan", () => {
  it("avança pedido em preparo para aguardando entregador", () => {
    const orders = [order({ id: "1", code: "#100", status: "em_preparo" })];
    const result = DispatchService.processTicketScan("#100", orders);
    assert.equal(result?.kind, "status");
    if (result?.kind === "status") {
      assert.equal(result.nextStatus, "aguardando_entregador");
    }
  });

  it("registra retirada quando entregador atribuído sem picked_up_at", () => {
    const orders = [
      order({
        id: "2",
        code: "#200",
        status: "aguardando_entregador",
        driver_id: "d1",
      }),
    ];
    const result = DispatchService.processTicketScan("200", orders);
    assert.equal(result?.kind, "retirei");
  });
});

describe("DispatchService.processDriverTicketScan", () => {
  it("rejeita pedido em preparo para entregador", () => {
    const orders = [order({ id: "3", code: "#300", status: "em_preparo", driver_id: "d1" })];
    assert.equal(DispatchService.processDriverTicketScan("#300", orders), null);
    assert.match(
      DispatchService.explainDriverTicketScanFailure("#300", orders),
      /preparo/,
    );
  });

  it("permite marcar entrega quando em rota", () => {
    const orders = [
      order({
        id: "4",
        code: "#400",
        status: "em_rota_entrega",
        driver_id: "d1",
        picked_up_at: new Date().toISOString(),
      }),
    ];
    const result = DispatchService.processDriverTicketScan("#400", orders);
    assert.equal(result?.kind, "status");
    if (result?.kind === "status") {
      assert.equal(result.nextStatus, "entregue");
    }
  });
});
