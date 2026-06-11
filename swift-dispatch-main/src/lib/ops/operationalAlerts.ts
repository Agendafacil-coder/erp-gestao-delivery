import type { LocalOrder, LocalDriver, LocalAlert } from "@/lib/db/localDb";
import type { OperationalAlertRow } from "@/lib/ops/dashboardMetrics";
import { elapsedMinutes, isOrderDelayed } from "@/lib/ops/dashboardMetrics";
import { TERMINAL_ORDER_STATUSES, normalizeOrderStatus } from "@/lib/ops/orderWorkflow";
import type { OrderStatus } from "@/lib/ops/orderWorkflow";

/** Tipos de alerta operacional — fonte única para regras e UI */
export type OperationalAlertType =
  | "pedido_atrasado"
  | "cozinha_sobrecarregada"
  | "entregador_demorando"
  | "pedido_sem_entregador"
  | "produto_sem_custo"
  | "pedido_cancelado"
  | "cliente_reclamou"
  | "pagamento_pendente";

export type AlertLevel = "low" | "med" | "high" | "crit";

export type OperationalAlert = {
  id: string;
  type: OperationalAlertType;
  level: AlertLevel;
  title: string;
  detail: string;
  agoMin: number;
  orderId?: string;
  orderCode?: string;
};

export type AlertSurface = "dashboard" | "order" | "kitchen";

export type MenuCostItem = {
  id: string;
  name: string;
  unit_cost?: number | null;
};

const KITCHEN_PREP_STATUSES: OrderStatus[] = ["novo", "em_preparo"];
const NEEDS_DRIVER_STATUSES: OrderStatus[] = ["aguardando_entregador"];
const DRIVER_ROUTE_STATUS: OrderStatus = "em_rota_entrega";

function normalizedStatus(order: LocalOrder): OrderStatus {
  return normalizeOrderStatus(order.status);
}

export const ALERT_TYPE_META: Record<
  OperationalAlertType,
  { label: string; kitchenRelevant: boolean }
> = {
  pedido_atrasado: { label: "Pedido atrasado", kitchenRelevant: true },
  cozinha_sobrecarregada: { label: "Cozinha sobrecarregada", kitchenRelevant: true },
  entregador_demorando: { label: "Entregador demorando", kitchenRelevant: false },
  pedido_sem_entregador: { label: "Pedido sem entregador", kitchenRelevant: false },
  produto_sem_custo: { label: "Produto sem custo", kitchenRelevant: false },
  pedido_cancelado: { label: "Pedido cancelado", kitchenRelevant: false },
  cliente_reclamou: { label: "Cliente reclamou", kitchenRelevant: true },
  pagamento_pendente: { label: "Pagamento pendente", kitchenRelevant: false },
};

const THRESHOLDS = {
  kitchenOverload: 5,
  driverSlowMin: 22,
  paymentPendingMin: 8,
  cancelledRecentHours: 3,
  maxDashboard: 14,
  maxPerOrder: 5,
  maxKitchenBanner: 6,
} as const;

const COMPLAINT_PATTERN =
  /\[reclama(ção|cao)\]|reclama(ção|cao)|cliente reclamou|insatisfeito|problema com (o )?pedido/i;

function isTerminal(status: string): boolean {
  return (TERMINAL_ORDER_STATUSES as readonly string[]).includes(normalizeOrderStatus(status));
}

function isComplaint(order: LocalOrder): boolean {
  const notes = order.notes?.trim() ?? "";
  return COMPLAINT_PATTERN.test(notes);
}

function orderDistrict(o: LocalOrder): string {
  const raw = o.address?.trim() || "";
  return raw.split(",")[0]?.trim() || "—";
}

function driverSlow(order: LocalOrder, now: number): boolean {
  if (normalizedStatus(order) !== DRIVER_ROUTE_STATUS || !order.driver_id) return false;
  const elapsed = elapsedMinutes(order.placed_at, now);
  const routeThreshold = Math.max(
    THRESHOLDS.driverSlowMin,
    Math.round((order.sla_minutes ?? 40) * 0.65),
  );
  return elapsed >= routeThreshold;
}

function needsDriver(order: LocalOrder): boolean {
  return NEEDS_DRIVER_STATUSES.includes(normalizedStatus(order)) && !order.driver_id;
}

function paymentPending(order: LocalOrder, now: number): boolean {
  if (order.payment_status !== "pendente" || isTerminal(order.status)) return false;
  if (normalizedStatus(order) === "novo") return false;
  return elapsedMinutes(order.placed_at, now) >= THRESHOLDS.paymentPendingMin;
}

function cancelledRecently(order: LocalOrder, now: number): boolean {
  if (normalizedStatus(order) !== "cancelado") return false;
  const placed = new Date(order.placed_at).getTime();
  const windowMs = THRESHOLDS.cancelledRecentHours * 60 * 60 * 1000;
  return now - placed <= windowMs;
}

/** Gera alertas atômicos (um por pedido quando aplicável) */
export function computeOperationalAlerts(input: {
  orders: LocalOrder[];
  drivers: LocalDriver[];
  storedAlerts?: LocalAlert[];
  menuItems?: MenuCostItem[];
  now?: number;
}): OperationalAlert[] {
  const now = input.now ?? Date.now();
  const orders = input.orders;
  const drivers = input.drivers;
  const stored = input.storedAlerts ?? [];
  const alerts: OperationalAlert[] = [];

  for (const o of orders) {
    if (!isTerminal(o.status) && isOrderDelayed(o, now)) {
      alerts.push({
        id: `delay-${o.id}`,
        type: "pedido_atrasado",
        level: o.priority === "critica" || o.priority === "alta" ? "crit" : "high",
        title: `Pedido atrasado · ${o.code}`,
        detail: `${elapsedMinutes(o.placed_at, now)} min · prazo ${o.sla_minutes} min · ${orderDistrict(o)}`,
        agoMin: 0,
        orderId: o.id,
        orderCode: o.code,
      });
    }

    if (needsDriver(o)) {
      alerts.push({
        id: `no-driver-${o.id}`,
        type: "pedido_sem_entregador",
        level: "high",
        title: `Sem entregador · ${o.code}`,
        detail: `Pronto para sair · ${orderDistrict(o)}`,
        agoMin: 0,
        orderId: o.id,
        orderCode: o.code,
      });
    }

    if (driverSlow(o, now)) {
      alerts.push({
        id: `driver-slow-${o.id}`,
        type: "entregador_demorando",
        level: "med",
        title: `Entrega demorando · ${o.code}`,
        detail: `${elapsedMinutes(o.placed_at, now)} min em rota`,
        agoMin: 0,
        orderId: o.id,
        orderCode: o.code,
      });
    }

    if (paymentPending(o, now)) {
      alerts.push({
        id: `pay-pending-${o.id}`,
        type: "pagamento_pendente",
        level: "med",
        title: `Pagamento pendente · ${o.code}`,
        detail: `${o.payment_method ?? "—"} · ${o.customer_name}`,
        agoMin: elapsedMinutes(o.placed_at, now),
        orderId: o.id,
        orderCode: o.code,
      });
    }

    if (cancelledRecently(o, now)) {
      alerts.push({
        id: `cancelled-${o.id}`,
        type: "pedido_cancelado",
        level: "low",
        title: `Pedido cancelado · ${o.code}`,
        detail: o.customer_name,
        agoMin: elapsedMinutes(o.placed_at, now),
        orderId: o.id,
        orderCode: o.code,
      });
    }

    if (isComplaint(o)) {
      alerts.push({
        id: `complaint-${o.id}`,
        type: "cliente_reclamou",
        level: "high",
        title: `Cliente reclamou · ${o.code}`,
        detail: (o.notes?.trim() ?? "").slice(0, 80),
        agoMin: 0,
        orderId: o.id,
        orderCode: o.code,
      });
    }
  }

  const kitchenLoad = orders.filter((o) =>
    KITCHEN_PREP_STATUSES.includes(normalizedStatus(o)),
  ).length;
  if (kitchenLoad >= THRESHOLDS.kitchenOverload) {
    alerts.push({
      id: "kitchen-overload",
      type: "cozinha_sobrecarregada",
      level: kitchenLoad >= 8 ? "crit" : "high",
      title: "Cozinha sobrecarregada",
      detail: `${kitchenLoad} pedidos em produção`,
      agoMin: 0,
    });
  }

  const menu = input.menuItems ?? [];
  const noCost = menu.filter(
    (m) => m.unit_cost == null || m.unit_cost === undefined || Number(m.unit_cost) <= 0,
  );
  if (noCost.length > 0) {
    const sample = noCost
      .slice(0, 2)
      .map((m) => m.name)
      .join(", ");
    alerts.push({
      id: "menu-no-cost",
      type: "produto_sem_custo",
      level: noCost.length >= 5 ? "high" : "med",
      title: "Produto sem custo cadastrado",
      detail:
        noCost.length > 2
          ? `${noCost.length} itens · ex.: ${sample}`
          : noCost.map((m) => m.name).join(", "),
      agoMin: 0,
    });
  }

  for (const a of stored.slice(0, 4)) {
    const linked = orders.find((o) => a.title.includes(o.code) || a.detail.includes(o.code));
    alerts.push({
      id: `stored-${a.id}`,
      type: inferTypeFromStored(a),
      level: a.level,
      title: a.title,
      detail: a.detail,
      agoMin: a.agoMin ?? 0,
      orderId: linked?.id,
      orderCode: linked?.code,
    });
  }

  return dedupeAndSort(alerts);
}

function inferTypeFromStored(a: LocalAlert): OperationalAlertType {
  const t = `${a.title} ${a.detail}`.toLowerCase();
  if (t.includes("cancel")) return "pedido_cancelado";
  if (t.includes("[reclama") || t.includes("reclam")) return "cliente_reclamou";
  if (t.includes("problema") && t.includes("cozinha")) return "cliente_reclamou";
  if (t.includes("cozinha") || t.includes("produção")) return "cozinha_sobrecarregada";
  if (t.includes("entregador") || t.includes("motorista")) return "pedido_sem_entregador";
  if (t.includes("pagamento") || t.includes("pix")) return "pagamento_pendente";
  if (t.includes("atras") || t.includes("sla")) return "pedido_atrasado";
  return "pedido_atrasado";
}

const LEVEL_RANK: Record<AlertLevel, number> = {
  crit: 4,
  high: 3,
  med: 2,
  low: 1,
};

function dedupeAndSort(alerts: OperationalAlert[]): OperationalAlert[] {
  const seen = new Set<string>();
  return alerts
    .filter((a) => {
      const key = a.orderId ? `${a.type}-${a.orderId}` : a.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => LEVEL_RANK[b.level] - LEVEL_RANK[a.level]);
}

export function filterAlertsForSurface(
  alerts: OperationalAlert[],
  surface: AlertSurface,
  options?: { orderId?: string; kitchenOrderIds?: Set<string> },
): OperationalAlert[] {
  const orderId = options?.orderId;

  if (surface === "order" && orderId) {
    return alerts.filter((a) => a.orderId === orderId).slice(0, THRESHOLDS.maxPerOrder);
  }

  if (surface === "kitchen") {
    const inKitchen = options?.kitchenOrderIds;
    return alerts
      .filter((a) => {
        if (a.type === "cozinha_sobrecarregada") return true;
        if (!ALERT_TYPE_META[a.type].kitchenRelevant || !a.orderId) return false;
        if (!inKitchen?.size) return true;
        return inKitchen.has(a.orderId);
      })
      .slice(0, THRESHOLDS.maxKitchenBanner);
  }

  return alerts.slice(0, THRESHOLDS.maxDashboard);
}

export function getOrderAlerts(
  orders: LocalOrder[],
  drivers: LocalDriver[],
  orderId: string,
  extras?: { menuItems?: MenuCostItem[]; storedAlerts?: LocalAlert[] },
): OperationalAlert[] {
  const all = computeOperationalAlerts({
    orders,
    drivers,
    menuItems: extras?.menuItems,
    storedAlerts: extras?.storedAlerts,
  });
  return filterAlertsForSurface(all, "order", { orderId });
}

export function toDashboardRows(alerts: OperationalAlert[]): OperationalAlertRow[] {
  return alerts.map((a) => ({
    id: a.id,
    level: a.level,
    title: a.title,
    detail: a.detail,
    agoMin: a.agoMin,
    type: a.type,
    orderId: a.orderId,
    orderCode: a.orderCode,
  }));
}

/** Texto curto para badge em cards KDS / tabela */
export function alertShortLabel(type: OperationalAlertType): string {
  return ALERT_TYPE_META[type].label;
}
