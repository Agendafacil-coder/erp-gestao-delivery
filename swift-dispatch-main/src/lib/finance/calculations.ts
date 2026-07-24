import type { LocalOrder } from "@/lib/db/localDb";
import type {
  FinancialDateRange,
  FinancialExpense,
  FinancialCostSetting,
  FinancialSummary,
  PaymentBreakdown,
  PeriodReport,
} from "./types";
import { emptyPaymentBreakdown, normalizePaymentMethod } from "./paymentMethods";
import { estimateCmvFromRevenue } from "./cmvPlaceholder";
import { channelLabel, normalizeOrderChannel } from "@/lib/orders/channels";

export function isCancelledOrder(o: LocalOrder): boolean {
  return o.status === "cancelado";
}

/** Pedido que conta como faturamento — apenas entregues, nunca cancelados */
export function isRevenueOrder(o: LocalOrder): boolean {
  return o.status === "entregue";
}

export function orderRevenueDate(o: LocalOrder): Date {
  return new Date(o.delivered_at ?? o.placed_at);
}

export function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isSameCalendarMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function isInDateRange(iso: string, range: FinancialDateRange): boolean {
  const d = new Date(iso);
  const from = parseLocalDayBound(range.from, false);
  const to = parseLocalDayBound(range.to, true);
  return d >= from && d <= to;
}

/** Interpreta YYYY-MM-DD como dia civil local (evita deslocar 1 dia em UTC−3). */
function parseLocalDayBound(dayOrIso: string, endOfDay: boolean): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayOrIso.trim());
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const day = Number(m[3]);
    return endOfDay
      ? new Date(y, mo, day, 23, 59, 59, 999)
      : new Date(y, mo, day, 0, 0, 0, 0);
  }
  const d = new Date(dayOrIso);
  if (endOfDay) d.setHours(23, 59, 59, 999);
  else d.setHours(0, 0, 0, 0);
  return d;
}

export function filterRevenueOrdersInRange(
  orders: LocalOrder[],
  range: FinancialDateRange,
): LocalOrder[] {
  return orders.filter((o) => {
    if (!isRevenueOrder(o)) return false;
    return isInDateRange(orderRevenueDate(o).toISOString(), range);
  });
}

export function productRevenueFromOrder(o: LocalOrder): number {
  const subtotal = o.subtotal_amount ?? Math.max(0, (o.total_amount ?? 0) - (o.delivery_fee ?? 0));
  return Math.max(0, subtotal - (o.discount_amount ?? 0));
}

export function deliveryFeeFromOrder(o: LocalOrder): number {
  return o.delivery_fee ?? 0;
}

export function isPaidOrder(o: LocalOrder): boolean {
  if (isCancelledOrder(o)) return false;
  if (o.payment_status === "pago") return true;
  if (o.payment_status === "reembolsado" || o.payment_status === "falhou") return false;
  if (isRevenueOrder(o) && o.payment_method === "on_delivery") return true;
  if (isRevenueOrder(o) && normalizePaymentMethod(o.payment_method) === "dinheiro") return true;
  return false;
}

export function isPendingPaymentOrder(o: LocalOrder): boolean {
  if (isCancelledOrder(o)) return false;
  if (o.payment_status === "pago") return false;
  if (o.payment_status === "reembolsado") return false;
  return o.payment_status === "pendente" || !o.payment_status;
}

function sumOrders(orders: LocalOrder[], pick: (o: LocalOrder) => number): number {
  return Number(orders.reduce((acc, o) => acc + pick(o), 0).toFixed(2));
}

export function buildPaymentBreakdown(orders: LocalOrder[]): PaymentBreakdown {
  const breakdown = emptyPaymentBreakdown();
  for (const o of orders) {
    if (!isRevenueOrder(o)) continue;
    const group = normalizePaymentMethod(o.payment_method);
    breakdown[group] += o.total_amount ?? 0;
  }
  return breakdown;
}

export function buildChannelBreakdown(
  orders: LocalOrder[],
): Array<{ channel: string; label: string; revenue: number; orders: number }> {
  const map = new Map<string, { revenue: number; orders: number }>();
  for (const o of orders) {
    if (!isRevenueOrder(o)) continue;
    const channel = normalizeOrderChannel(o.channel);
    const prev = map.get(channel) ?? { revenue: 0, orders: 0 };
    map.set(channel, {
      revenue: prev.revenue + (o.total_amount ?? 0),
      orders: prev.orders + 1,
    });
  }
  return [...map.entries()]
    .map(([channel, v]) => ({
      channel,
      label: channelLabel(channel),
      revenue: Number(v.revenue.toFixed(2)),
      orders: v.orders,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

export type FinanceInputs = {
  orders: LocalOrder[];
  expenses: FinancialExpense[];
  costSettings: FinancialCostSetting[];
  referenceDate?: Date;
  range?: FinancialDateRange;
  /** CMV calculado a partir de unit_cost, ficha técnica ou entradas gravadas */
  cmvOverride?: { total: number; source: "menu" | "estimate" | "recorded" };
};

function prorateMonthlyCost(monthlyAmount: number, range?: FinancialDateRange): number {
  if (!range) return monthlyAmount;
  const from = new Date(range.from);
  const to = new Date(range.to);
  const days = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86400000) + 1);
  return Number(((monthlyAmount / 30) * days).toFixed(2));
}

export function computeFinancialSummary(input: FinanceInputs): FinancialSummary {
  const ref = input.referenceDate ?? new Date();
  const range = input.range ?? {
    from: ref.toISOString().slice(0, 10),
    to: ref.toISOString().slice(0, 10),
  };

  const revenueOrders = filterRevenueOrdersInRange(input.orders, range);
  const dailyOrders = revenueOrders.filter((o) =>
    isSameCalendarDay(orderRevenueDate(o), ref),
  );
  const monthlyOrders = revenueOrders.filter((o) =>
    isSameCalendarMonth(orderRevenueDate(o), ref),
  );

  const dailyRevenue = sumOrders(dailyOrders, (o) => o.total_amount ?? 0);
  const monthlyRevenue = sumOrders(monthlyOrders, (o) => o.total_amount ?? 0);
  const deliveryFeesReceived = sumOrders(revenueOrders, deliveryFeeFromOrder);
  const grossProductRevenue = sumOrders(revenueOrders, productRevenueFromOrder);

  const paidInRange = input.orders.filter(
    (o) =>
      !isCancelledOrder(o) &&
      isPaidOrder(o) &&
      isInDateRange((o.delivered_at ?? o.placed_at), range),
  );
  const pendingInRange = input.orders.filter(
    (o) =>
      !isCancelledOrder(o) &&
      isPendingPaymentOrder(o) &&
      isInDateRange(o.delivered_at ?? o.placed_at, range),
  );

  const rangeExpenses = input.expenses.filter((e) =>
    isInDateRange(e.expense_date, range),
  );
  const manualTotal = Number(
    rangeExpenses
      .filter((e) => e.category === "manual")
      .reduce((a, e) => a + e.amount, 0)
      .toFixed(2),
  );

  const activeCosts = input.costSettings.filter((c) => c.active);
  const fixedCosts = prorateMonthlyCost(
    activeCosts.filter((c) => c.cost_type === "fixed").reduce((a, c) => a + c.amount, 0),
    range,
  );
  const variableCosts = prorateMonthlyCost(
    activeCosts.filter((c) => c.cost_type === "variable").reduce((a, c) => a + c.amount, 0),
    range,
  );

  const expenseFromCategories = Number(
    rangeExpenses.reduce((a, e) => a + e.amount, 0).toFixed(2),
  );
  const totalExpenses = Number(
    (expenseFromCategories + fixedCosts + variableCosts).toFixed(2),
  );
  const periodRevenue = sumOrders(revenueOrders, (o) => o.total_amount ?? 0);
  const cmvTotal = input.cmvOverride?.total ?? estimateCmvFromRevenue(grossProductRevenue);
  const cmvSource = input.cmvOverride?.source ?? "estimate";
  const estimatedProfit = Number((periodRevenue - totalExpenses - cmvTotal).toFixed(2));
  const channelBreakdown = buildChannelBreakdown(revenueOrders);
  const salonRevenue = channelBreakdown
    .filter((c) => c.channel === "salao")
    .reduce((s, c) => s + c.revenue, 0);
  const deliveryRevenue = Number((periodRevenue - salonRevenue).toFixed(2));
  const cancelledInRange = input.orders.filter(
    (o) => isCancelledOrder(o) && isInDateRange(o.placed_at, range),
  );

  return {
    dailyRevenue,
    periodRevenue,
    monthlyRevenue,
    paidOrdersCount: paidInRange.length,
    paidOrdersTotal: sumOrders(paidInRange, (o) => o.total_amount ?? 0),
    pendingOrdersCount: pendingInRange.length,
    pendingOrdersTotal: sumOrders(pendingInRange, (o) => o.total_amount ?? 0),
    deliveryFeesReceived,
    paymentBreakdown: buildPaymentBreakdown(revenueOrders),
    channelBreakdown,
    salonRevenue,
    deliveryRevenue,
    cancelledOrdersCount: cancelledInRange.length,
    cancelledRevenue: sumOrders(cancelledInRange, (o) => o.total_amount ?? 0),
    manualExpenses: manualTotal,
    fixedCosts,
    variableCosts,
    totalExpenses,
    estimatedProfit,
    deliveredOrdersCount: revenueOrders.length,
    cmvTotal,
    cmvSource,
    grossProductRevenue,
  };
}

export function computePeriodReport(input: FinanceInputs): PeriodReport {
  const range = input.range!;
  const summary = computeFinancialSummary(input);
  const byDay = new Map<string, { revenue: number; expenses: number }>();

  const revenueOrders = filterRevenueOrdersInRange(input.orders, range);
  for (const o of revenueOrders) {
    const key = orderRevenueDate(o).toISOString().slice(0, 10);
    const prev = byDay.get(key) ?? { revenue: 0, expenses: 0 };
    byDay.set(key, { revenue: prev.revenue + (o.total_amount ?? 0), expenses: prev.expenses });
  }

  for (const e of input.expenses) {
    if (!isInDateRange(e.expense_date, range)) continue;
    const key = e.expense_date.slice(0, 10);
    const prev = byDay.get(key) ?? { revenue: 0, expenses: 0 };
    byDay.set(key, { revenue: prev.revenue, expenses: prev.expenses + e.amount });
  }

  const dailySeries = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({
      date,
      revenue: Number(v.revenue.toFixed(2)),
      profit: Number((v.revenue - v.expenses).toFixed(2)),
    }));

  return { ...summary, dailySeries };
}

export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
