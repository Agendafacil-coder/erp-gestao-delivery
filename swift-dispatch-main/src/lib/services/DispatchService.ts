import { type LocalOrder, type LocalDriver } from "../db/localDb";
import {
  nextStatusFromScan,
  normalizeOrderStatus,
  type OrderStatus,
} from "@/lib/ops/orderWorkflow";

export type OtimizacaoResultado = {
  driverId: string;
  driverName: string;
  region: string;
  orderIds: string[];
  economyBrl: number;
  routeOtimizada: string[];
};

export class DispatchService {
  static calculateAutoDispatch(
    orders: LocalOrder[],
    drivers: LocalDriver[],
  ): OtimizacaoResultado[] {
    const pendingOrders = orders.filter(
      (o) => o.status === "pronto" || o.status === "aguardando_entregador",
    );

    const availableDrivers = drivers.filter(
      (d) =>
        (d.status === "disponivel" || d.status === "pausado" || d.status === "offline") &&
        d.active_orders === 0,
    );

    if (pendingOrders.length === 0 || availableDrivers.length === 0) {
      return [];
    }

    const results: OtimizacaoResultado[] = [];
    const driversList = [...availableDrivers];

    const regionGroups: Record<string, LocalOrder[]> = {};
    pendingOrders.forEach((o) => {
      const region = o.address.split(",")[0] || "Geral";
      if (!regionGroups[region]) regionGroups[region] = [];
      regionGroups[region].push(o);
    });

    const regions = Object.keys(regionGroups);

    for (const region of regions) {
      if (driversList.length === 0) break;

      const group = regionGroups[region];
      const sortedOrders = [...group].sort((a, b) => {
        const aVal =
          a.priority === "critica" ? 4 : a.priority === "alta" ? 3 : a.priority === "normal" ? 2 : 1;
        const bVal =
          b.priority === "critica" ? 4 : b.priority === "alta" ? 3 : b.priority === "normal" ? 2 : 1;
        return bVal - aVal;
      });

      driversList.sort((a, b) => {
        const scoreA = a.rating + (a.vehicle === "moto" ? 1.5 : a.vehicle === "carro" ? 1.0 : 0.5);
        const scoreB = b.rating + (b.vehicle === "moto" ? 1.5 : b.vehicle === "carro" ? 1.0 : 0.5);
        return scoreB - scoreA;
      });

      const driver = driversList.shift()!;
      const ordersToAssign = sortedOrders.slice(0, 3);
      const economyBrl = ordersToAssign.length > 1 ? (ordersToAssign.length - 1) * 5.5 : 0;

      results.push({
        driverId: driver.id,
        driverName: driver.name,
        region,
        orderIds: ordersToAssign.map((o) => o.id),
        economyBrl,
        routeOtimizada: ordersToAssign.map((o) => o.address.split(",")[0]),
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
}
