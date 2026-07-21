import { type LocalOrder, type LocalDriver } from "../db/localDb";
import {
  needsDispatch,
  nextStatusFromScan,
  normalizeOrderStatus,
  STATUS_LABEL,
  type OrderStatus,
} from "@/lib/ops/orderWorkflow";
import { MAX_DRIVER_ROUTE_ORDERS } from "@/lib/drivers/driverCapacity";

export type OtimizacaoResultado = {
  driverId: string;
  driverName: string;
  region: string;
  orderIds: string[];
  economyBrl: number;
  routeOtimizada: string[];
};

function orderPriorityValue(priority: LocalOrder["priority"]): number {
  if (priority === "critica") return 4;
  if (priority === "alta") return 3;
  if (priority === "normal") return 2;
  return 1;
}

function driverScore(driver: LocalDriver): number {
  return driver.rating + (driver.vehicle === "moto" ? 1.5 : driver.vehicle === "carro" ? 1.0 : 0.5);
}

function driverRouteCapacity(driver: LocalDriver): number {
  return Math.max(0, MAX_DRIVER_ROUTE_ORDERS - (driver.active_orders ?? 0));
}

/** Entregador pode receber mais pedidos no despacho automático. */
export function isDriverAvailableForAutoDispatch(driver: LocalDriver): boolean {
  return (
    driver.status !== "offline" &&
    driver.status !== "pausado" &&
    driverRouteCapacity(driver) > 0
  );
}

function orderRegionLabel(order: LocalOrder): string {
  return order.neighborhood?.trim() || order.address.split(",")[0]?.trim() || "Geral";
}

export class DispatchService {
  static calculateAutoDispatch(
    orders: LocalOrder[],
    drivers: LocalDriver[],
  ): OtimizacaoResultado[] {
    // Pedidos de mesa (salão) nunca entram no despacho de entregadores
    const pendingOrders = orders.filter(
      (o) => needsDispatch(o.status) && !o.driver_id && o.channel !== "salao",
    );

    const availableDrivers = drivers
      .filter(isDriverAvailableForAutoDispatch)
      .sort((a, b) => driverScore(b) - driverScore(a));

    if (pendingOrders.length === 0 || availableDrivers.length === 0) {
      return [];
    }

    const sortedOrders = [...pendingOrders].sort(
      (a, b) => orderPriorityValue(b.priority) - orderPriorityValue(a.priority),
    );

    const results: OtimizacaoResultado[] = [];
    let orderCursor = 0;

    for (const driver of availableDrivers) {
      if (orderCursor >= sortedOrders.length) break;

      const capacity = driverRouteCapacity(driver);
      if (capacity === 0) continue;

      const ordersToAssign = sortedOrders.slice(orderCursor, orderCursor + capacity);
      orderCursor += ordersToAssign.length;

      const regions = [...new Set(ordersToAssign.map(orderRegionLabel))];
      const economyBrl = ordersToAssign.length > 1 ? (ordersToAssign.length - 1) * 5.5 : 0;

      results.push({
        driverId: driver.id,
        driverName: driver.name,
        region: regions.length === 1 ? regions[0] : regions.join(" · "),
        orderIds: ordersToAssign.map((o) => o.id),
        economyBrl,
        routeOtimizada: ordersToAssign.map(orderRegionLabel),
      });
    }

    return results;
  }

  static processTicketScan(
    scannedCode: string,
    activeOrders: LocalOrder[],
  ):
    | { order: LocalOrder; kind: "status"; nextStatus: OrderStatus }
    | { order: LocalOrder; kind: "retirei" }
    | null {
    const cleanCode = scannedCode.trim().toLowerCase();
    if (!cleanCode) return null;

    const order = activeOrders.find(
      (o) =>
        o.code.toLowerCase() === cleanCode ||
        o.code.replace("#", "").toLowerCase() === cleanCode ||
        o.id.toLowerCase() === cleanCode,
    );

    if (!order) return null;

    const norm = normalizeOrderStatus(order.status);

    if (norm === "aguardando_entregador" && order.driver_id && !order.picked_up_at) {
      return { order, kind: "retirei" };
    }

    const next = nextStatusFromScan(norm);
    if (!next) return null;

    if (next === "em_rota_entrega" && !order.driver_id) return null;

    return { order, kind: "status", nextStatus: next };
  }

  /** Mensagem amigável quando a leitura não pode avançar o pedido. */
  static explainTicketScanFailure(
    scannedCode: string,
    activeOrders: LocalOrder[],
  ): string {
    const cleanCode = scannedCode.trim().toLowerCase();
    if (!cleanCode) return "Código vazio.";

    const order = activeOrders.find(
      (o) =>
        o.code.toLowerCase() === cleanCode ||
        o.code.replace("#", "").toLowerCase() === cleanCode ||
        o.id.toLowerCase() === cleanCode,
    );

    if (!order) {
      return `Pedido "${scannedCode.trim()}" não encontrado ou já finalizado.`;
    }

    const norm = normalizeOrderStatus(order.status);
    if (norm === "entregue" || norm === "cancelado") {
      return `Pedido ${order.code} já está ${STATUS_LABEL[norm].toLowerCase()}.`;
    }
    if (norm === "aguardando_entregador" && !order.driver_id) {
      return `Pedido ${order.code} sem entregador — atribua na aba Entregadores ou ative o despacho automático.`;
    }
    if (norm === "aguardando_entregador" && order.driver_id && order.picked_up_at) {
      return `Pedido ${order.code}: escaneie novamente para marcar saída para entrega.`;
    }
    const next = nextStatusFromScan(norm);
    if (!next) {
      return `Pedido ${order.code} não pode avançar por leitura neste status (${STATUS_LABEL[norm]}).`;
    }
    if (next === "em_rota_entrega" && !order.driver_id) {
      return `Pedido ${order.code} precisa de entregador antes de sair para entrega.`;
    }
    return `Não foi possível avançar o pedido ${order.code}.`;
  }

  /** Leitura de etiqueta no app do entregador — só retirada, rota e entrega. */
  static processDriverTicketScan(
    scannedCode: string,
    myOrders: LocalOrder[],
  ):
    | { order: LocalOrder; kind: "status"; nextStatus: OrderStatus }
    | { order: LocalOrder; kind: "retirei" }
    | null {
    const result = DispatchService.processTicketScan(scannedCode, myOrders);
    if (!result) return null;

    const norm = normalizeOrderStatus(result.order.status);
    if (result.kind === "retirei") return result;

    if (result.kind === "status") {
      if (result.nextStatus === "em_rota_entrega" || result.nextStatus === "entregue") {
        return result;
      }
      if (norm === "novo" || norm === "em_preparo") {
        return null;
      }
    }
    return null;
  }

  static explainDriverTicketScanFailure(
    scannedCode: string,
    myOrders: LocalOrder[],
  ): string {
    const cleanCode = scannedCode.trim().toLowerCase();
    if (!cleanCode) return "Código vazio.";

    const order = myOrders.find(
      (o) =>
        o.code.toLowerCase() === cleanCode ||
        o.code.replace("#", "").toLowerCase() === cleanCode ||
        o.id.toLowerCase() === cleanCode,
    );

    if (!order) {
      return `Pedido "${scannedCode.trim()}" não está atribuído a você.`;
    }

    const norm = normalizeOrderStatus(order.status);
    if (norm === "novo" || norm === "em_preparo") {
      return `Pedido ${order.code} ainda está em preparo na cozinha.`;
    }
    return DispatchService.explainTicketScanFailure(scannedCode, myOrders);
  }
}
