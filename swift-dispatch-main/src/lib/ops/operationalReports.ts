import type { LocalOrder, LocalDriver } from "@/lib/db/localDb";
import type { OrderLineItemDto } from "@/lib/repositories/types";
import { isInDateRange } from "@/lib/finance/calculations";
import type { FinancialDateRange } from "@/lib/finance/types";
import { deliveryDurationMinutes } from "@/lib/drivers/driverStats";
import { peakHoursFromOrders } from "@/lib/ops/orderAnalytics";

export type ReportDatePreset = "today" | "yesterday" | "last7" | "month" | "custom";

export type OperationalDateRange = FinancialDateRange;

export type RankRow = { label: string; orders: number; revenue: number };

export type DailySalesRow = { date: string; orders: number; revenue: number };

export type HourlySalesRow = { hour: string; orders: number; revenue: number };

export type CancelReasonRow = { reason: string; count: number };

export type DriverReportRow = {
  id: string;
  name: string;
  deliveries: number;
  revenue: number;
  avgDeliveryMin: number | null;
};

export type CustomerRow = {
  key: string;
  name: string;
  phone: string;
  orders: number;
  revenue: number;
  lastOrderAt: string;
};

export type OperationalReportsSnapshot = {
  range: OperationalDateRange;
  summary: {
    totalOrders: number;
    deliveredOrders: number;
    revenue: number;
    cancelledOrders: number;
    cancelRatePct: number;
    avgTicket: number;
    avgPrepMin: number | null;
    avgDeliveryMin: number | null;
    recurringCustomers: number;
    inactiveCustomers: number;
  };
  salesByDay: DailySalesRow[];
  salesByHour: HourlySalesRow[];
  salesByProduct: RankRow[];
  salesByCategory: RankRow[];
  salesByNeighborhood: RankRow[];
  cancelledOrders: Array<{
    id: string;
    code: string;
    customer: string;
    total: number;
    placedAt: string;
    channel: string;
  }>;
  cancelReasons: CancelReasonRow[];
  driverPerformance: DriverReportRow[];
  recurringCustomers: CustomerRow[];
  inactiveCustomers: CustomerRow[];
};

/** Dia civil local — evita deslocar a data após 21h em UTC−3. */
function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayIsoDate(): string {
  return toLocalDateKey(new Date());
}

export function yesterdayIsoDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toLocalDateKey(d);
}

export function daysAgoIsoDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return toLocalDateKey(d);
}

export function monthStartIsoDate(): string {
  const d = new Date();
  return toLocalDateKey(new Date(d.getFullYear(), d.getMonth(), 1));
}

export function rangeFromPreset(
  preset: ReportDatePreset,
  custom?: Partial<OperationalDateRange>,
): OperationalDateRange {
  const today = todayIsoDate();
  switch (preset) {
    case "today":
      return { from: today, to: today };
    case "yesterday": {
      const y = yesterdayIsoDate();
      return { from: y, to: y };
    }
    case "last7":
      return { from: daysAgoIsoDate(6), to: today };
    case "month":
      return { from: monthStartIsoDate(), to: today };
    case "custom":
      return {
        from: custom?.from ?? monthStartIsoDate(),
        to: custom?.to ?? today,
      };
  }
}

function orderNeighborhood(o: LocalOrder): string {
  const n = o.neighborhood?.trim();
  if (n) return n;
  const raw = o.address?.trim() || "";
  const first = raw.split(",")[0]?.trim();
  return first || "Sem bairro";
}

function customerKey(o: LocalOrder): string {
  const phone = o.customer_phone?.replace(/\D/g, "") || "";
  if (phone.length >= 8) return `tel:${phone}`;
  return `name:${o.customer_name?.trim().toLowerCase() || o.id}`;
}

function prepDurationMinutes(
  o: LocalOrder & { picked_up_at?: string | null; delivered_at?: string | null },
): number | null {
  if (o.status !== "entregue" || !o.delivered_at) return null;
  const delivered = new Date(o.delivered_at).getTime();
  const placed = new Date(o.placed_at).getTime();
  if (o.picked_up_at) {
    const picked = new Date(o.picked_up_at).getTime();
    return Math.max(1, Math.round((picked - placed) / 60_000));
  }
  const total = Math.max(1, Math.round((delivered - placed) / 60_000));
  return Math.max(1, Math.round(total * 0.55));
}

function normalizeCancelReason(note?: string | null): string {
  const raw = note?.trim();
  if (!raw) return "Não informado";
  const lower = raw.toLowerCase();
  if (lower.includes("estoque") || lower.includes("falta")) return "Sem estoque";
  if (lower.includes("cliente") || lower.includes("desist")) return "Cliente desistiu";
  if (lower.includes("endereço") || lower.includes("endereco") || lower.includes("região"))
    return "Problema de entrega/endereço";
  if (lower.includes("pagamento") || lower.includes("pago")) return "Pagamento";
  if (lower.includes("duplic") || lower.includes("erro")) return "Erro / duplicado";
  if (raw.length > 48) return `${raw.slice(0, 45)}…`;
  return raw;
}

export function filterOrdersByPlacedRange(
  orders: LocalOrder[],
  range: OperationalDateRange,
): LocalOrder[] {
  return orders.filter((o) => isInDateRange(o.placed_at, range));
}

export function computeOperationalReports(input: {
  orders: LocalOrder[];
  drivers: LocalDriver[];
  lineItems: Array<OrderLineItemDto & { order_id?: string }>;
  productToCategory: Map<string, string>;
  cancelNotesByOrderId?: Map<string, string>;
  range: OperationalDateRange;
}): OperationalReportsSnapshot {
  const inRange = filterOrdersByPlacedRange(input.orders, input.range);
  const nonCancelled = inRange.filter((o) => o.status !== "cancelado");
  const delivered = inRange.filter((o) => o.status === "entregue");
  const cancelled = inRange.filter((o) => o.status === "cancelado");

  const revenue = delivered.reduce((acc, o) => acc + (o.total_amount ?? 0), 0);
  const avgTicket = delivered.length > 0 ? revenue / delivered.length : 0;
  const cancelRatePct =
    inRange.length > 0 ? Number(((cancelled.length / inRange.length) * 100).toFixed(1)) : 0;

  const prepSamples = delivered
    .map((o) => prepDurationMinutes(o))
    .filter((m): m is number => m != null);
  const deliverySamples = delivered
    .map((o) => deliveryDurationMinutes(o))
    .filter((m): m is number => m != null);

  const avgPrepMin =
    prepSamples.length > 0
      ? Math.round(prepSamples.reduce((a, b) => a + b, 0) / prepSamples.length)
      : null;
  const avgDeliveryMin =
    deliverySamples.length > 0
      ? Math.round(deliverySamples.reduce((a, b) => a + b, 0) / deliverySamples.length)
      : null;

  const dailyMap = new Map<string, { orders: number; revenue: number }>();
  for (const o of nonCancelled) {
    const date = o.placed_at.slice(0, 10);
    const prev = dailyMap.get(date) ?? { orders: 0, revenue: 0 };
    dailyMap.set(date, {
      orders: prev.orders + 1,
      revenue: prev.revenue + (o.status === "entregue" ? (o.total_amount ?? 0) : 0),
    });
  }
  const salesByDay: DailySalesRow[] = [...dailyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date: formatShortDate(date), orders: v.orders, revenue: v.revenue }));

  const peak = peakHoursFromOrders(nonCancelled);
  const salesByHour: HourlySalesRow[] = peak.map((p) => {
    const hourOrders = nonCancelled.filter(
      (o) => `${new Date(o.placed_at).getHours().toString().padStart(2, "0")}h` === p.hour,
    );
    const hourRevenue = hourOrders
      .filter((o) => o.status === "entregue")
      .reduce((acc, o) => acc + (o.total_amount ?? 0), 0);
    return { hour: p.hour, orders: p.orders, revenue: hourRevenue };
  });

  const orderIdsInRange = new Set(inRange.map((o) => o.id));
  const productTotals = new Map<string, { orders: number; revenue: number }>();
  for (const item of input.lineItems) {
    const orderId = item.order_id;
    if (orderId && !orderIdsInRange.has(orderId)) continue;
    const name = item.name?.trim() || "Item";
    const qty = item.quantity ?? 1;
    const rev = qty * (item.unit_price ?? 0);
    const prev = productTotals.get(name) ?? { orders: 0, revenue: 0 };
    productTotals.set(name, { orders: prev.orders + qty, revenue: prev.revenue + rev });
  }
  if (productTotals.size === 0) {
    for (const o of delivered) {
      const label = `${o.items_count} item(ns)`;
      const prev = productTotals.get(label) ?? { orders: 0, revenue: 0 };
      productTotals.set(label, {
        orders: prev.orders + (o.items_count ?? 1),
        revenue: prev.revenue + (o.total_amount ?? 0),
      });
    }
  }
  const salesByProduct: RankRow[] = [...productTotals.entries()]
    .map(([label, v]) => ({ label, orders: v.orders, revenue: v.revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 12);

  const categoryTotals = new Map<string, { orders: number; revenue: number }>();
  for (const [product, v] of productTotals) {
    const cat = input.productToCategory.get(product) ?? "Outros";
    const prev = categoryTotals.get(cat) ?? { orders: 0, revenue: 0 };
    categoryTotals.set(cat, {
      orders: prev.orders + v.orders,
      revenue: prev.revenue + v.revenue,
    });
  }
  const salesByCategory: RankRow[] = [...categoryTotals.entries()]
    .map(([label, v]) => ({ label, orders: v.orders, revenue: v.revenue }))
    .sort((a, b) => b.revenue - a.revenue);

  const neighborhoodTotals = new Map<string, { orders: number; revenue: number }>();
  for (const o of nonCancelled) {
    const nb = orderNeighborhood(o);
    const prev = neighborhoodTotals.get(nb) ?? { orders: 0, revenue: 0 };
    neighborhoodTotals.set(nb, {
      orders: prev.orders + 1,
      revenue: prev.revenue + (o.status === "entregue" ? (o.total_amount ?? 0) : 0),
    });
  }
  const salesByNeighborhood: RankRow[] = [...neighborhoodTotals.entries()]
    .map(([label, v]) => ({ label, orders: v.orders, revenue: v.revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 12);

  const reasonCounts = new Map<string, number>();
  for (const o of cancelled) {
    const note = input.cancelNotesByOrderId?.get(o.id);
    const reason = normalizeCancelReason(note ?? o.notes);
    reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);
  }
  const cancelReasons: CancelReasonRow[] = [...reasonCounts.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);

  const driverRows: DriverReportRow[] = input.drivers
    .map((d) => {
      const driverOrders = delivered.filter((o) => o.driver_id === d.id);
      const durations = driverOrders
        .map((o) => deliveryDurationMinutes(o))
        .filter((m): m is number => m != null);
      return {
        id: d.id,
        name: d.name,
        deliveries: driverOrders.length,
        revenue: driverOrders.reduce((acc, o) => acc + (o.total_amount ?? 0), 0),
        avgDeliveryMin:
          durations.length > 0
            ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
            : null,
      };
    })
    .filter((d) => d.deliveries > 0)
    .sort((a, b) => b.deliveries - a.deliveries);

  const customerInRange = new Map<string, CustomerRow>();
  for (const o of nonCancelled) {
    const key = customerKey(o);
    const prev = customerInRange.get(key);
    const rev = o.status === "entregue" ? (o.total_amount ?? 0) : 0;
    if (!prev) {
      customerInRange.set(key, {
        key,
        name: o.customer_name,
        phone: o.customer_phone ?? "",
        orders: 1,
        revenue: rev,
        lastOrderAt: o.placed_at,
      });
    } else {
      customerInRange.set(key, {
        ...prev,
        orders: prev.orders + 1,
        revenue: prev.revenue + rev,
        lastOrderAt:
          new Date(o.placed_at) > new Date(prev.lastOrderAt) ? o.placed_at : prev.lastOrderAt,
      });
    }
  }

  const recurringCustomers: CustomerRow[] = [...customerInRange.values()]
    .filter((c) => c.orders >= 2)
    .sort((a, b) => b.orders - a.orders || b.revenue - a.revenue)
    .slice(0, 15);

  const allTimeByCustomer = new Map<string, { lastAt: string; name: string; phone: string }>();
  for (const o of input.orders.filter((x) => x.status !== "cancelado")) {
    const key = customerKey(o);
    const prev = allTimeByCustomer.get(key);
    if (!prev || new Date(o.placed_at) > new Date(prev.lastAt)) {
      allTimeByCustomer.set(key, {
        lastAt: o.placed_at,
        name: o.customer_name,
        phone: o.customer_phone ?? "",
      });
    }
  }
  const activeKeys = new Set(customerInRange.keys());
  const inactiveCustomers: CustomerRow[] = [...allTimeByCustomer.entries()]
    .filter(([key]) => !activeKeys.has(key))
    .map(([key, v]) => ({
      key,
      name: v.name,
      phone: v.phone,
      orders: 0,
      revenue: 0,
      lastOrderAt: v.lastAt,
    }))
    .sort((a, b) => new Date(b.lastOrderAt).getTime() - new Date(a.lastOrderAt).getTime())
    .slice(0, 15);

  return {
    range: input.range,
    summary: {
      totalOrders: inRange.length,
      deliveredOrders: delivered.length,
      revenue,
      cancelledOrders: cancelled.length,
      cancelRatePct,
      avgTicket,
      avgPrepMin,
      avgDeliveryMin,
      recurringCustomers: recurringCustomers.length,
      inactiveCustomers: inactiveCustomers.length,
    },
    salesByDay,
    salesByHour,
    salesByProduct,
    salesByCategory,
    salesByNeighborhood,
    cancelledOrders: cancelled
      .sort((a, b) => new Date(b.placed_at).getTime() - new Date(a.placed_at).getTime())
      .slice(0, 20)
      .map((o) => ({
        id: o.id,
        code: o.code,
        customer: o.customer_name,
        total: o.total_amount ?? 0,
        placedAt: o.placed_at,
        channel: o.channel || "—",
      })),
    cancelReasons,
    driverPerformance: driverRows,
    recurringCustomers,
    inactiveCustomers,
  };
}

function formatShortDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}`;
}
