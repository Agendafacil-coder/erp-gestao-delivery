import { type LocalOrder, type LocalDriver } from "../db/localDb";
import { type OrderStatus } from "../ops/mock";

export type OtimizacaoResultado = {
  driverId: string;
  driverName: string;
  region: string;
  orderIds: string[];
  economyBrl: number;
  routeOtimizada: string[];
};

export class DispatchService {
  /**
   * Main auto dispatch engine algorithm
   * Selects undispatched orders, clusters them by region, and matches them to ideal available drivers
   */
  static calculateAutoDispatch(
    orders: LocalOrder[],
    drivers: LocalDriver[]
  ): OtimizacaoResultado[] {
    // Filter undispatched/ready orders (Novo, Confirmado, Pronto, Aguardando)
    const pendingOrders = orders.filter(
      (o) => o.status === "pronto" || o.status === "aguardando_entregador"
    );

    // Filter active/available drivers (disponivel, ocioso)
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

    // Group pending orders by region/neighborhood
    const regionGroups: Record<string, LocalOrder[]> = {};
    pendingOrders.forEach((o) => {
      // Split address to isolate region (e.g. Pinheiros, Itaim Bibi)
      const region = o.address.split(",")[0] || "Geral";
      if (!regionGroups[region]) regionGroups[region] = [];
      regionGroups[region].push(o);
    });

    const regions = Object.keys(regionGroups);

    for (const region of regions) {
      if (driversList.length === 0) break;

      const group = regionGroups[region];
      // Sort orders within the group by SLA priority (critical/high first)
      const sortedOrders = [...group].sort((a, b) => {
        const aVal = a.priority === "critica" ? 4 : a.priority === "alta" ? 3 : a.priority === "normal" ? 2 : 1;
        const bVal = b.priority === "critica" ? 4 : b.priority === "alta" ? 3 : b.priority === "normal" ? 2 : 1;
        return bVal - aVal;
      });

      // Select the ideal driver for this region group based on rating and vehicle
      // e.g. motorbikes are faster, select highest rated
      driversList.sort((a, b) => {
        const scoreA = a.rating + (a.vehicle === "moto" ? 1.5 : a.vehicle === "carro" ? 1.0 : 0.5);
        const scoreB = b.rating + (b.vehicle === "moto" ? 1.5 : b.vehicle === "carro" ? 1.0 : 0.5);
        return scoreB - scoreA;
      });

      const driver = driversList.shift()!; // Take highest scored driver
      
      // Limit to max 3 orders per route for smart grouping (prevent overloading, keep SLA in check)
      const ordersToAssign = sortedOrders.slice(0, 3);
      const orderIds = ordersToAssign.map((o) => o.id);

      // Economy calculation: R$ 5.50 saved per bundled delivery instead of separate trips
      const baseCost = 7.00;
      const economyBrl = ordersToAssign.length > 1 ? (ordersToAssign.length - 1) * 5.50 : 0;

      results.push({
        driverId: driver.id,
        driverName: driver.name,
        region,
        orderIds,
        economyBrl,
        routeOtimizada: ordersToAssign.map((o) => o.address.split(",")[0])
      });
    }

    return results;
  }

  /**
   * Custom Label Scanner process logic
   * Translates barcode / keyboard wedge values and returns next target lifecycle status
   */
  static processTicketScan(
    scannedCode: string,
    activeOrders: LocalOrder[]
  ): { order: LocalOrder; nextStatus: OrderStatus } | null {
    const cleanCode = scannedCode.trim().toLowerCase();
    if (!cleanCode) return null;

    // Resolve order by matching code (#4820) or raw ID or customer details
    const order = activeOrders.find(
      (o) => o.code.toLowerCase() === cleanCode || 
             o.code.replace("#", "").toLowerCase() === cleanCode ||
             o.id.toLowerCase() === cleanCode
    );

    if (!order) return null;

    // Sequential operational workflow mapping
    const lifecycle: Record<OrderStatus, OrderStatus> = {
      novo: "em_preparo",
      em_preparo: "pronto",
      pronto: "aguardando_entregador",
      aguardando_entregador: "em_rota_coleta",
      em_rota_coleta: "retirado",
      retirado: "em_rota_entrega",
      em_rota_entrega: "entregue",
      entregue: "entregue",
      cancelado: "cancelado"
    };

    const nextStatus = lifecycle[order.status] || "em_preparo";

    return {
      order,
      nextStatus
    };
  }
}
