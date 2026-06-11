import type { OrderAuditEvent } from "@/functions/orders";
import type { LocalAlert } from "@/lib/db/localDb";
import { normalizeOrderStatus, STATUS_LABEL, type OrderStatus } from "@/lib/ops/orderWorkflow";

export type HistoryEventKind = "order" | "alert";
export type HistorySeverity = "success" | "warning" | "error" | "info";
export type HistoryCategoryFilter = "all" | "order" | "alert";
export type HistoryDateFilter = "today" | "yesterday" | "7days" | "all";

export type HistoryEvent = {
  id: string;
  kind: HistoryEventKind;
  createdAt: string;
  severity: HistorySeverity;
  title: string;
  summary: string;
  orderId?: string;
  orderCode?: string;
  fromStatus?: OrderStatus | null;
  toStatus?: OrderStatus;
  note?: string | null;
  raw: unknown;
};

function startOfDayMs(offsetDays = 0, now = Date.now()): number {
  const d = new Date(now);
  d.setDate(d.getDate() - offsetDays);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function isInDateFilter(iso: string, filter: HistoryDateFilter, now = Date.now()): boolean {
  const t = new Date(iso).getTime();
  if (filter === "all") return true;
  if (filter === "today") return t >= startOfDayMs(0, now);
  if (filter === "yesterday") {
    return t >= startOfDayMs(1, now) && t < startOfDayMs(0, now);
  }
  return t >= startOfDayMs(6, now);
}

const TRANSITION_SUMMARY: Partial<Record<string, string>> = {
  "novo:em_preparo": "Cozinha iniciou o preparo",
  "em_preparo:aguardando_entregador": "Preparo finalizado — aguardando entregador",
  "aguardando_entregador:em_rota_entrega": "Saiu para entrega",
  "em_rota_entrega:entregue": "Pedido entregue ao cliente",
  "novo:cancelado": "Pedido cancelado",
  "em_preparo:cancelado": "Pedido cancelado durante o preparo",
  "aguardando_entregador:cancelado": "Pedido cancelado antes da entrega",
  "em_rota_entrega:cancelado": "Pedido cancelado em rota",
};

export function describeOrderTransition(
  from: OrderStatus | null | undefined,
  to: OrderStatus,
): string {
  if (!from) return `Pedido registrado como ${STATUS_LABEL[to]}`;
  const key = `${normalizeOrderStatus(from)}:${normalizeOrderStatus(to)}`;
  return TRANSITION_SUMMARY[key] ?? `De ${STATUS_LABEL[normalizeOrderStatus(from)]} para ${STATUS_LABEL[to]}`;
}

function orderSeverity(to: OrderStatus): HistorySeverity {
  if (to === "cancelado") return "error";
  if (to === "entregue") return "success";
  if (to === "em_rota_entrega" || to === "aguardando_entregador") return "info";
  return "info";
}

export function mapOrderAuditEvent(ev: OrderAuditEvent): HistoryEvent {
  const to = normalizeOrderStatus(ev.toStatus);
  const from = ev.fromStatus ? normalizeOrderStatus(ev.fromStatus) : null;
  return {
    id: ev.id,
    kind: "order",
    createdAt: ev.createdAt,
    severity: orderSeverity(to),
    title: ev.orderCode,
    summary: describeOrderTransition(from, to),
    orderId: ev.orderId,
    orderCode: ev.orderCode,
    fromStatus: from,
    toStatus: to,
    note: ev.note,
    raw: ev,
  };
}

export function mapAlertEvent(a: LocalAlert): HistoryEvent {
  const severity: HistorySeverity =
    a.level === "crit" ? "error" : a.level === "high" ? "warning" : a.level === "med" ? "info" : "success";
  return {
    id: `alert-${a.id}`,
    kind: "alert",
    createdAt: a.timestamp,
    severity,
    title: a.title,
    summary: a.detail,
    raw: a,
  };
}

export function filterHistoryEvents(
  events: HistoryEvent[],
  opts: {
    dateFilter: HistoryDateFilter;
    categoryFilter: HistoryCategoryFilter;
    search: string;
    now?: number;
  },
): HistoryEvent[] {
  const q = opts.search.trim().toLowerCase();
  const now = opts.now ?? Date.now();

  return events.filter((ev) => {
    if (!isInDateFilter(ev.createdAt, opts.dateFilter, now)) return false;
    if (opts.categoryFilter !== "all" && ev.kind !== opts.categoryFilter) return false;
    if (!q) return true;
    const hay = [ev.title, ev.summary, ev.orderCode, ev.note].filter(Boolean).join(" ").toLowerCase();
    return hay.includes(q);
  });
}

export type HistoryDayGroup = {
  key: string;
  label: string;
  events: HistoryEvent[];
};

export function groupHistoryByDay(events: HistoryEvent[], now = Date.now()): HistoryDayGroup[] {
  const todayStart = startOfDayMs(0, now);
  const yesterdayStart = startOfDayMs(1, now);
  const groups = new Map<string, HistoryDayGroup>();

  for (const ev of events) {
    const t = new Date(ev.createdAt).getTime();
    let label: string;
    let key: string;
    if (t >= todayStart) {
      label = "Hoje";
      key = "today";
    } else if (t >= yesterdayStart) {
      label = "Ontem";
      key = "yesterday";
    } else {
      const d = new Date(ev.createdAt);
      label = d.toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
      });
      key = d.toISOString().slice(0, 10);
    }
    const existing = groups.get(key);
    if (existing) existing.events.push(ev);
    else groups.set(key, { key, label, events: [ev] });
  }

  return [...groups.values()];
}

export function computeHistoryStats(events: HistoryEvent[], now = Date.now()) {
  const today = events.filter((e) => isInDateFilter(e.createdAt, "today", now));
  return {
    total: events.length,
    today: today.length,
    deliveredToday: today.filter((e) => e.kind === "order" && e.toStatus === "entregue").length,
    cancelledToday: today.filter((e) => e.kind === "order" && e.toStatus === "cancelado").length,
    alertsToday: today.filter((e) => e.kind === "alert").length,
  };
}

export function formatHistoryTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatHistoryDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export const KIND_LABEL: Record<HistoryEventKind, string> = {
  order: "Pedido",
  alert: "Alerta",
};

export const SEVERITY_LABEL: Record<HistorySeverity, string> = {
  success: "Normal",
  warning: "Atenção",
  error: "Crítico",
  info: "Informativo",
};
