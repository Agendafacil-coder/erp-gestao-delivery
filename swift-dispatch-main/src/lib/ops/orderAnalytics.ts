import type { LocalOrder } from "@/lib/db/localDb";
import { channelLabel } from "@/lib/orders/channels";

const CHANNEL_COLORS: Record<string, string> = {
  iFood: "#ea1d2c",
  WhatsApp: "#25d366",
  site: "#6366f1",
  balcão: "#f59e0b",
};

function orderDistrict(o: LocalOrder): string {
  return o.address?.split(",")[0]?.trim() || "Sem região";
}

function orderHourLabel(iso: string): string {
  const h = new Date(iso).getHours();
  return `${h.toString().padStart(2, "0")}h`;
}

export function sumOrderRevenue(orders: LocalOrder[]): number {
  return orders.reduce((acc, o) => acc + (o.total_amount ?? 0), 0);
}

export function peakHoursFromOrders(orders: LocalOrder[]) {
  const buckets = new Map<string, { orders: number; slaSum: number }>();
  for (const o of orders) {
    const hour = orderHourLabel(o.placed_at);
    const prev = buckets.get(hour) ?? { orders: 0, slaSum: 0 };
    buckets.set(hour, {
      orders: prev.orders + 1,
      slaSum: prev.slaSum + (o.sla_minutes ?? 0),
    });
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([hour, v]) => ({
      hour,
      orders: v.orders,
      avgSla: v.orders ? Math.round(v.slaSum / v.orders) : 0,
    }));
}

export function channelsFromOrders(orders: LocalOrder[]) {
  const totals = new Map<string, number>();
  for (const o of orders) {
    const ch = channelLabel(o.channel);
    totals.set(ch, (totals.get(ch) ?? 0) + (o.total_amount ?? 0));
  }
  return [...totals.entries()].map(([name, value]) => ({
    name,
    value,
    color: CHANNEL_COLORS[name] ?? "#94a3b8",
  }));
}

export function regionsFromOrders(orders: LocalOrder[]) {
  const byRegion = new Map<string, { faturamento: number; count: number }>();
  for (const o of orders) {
    const region = orderDistrict(o);
    const prev = byRegion.get(region) ?? { faturamento: 0, count: 0 };
    byRegion.set(region, {
      faturamento: prev.faturamento + (o.total_amount ?? 0),
      count: prev.count + 1,
    });
  }
  return [...byRegion.entries()]
    .map(([region, v]) => ({
      region,
      faturamento: v.faturamento,
      margem: v.count ? Math.min(45, 18 + v.count * 4) : 0,
      status: v.faturamento > 500 ? "Alta" : v.faturamento > 200 ? "Média" : "Baixa",
    }))
    .sort((a, b) => b.faturamento - a.faturamento);
}

export function hourlyFinancialFromOrders(orders: LocalOrder[]) {
  const buckets = new Map<
    string,
    { faturamento: number; custoEntregador: number; lucro: number; custoAtraso: number }
  >();
  for (const o of orders) {
    const hour = orderHourLabel(o.placed_at);
    const prev = buckets.get(hour) ?? {
      faturamento: 0,
      custoEntregador: 0,
      lucro: 0,
      custoAtraso: 0,
    };
    const total = o.total_amount ?? 0;
    const deliveryCost = total * 0.28;
    const delayCost = o.priority === "critica" || o.priority === "alta" ? total * 0.05 : 0;
    buckets.set(hour, {
      faturamento: prev.faturamento + total,
      custoEntregador: prev.custoEntregador + deliveryCost,
      lucro: prev.lucro + (total - deliveryCost - delayCost),
      custoAtraso: prev.custoAtraso + delayCost,
    });
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([hour, v]) => ({ hour, ...v }));
}
