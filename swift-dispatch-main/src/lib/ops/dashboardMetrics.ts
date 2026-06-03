import type { LocalOrder, LocalDriver, LocalAlert } from "@/lib/db/localDb";
import type { OrderLineItemDto } from "@/lib/repositories/types";
import type { OrderStatus } from "@/lib/ops/mock";
import { peakHoursFromOrders } from "@/lib/ops/orderAnalytics";
import {
  DASHBOARD_FINANCE,
  ACTIVE_DRIVER_STATUSES,
  TERMINAL_ORDER_STATUSES,
  PREP_STATUSES,
  DELIVERY_STATUSES,
} from "@/lib/ops/dashboardConfig";

export type DashboardKpiId =
  | "revenueToday"
  | "ordersToday"
  | "avgTicket"
  | "inProgress"
  | "delayed"
  | "activeDrivers"
  | "avgPrepTime"
  | "avgDeliveryTime"
  | "estimatedProfit"
  | "cancellations";

export type DashboardKpi = {
  id: DashboardKpiId;
  value: number;
  formatted: string;
  hint?: string;
};

export type RecentOrderRow = {
  id: string;
  code: string;
  customer: string;
  total: number;
  status: OrderStatus;
  placedAt: string;
  elapsedMin: number;
  isDelayed: boolean;
};

export type OperationalAlertRow = {
  id: string;
  level: "low" | "med" | "high" | "crit";
  title: string;
  detail: string;
  agoMin: number;
};

export type ProductRankRow = {
  name: string;
  quantity: number;
  revenue: number;
};

export type RegionRankRow = {
  region: string;
  orders: number;
  revenue: number;
};

export type DriverPerformanceRow = {
  id: string;
  name: string;
  status: LocalDriver["status"];
  deliveries: number;
  activeOrders: number;
  rating: number;
};

export type HourlySalesRow = {
  hour: string;
  orders: number;
  revenue: number;
};

export type DashboardSnapshot = {
  kpis: DashboardKpi[];
  recentOrders: RecentOrderRow[];
  operationalAlerts: OperationalAlertRow[];
  topProducts: ProductRankRow[];
  topRegions: RegionRankRow[];
  driverPerformance: DriverPerformanceRow[];
  salesByHour: HourlySalesRow[];
  hasOrders: boolean;
};

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isPlacedToday(placedAt: string, now = Date.now()): boolean {
  const placed = new Date(placedAt).getTime();
  return placed >= startOfToday().getTime() && placed <= now;
}

export function elapsedMinutes(placedAt: string, now = Date.now()): number {
  return Math.max(0, Math.floor((now - new Date(placedAt).getTime()) / 60000));
}

export function isOrderDelayed(o: LocalOrder, now = Date.now()): boolean {
  if (TERMINAL_ORDER_STATUSES.includes(o.status as (typeof TERMINAL_ORDER_STATUSES)[number])) {
    return false;
  }
  return elapsedMinutes(o.placed_at, now) > (o.sla_minutes ?? 40);
}

function fmtBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function fmtMinutes(m: number): string {
  if (!m || !Number.isFinite(m)) return "—";
  return `${Math.round(m)} min`;
}

function orderDistrict(o: LocalOrder): string {
  const raw = o.address?.trim() || "";
  const first = raw.split(",")[0]?.trim();
  return first || "Sem região";
}

export function topProductsFromLineItems(
  lineItems: OrderLineItemDto[],
  orderIdsToday: Set<string>,
  ordersById: Map<string, LocalOrder>,
): ProductRankRow[] {
  const totals = new Map<string, { quantity: number; revenue: number }>();
  for (const item of lineItems) {
    const orderId = (item as OrderLineItemDto & { order_id?: string }).order_id;
    if (orderId && !orderIdsToday.has(orderId)) continue;
    const name = item.name?.trim() || "Item";
    const qty = item.quantity ?? 1;
    const rev = qty * (item.unit_price ?? 0);
    const prev = totals.get(name) ?? { quantity: 0, revenue: 0 };
    totals.set(name, { quantity: prev.quantity + qty, revenue: prev.revenue + rev });
  }
  if (totals.size === 0 && ordersById.size > 0) {
    for (const o of ordersById.values()) {
      if (!orderIdsToday.has(o.id)) continue;
      const label = `${o.items_count} item(ns) · ${o.channel || "Pedido"}`;
      const prev = totals.get(label) ?? { quantity: 0, revenue: 0 };
      totals.set(label, {
        quantity: prev.quantity + (o.items_count ?? 1),
        revenue: prev.revenue + (o.total_amount ?? 0),
      });
    }
  }
  return [...totals.entries()]
    .map(([name, v]) => ({ name, quantity: v.quantity, revenue: v.revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);
}

export function buildOperationalAlerts(
  orders: LocalOrder[],
  drivers: LocalDriver[],
  storedAlerts: LocalAlert[],
  now = Date.now(),
): OperationalAlertRow[] {
  const rows: OperationalAlertRow[] = [];

  const delayed = orders.filter((o) => isOrderDelayed(o, now));
  if (delayed.length > 0) {
    rows.push({
      id: "delay-batch",
      level: delayed.length > 3 ? "crit" : "high",
      title: `${delayed.length} pedido(s) fora do SLA`,
      detail: delayed
        .slice(0, 3)
        .map((o) => `${o.code} · ${orderDistrict(o)}`)
        .join(" · "),
      agoMin: 0,
    });
  }

  const kitchenBacklog = orders.filter((o) => o.status === "novo" || o.status === "em_preparo").length;
  if (kitchenBacklog >= 5) {
    rows.push({
      id: "kitchen-backlog",
      level: "high",
      title: "Gargalo na cozinha",
      detail: `${kitchenBacklog} pedidos aguardando produção`,
      agoMin: 2,
    });
  }

  const readyNoDriver = orders.filter(
    (o) => o.status === "pronto" || o.status === "aguardando_entregador",
  ).length;
  const idleDrivers = drivers.filter((d) => d.status === "disponivel").length;
  if (readyNoDriver > 0 && idleDrivers === 0) {
    rows.push({
      id: "no-drivers",
      level: "crit",
      title: "Pedidos prontos sem entregador",
      detail: `${readyNoDriver} aguardando alocação · 0 disponíveis`,
      agoMin: 1,
    });
  }

  for (const a of storedAlerts.slice(0, 6)) {
    rows.push({
      id: a.id,
      level: a.level,
      title: a.title,
      detail: a.detail,
      agoMin: a.agoMin ?? 0,
    });
  }

  const seen = new Set<string>();
  return rows.filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });
}

export function computeDashboardSnapshot(input: {
  orders: LocalOrder[];
  drivers: LocalDriver[];
  alerts?: LocalAlert[];
  lineItems?: Array<OrderLineItemDto & { order_id?: string }>;
  now?: number;
}): DashboardSnapshot {
  const now = input.now ?? Date.now();
  const orders = input.orders;
  const drivers = input.drivers;
  const alerts = input.alerts ?? [];

  const todayOrders = orders.filter((o) => isPlacedToday(o.placed_at, now));
  const todayNonCancelled = todayOrders.filter((o) => o.status !== "cancelado");
  const todayDelivered = todayOrders.filter((o) => o.status === "entregue");
  const todayCancelled = todayOrders.filter((o) => o.status === "cancelado");

  const revenueToday = todayDelivered.reduce((acc, o) => acc + (o.total_amount ?? 0), 0);
  const ordersTodayCount = todayNonCancelled.length;
  const deliveredCount = todayDelivered.length;
  const avgTicket =
    deliveredCount > 0
      ? revenueToday / deliveredCount
      : ordersTodayCount > 0
        ? todayNonCancelled.reduce((a, o) => a + (o.total_amount ?? 0), 0) / ordersTodayCount
        : 0;

  const inProgress = orders.filter(
    (o) => !TERMINAL_ORDER_STATUSES.includes(o.status as (typeof TERMINAL_ORDER_STATUSES)[number]),
  );
  const delayed = orders.filter((o) => isOrderDelayed(o, now));

  const activeDrivers = drivers.filter((d) =>
    (ACTIVE_DRIVER_STATUSES as readonly string[]).includes(d.status),
  );

  const prepSamples = orders
    .filter((o) => (PREP_STATUSES as readonly string[]).includes(o.status))
    .map((o) => elapsedMinutes(o.placed_at, now));
  const deliverySamples = orders
    .filter((o) => (DELIVERY_STATUSES as readonly string[]).includes(o.status))
    .map((o) => {
      const elapsed = elapsedMinutes(o.placed_at, now);
      return o.status === "entregue" ? elapsed : Math.max(8, Math.round(elapsed * 0.55));
    });

  const avgPrep =
    prepSamples.length > 0
      ? prepSamples.reduce((a, b) => a + b, 0) / prepSamples.length
      : 0;
  const avgDelivery =
    deliverySamples.length > 0
      ? deliverySamples.reduce((a, b) => a + b, 0) / deliverySamples.length
      : 0;

  const grossToday = todayNonCancelled.reduce((acc, o) => acc + (o.total_amount ?? 0), 0);
  const profitBase = revenueToday > 0 ? revenueToday : grossToday;
  const estimatedProfit = Math.max(0, profitBase * DASHBOARD_FINANCE.estimatedMarginRate);

  const kpis: DashboardKpi[] = [
    {
      id: "revenueToday",
      value: revenueToday,
      formatted: fmtBRL(revenueToday),
      hint: deliveredCount ? `${deliveredCount} entregue(s)` : "Aguardando entregas",
    },
    {
      id: "ordersToday",
      value: ordersTodayCount,
      formatted: String(ordersTodayCount),
      hint: "Pedidos do dia",
    },
    {
      id: "avgTicket",
      value: avgTicket,
      formatted: fmtBRL(avgTicket),
      hint: deliveredCount ? "Média entregues" : "Média do dia",
    },
    {
      id: "inProgress",
      value: inProgress.length,
      formatted: String(inProgress.length),
      hint: "Em operação agora",
    },
    {
      id: "delayed",
      value: delayed.length,
      formatted: String(delayed.length),
      hint: delayed.length ? "Fora do SLA" : "No prazo",
    },
    {
      id: "activeDrivers",
      value: activeDrivers.length,
      formatted: `${activeDrivers.length}/${drivers.length || 0}`,
      hint: "Online agora",
    },
    {
      id: "avgPrepTime",
      value: avgPrep,
      formatted: fmtMinutes(avgPrep),
      hint: prepSamples.length ? `${prepSamples.length} em preparo` : "Sem amostra",
    },
    {
      id: "avgDeliveryTime",
      value: avgDelivery,
      formatted: fmtMinutes(avgDelivery),
      hint: deliverySamples.length ? `${deliverySamples.length} em rota/entrega` : "Sem amostra",
    },
    {
      id: "estimatedProfit",
      value: estimatedProfit,
      formatted: fmtBRL(estimatedProfit),
      hint: `Margem est. ${Math.round(DASHBOARD_FINANCE.estimatedMarginRate * 100)}%`,
    },
    {
      id: "cancellations",
      value: todayCancelled.length,
      formatted: String(todayCancelled.length),
      hint: "Cancelados hoje",
    },
  ];

  const recentOrders: RecentOrderRow[] = [...orders]
    .sort((a, b) => new Date(b.placed_at).getTime() - new Date(a.placed_at).getTime())
    .slice(0, 8)
    .map((o) => ({
      id: o.id,
      code: o.code,
      customer: o.customer_name,
      total: o.total_amount ?? 0,
      status: o.status,
      placedAt: o.placed_at,
      elapsedMin: elapsedMinutes(o.placed_at, now),
      isDelayed: isOrderDelayed(o, now),
    }));

  const operationalAlerts = buildOperationalAlerts(orders, drivers, alerts, now);

  const orderIdsToday = new Set(todayOrders.map((o) => o.id));
  const ordersById = new Map(orders.map((o) => [o.id, o]));
  const topProducts = topProductsFromLineItems(
    input.lineItems ?? [],
    orderIdsToday,
    ordersById,
  );

  const regionCounts = new Map<string, { orders: number; revenue: number }>();
  for (const o of todayNonCancelled) {
    const region = orderDistrict(o);
    const prev = regionCounts.get(region) ?? { orders: 0, revenue: 0 };
    regionCounts.set(region, {
      orders: prev.orders + 1,
      revenue: prev.revenue + (o.total_amount ?? 0),
    });
  }
  const topRegions: RegionRankRow[] = [...regionCounts.entries()]
    .map(([region, v]) => ({ region, orders: v.orders, revenue: v.revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  const driverPerformance: DriverPerformanceRow[] = drivers
    .map((d) => ({
      id: d.id,
      name: d.name,
      status: d.status,
      deliveries: d.active_orders ?? 0,
      activeOrders: orders.filter(
        (o) =>
          o.driver_id === d.id &&
          !TERMINAL_ORDER_STATUSES.includes(o.status as (typeof TERMINAL_ORDER_STATUSES)[number]),
      ).length,
      rating: d.rating ?? 0,
    }))
    .sort((a, b) => b.activeOrders - a.activeOrders || b.deliveries - a.deliveries)
    .slice(0, 10);

  const peak = peakHoursFromOrders(todayNonCancelled);
  const salesByHour: HourlySalesRow[] = peak.map((p) => {
    const hourOrders = todayNonCancelled.filter(
      (o) => `${new Date(o.placed_at).getHours().toString().padStart(2, "0")}h` === p.hour,
    );
    const revenue = hourOrders.reduce((acc, o) => acc + (o.total_amount ?? 0), 0);
    return { hour: p.hour, orders: p.orders, revenue };
  });

  return {
    kpis,
    recentOrders,
    operationalAlerts,
    topProducts,
    topRegions,
    driverPerformance,
    salesByHour,
    hasOrders: orders.length > 0,
  };
}
