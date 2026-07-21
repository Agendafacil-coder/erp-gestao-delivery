/** Fluxo operacional de pedidos — fonte única de verdade para status e transições */

export type OrderStatus =
  | "novo"
  | "confirmado"
  | "em_preparo"
  | "pronto"
  | "aguardando_entregador"
  | "em_rota_entrega"
  | "entregue"
  | "cancelado";

/** Status legados ainda presentes no banco — normalizados na leitura */
export type LegacyOrderStatus = "em_rota_coleta" | "retirado";

export type OrderAction =
  | "enviar_cozinha"
  | "finalizar_preparo"
  | "atribuir_entregador"
  | "retirei_pedido"
  | "saiu_entrega"
  | "entregue"
  | "cancelar";

/** Todos os status (inclui legados do enum PostgreSQL) */
export const ORDER_STATUSES: OrderStatus[] = [
  "novo",
  "confirmado",
  "em_preparo",
  "pronto",
  "aguardando_entregador",
  "em_rota_entrega",
  "entregue",
  "cancelado",
];

/** Colunas do kanban — fluxo operacional + finalizado */
export const FLOW_KANBAN_COLUMNS: OrderStatus[] = [
  "novo",
  "em_preparo",
  "aguardando_entregador",
  "em_rota_entrega",
  "entregue",
];

export const KANBAN_COLUMNS: OrderStatus[] = FLOW_KANBAN_COLUMNS;

export const TERMINAL_ORDER_STATUSES = [
  "entregue",
  "cancelado",
] as const satisfies readonly OrderStatus[];

/** Colunas visíveis no quadro kanban */
export const ACTIVE_KANBAN_COLUMNS: OrderStatus[] = FLOW_KANBAN_COLUMNS;

const TERMINAL: OrderStatus[] = [...TERMINAL_ORDER_STATUSES];

/** Transições permitidas por status atual (confirmado/pronto só para legado) */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  novo: ["em_preparo", "cancelado"],
  confirmado: ["em_preparo", "cancelado"],
  em_preparo: ["aguardando_entregador", "cancelado"],
  pronto: ["aguardando_entregador", "cancelado"],
  aguardando_entregador: ["em_rota_entrega", "cancelado"],
  em_rota_entrega: ["entregue", "cancelado"],
  entregue: [],
  cancelado: [],
};

export const ACTION_LABEL: Record<OrderAction, string> = {
  enviar_cozinha: "Iniciar preparo",
  finalizar_preparo: "Finalizar preparo",
  atribuir_entregador: "Atribuir entregador",
  retirei_pedido: "Retirei o pedido",
  saiu_entrega: "Saiu para entrega",
  entregue: "Marcar como finalizado",
  cancelar: "Cancelar pedido",
};

const ACTION_TARGET: Record<OrderAction, OrderStatus> = {
  enviar_cozinha: "em_preparo",
  finalizar_preparo: "aguardando_entregador",
  atribuir_entregador: "aguardando_entregador",
  retirei_pedido: "aguardando_entregador",
  saiu_entrega: "em_rota_entrega",
  entregue: "entregue",
  cancelar: "cancelado",
};

const ACTION_FROM: Partial<Record<OrderAction, OrderStatus[]>> = {
  enviar_cozinha: ["novo"],
  finalizar_preparo: ["em_preparo"],
  atribuir_entregador: ["aguardando_entregador", "em_preparo", "novo"],
  retirei_pedido: ["aguardando_entregador"],
  saiu_entrega: ["aguardando_entregador"],
  entregue: ["em_rota_entrega"],
};

/** Mapeia status legados do banco para o fluxo atual */
export function normalizeOrderStatus(status: string): OrderStatus {
  const map: Record<string, OrderStatus> = {
    novo: "novo",
    confirmado: "em_preparo",
    em_preparo: "em_preparo",
    pronto: "aguardando_entregador",
    aguardando_entregador: "aguardando_entregador",
    em_rota_entrega: "em_rota_entrega",
    entregue: "entregue",
    cancelado: "cancelado",
    em_rota_coleta: "aguardando_entregador",
    retirado: "em_rota_entrega",
  };
  return map[status] ?? "novo";
}

/**
 * Fluxo do salão (rodadas de comanda) — nunca passa por entregador.
 * novo → em_preparo → entregue (servido na mesa). Não altera o fluxo de delivery.
 */
export const DINE_IN_ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  novo: ["em_preparo", "cancelado"],
  confirmado: ["em_preparo", "cancelado"],
  em_preparo: ["entregue", "cancelado"],
  pronto: ["entregue", "cancelado"],
  aguardando_entregador: ["entregue", "cancelado"],
  em_rota_entrega: ["entregue", "cancelado"],
  entregue: [],
  cancelado: [],
};

export function assertValidDineInTransition(from: OrderStatus, to: OrderStatus): void {
  const fromNorm = normalizeOrderStatus(from);
  const toNorm = normalizeOrderStatus(to);
  if (fromNorm === toNorm) return;
  if (!DINE_IN_ALLOWED_TRANSITIONS[fromNorm]?.includes(toNorm)) {
    throw new Error(
      `Transição inválida no salão: não é possível ir de "${STATUS_LABEL[fromNorm]}" para "${STATUS_LABEL[toNorm]}".`,
    );
  }
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  if (from === to) return true;
  const fromNorm = normalizeOrderStatus(from);
  const toNorm = normalizeOrderStatus(to);
  return ALLOWED_TRANSITIONS[fromNorm]?.includes(toNorm) ?? false;
}

export function assertValidTransition(from: OrderStatus, to: OrderStatus): void {
  const fromNorm = normalizeOrderStatus(from);
  const toNorm = normalizeOrderStatus(to);
  if (fromNorm === toNorm) return;
  if (!canTransition(fromNorm, toNorm)) {
    throw new Error(
      `Transição inválida: não é possível ir de "${STATUS_LABEL[fromNorm]}" para "${STATUS_LABEL[toNorm]}".`,
    );
  }
}

export function getActionTargetStatus(action: OrderAction): OrderStatus {
  if (action === "retirei_pedido") return "aguardando_entregador";
  return ACTION_TARGET[action];
}

export function canApplyAction(
  status: OrderStatus,
  action: OrderAction,
  opts?: { hasDriver?: boolean; pickedUp?: boolean },
): boolean {
  const norm = normalizeOrderStatus(status);
  if (TERMINAL.includes(norm)) return false;

  if (action === "cancelar") return !TERMINAL.includes(norm);

  const allowedFrom = ACTION_FROM[action];
  if (!allowedFrom?.includes(norm)) return false;

  if (action === "saiu_entrega" && (!opts?.hasDriver || !opts?.pickedUp)) return false;
  if (action === "retirei_pedido" && (!opts?.hasDriver || opts?.pickedUp)) return false;
  if (action === "atribuir_entregador" && opts?.hasDriver) return true;

  return true;
}

export function getAvailableActions(
  status: OrderStatus,
  opts?: { hasDriver?: boolean; pickedUp?: boolean; canAssignDriver?: boolean },
): OrderAction[] {
  const norm = normalizeOrderStatus(status);
  const actions: OrderAction[] = [];

  if (canApplyAction(norm, "enviar_cozinha")) actions.push("enviar_cozinha");
  if (canApplyAction(norm, "finalizar_preparo")) actions.push("finalizar_preparo");
  if (opts?.canAssignDriver !== false && canApplyAction(norm, "atribuir_entregador", opts)) {
    actions.push("atribuir_entregador");
  }
  if (canApplyAction(norm, "retirei_pedido", opts)) actions.push("retirei_pedido");
  if (canApplyAction(norm, "saiu_entrega", opts)) actions.push("saiu_entrega");
  if (canApplyAction(norm, "entregue")) actions.push("entregue");
  if (canApplyAction(norm, "cancelar")) actions.push("cancelar");

  return actions;
}

/** Próximo status na leitura de etiqueta (fluxo linear) */
export function nextStatusFromScan(status: OrderStatus): OrderStatus | null {
  const chain: Partial<Record<OrderStatus, OrderStatus>> = {
    novo: "em_preparo",
    em_preparo: "aguardando_entregador",
    aguardando_entregador: "em_rota_entrega",
    em_rota_entrega: "entregue",
  };
  const norm = normalizeOrderStatus(status);
  return chain[norm] ?? null;
}

export function getEstimatedDeadline(placedAt: string, slaMinutes: number): Date {
  return new Date(new Date(placedAt).getTime() + slaMinutes * 60_000);
}

export function getElapsedMinutes(placedAt: string, now = Date.now()): number {
  return Math.max(0, Math.floor((now - new Date(placedAt).getTime()) / 60_000));
}

export function isOrderDelayed(placedAt: string, slaMinutes: number, now = Date.now()): boolean {
  return getElapsedMinutes(placedAt, now) > slaMinutes;
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  novo: "Novo",
  confirmado: "Em preparo",
  em_preparo: "Em preparo",
  pronto: "Aguardando entregador",
  aguardando_entregador: "Aguardando entregador",
  em_rota_entrega: "Saiu para entrega",
  entregue: "Finalizado",
  cancelado: "Cancelado",
};

export const KITCHEN_STATUSES: OrderStatus[] = ["novo", "em_preparo"];

export const DRIVER_STATUSES: OrderStatus[] = [
  "aguardando_entregador",
  "em_rota_entrega",
  "entregue",
];

/** Pedidos na fila da cozinha (KDS) */
export function isKitchenActive(status: string): boolean {
  const norm = normalizeOrderStatus(status);
  return norm === "novo" || norm === "em_preparo";
}

/** Pedidos prontos para despacho / retirada pelo entregador */
export function needsDispatch(status: string): boolean {
  const norm = normalizeOrderStatus(status);
  return norm === "aguardando_entregador" || norm === "em_preparo" || norm === "novo";
}

/** Pedido atribuído ao entregador e ainda em andamento */
export function isDriverActiveOrder(status: string): boolean {
  const norm = normalizeOrderStatus(status);
  return norm !== "entregue" && norm !== "cancelado";
}

function startOfTodayMs(now = Date.now()): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Pedido entregue no dia corrente (para exibição operacional). */
export function isDeliveredToday(
  order: { status: string; delivered_at?: string | null; placed_at: string },
  now = Date.now(),
): boolean {
  if (normalizeOrderStatus(order.status) !== "entregue") return false;
  const ref = order.delivered_at ?? order.placed_at;
  const t = new Date(ref).getTime();
  return t >= startOfTodayMs(now) && t <= now;
}

/** Pedidos visíveis no kanban operacional (finalizados só do dia). */
export function shouldShowInKanban(
  order: { status: string; delivered_at?: string | null; placed_at: string },
  now = Date.now(),
): boolean {
  const norm = normalizeOrderStatus(order.status);
  if (norm !== "entregue") return ACTIVE_KANBAN_COLUMNS.includes(norm);
  return isDeliveredToday(order, now);
}
