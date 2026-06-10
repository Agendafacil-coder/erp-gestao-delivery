import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { LocalDriver } from "@/lib/db/localDb";
import { pickNextDriverFromList } from "@/lib/drivers/dispatchPick";

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

describe("pickNextDriverFromList", () => {
  it("retorna null quando não há entregadores disponíveis", () => {
    const drivers = [
      driver({ id: "1", name: "A", status: "offline" }),
      driver({ id: "2", name: "B", status: "pausado" }),
    ];
    assert.equal(pickNextDriverFromList(drivers), null);
  });

  it("prefere entregador disponível com menor carga", () => {
    const drivers = [
      driver({ id: "1", name: "Carregado", status: "em_rota", active_orders: 2, rating: 5 }),
      driver({ id: "2", name: "Livre", status: "disponivel", active_orders: 0, rating: 4 }),
      driver({ id: "3", name: "Meio", status: "em_rota", active_orders: 1, rating: 4.8 }),
    ];
    const picked = pickNextDriverFromList(drivers);
    assert.equal(picked?.id, "2");
  });

  it("ignora entregadores com rota cheia (8 pedidos ativos)", () => {
    const drivers = [
      driver({ id: "1", name: "Cheio", status: "em_rota", active_orders: 8 }),
      driver({ id: "2", name: "Ok", status: "em_rota", active_orders: 2 }),
    ];
    const picked = pickNextDriverFromList(drivers);
    assert.equal(picked?.id, "2");
  });

  it("desempata por rating quando carga e status são iguais", () => {
    const drivers = [
      driver({ id: "1", name: "Baixo", status: "em_rota", active_orders: 0, rating: 3.5 }),
      driver({ id: "2", name: "Alto", status: "em_rota", active_orders: 0, rating: 4.9 }),
    ];
    const picked = pickNextDriverFromList(drivers);
    assert.equal(picked?.id, "2");
  });
});
