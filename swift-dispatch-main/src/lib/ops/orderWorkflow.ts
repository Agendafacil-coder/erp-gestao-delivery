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
  | "confirmar"
  | "enviar_cozinha"
  | "marcar_pronto"
  | "atribuir_entregador"
  | "retirei_pedido"
  | "saiu_entrega"
  | "entregue"
  | "cancelar";

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

export const KANBAN_COLUMNS: OrderStatus[] = ORDER_STATUSES;

export const TERMINAL_ORDER_STATUSES = ["entregue", "cancelado"] as const satisfies readonly OrderStatus[];

/** Colunas ativas no quadro — sem status finais para não poluir o fluxo operacional */
export const ACTIVE_KANBAN_COLUMNS: OrderStatus[] = ORDER_STATUSES.filter(
  (s) => !TERMINAL_ORDER_STATUSES.includes(s as (typeof TERMINAL_ORDER_STATUSES)[number]),
);

const TERMINAL: OrderStatus[] = [...TERMINAL_ORDER_STATUSES];

/** Transições permitidas por status atual */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  novo: ["confirmado", "cancelado"],
  confirmado: ["em_preparo", "cancelado"],
  em_preparo: ["pronto", "cancelado"],
  pronto: ["aguardando_entregador", "cancelado"],
  aguardando_entregador: ["em_rota_entrega", "cancelado"],
  em_rota_entrega: ["entregue", "cancelado"],
  entregue: [],
  cancelado: [],
};

export const ACTION_LABEL: Record<OrderAction, string> = {
  confirmar: "Confirmar pedido",
  enviar_cozinha: "Enviar para cozinha",
  marcar_pronto: "Marcar como pronto",
  atribuir_entregador: "Atribuir entregador",
  retirei_pedido: "Retirei o pedido",
  saiu_entrega: "Saiu para entrega",
  entregue: "Marcar como entregue",
  cancelar: "Cancelar pedido",
};

const ACTION_TARGET: Record<OrderAction, OrderStatus> = {
  confirmar: "confirmado",
  enviar_cozinha: "em_preparo",
  marcar_pronto: "pronto",
  atribuir_entregador: "aguardando_entregador",
  saiu_entrega: "em_rota_entrega",
  entregue: "entregue",
  cancelar: "cancelado",
};

const ACTION_FROM: Partial<Record<OrderAction, OrderStatus[]>> = {
  confirmar: ["novo"],
  enviar_cozinha: ["confirmado"],
  marcar_pronto: ["em_preparo"],
  atribuir_entregador: ["pronto"],
  retirei_pedido: ["aguardando_entregador"],
  saiu_entrega: ["aguardando_entregador"],
  entregue: ["em_rota_entrega"],
};

/** Mapeia status legados do banco para o fluxo atual */
export function normalizeOrderStatus(status: string): OrderStatus {
  const map: Record<string, OrderStatus> = {
    novo: "novo",
    confirmado: "confirmado",
    em_preparo: "em_preparo",
    pronto: "pronto",
    aguardando_entregador: "aguardando_entregador",
    em_rota_entrega: "em_rota_entrega",
    entregue: "entregue",
    cancelado: "cancelado",
    em_rota_coleta: "aguardando_entregador",
    retirado: "em_rota_entrega",
  };
  return map[status] ?? "novo";
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
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
  opts?: { hasDriver?: boolean },
): boolean {
  const norm = normalizeOrderStatus(status);
  if (TERMINAL.includes(norm)) return false;

  if (action === "cancelar") return !TERMINAL.includes(norm);

  const allowedFrom = ACTION_FROM[action];
  if (!allowedFrom?.includes(norm)) return false;

  if (action === "saiu_entrega" && !opts?.hasDriver) return false;
  if (action === "retirei_pedido" && !opts?.hasDriver) return false;
  if (action === "atribuir_entregador" && opts?.hasDriver) return true;

  return true;
}

export function getAvailableActions(
  status: OrderStatus,
  opts?: { hasDriver?: boolean; canAssignDriver?: boolean },
): OrderAction[] {
  const norm = normalizeOrderStatus(status);
  const actions: OrderAction[] = [];

  if (canApplyAction(norm, "confirmar")) actions.push("confirmar");
  if (canApplyAction(norm, "enviar_cozinha")) actions.push("enviar_cozinha");
  if (canApplyAction(norm, "marcar_pronto")) actions.push("marcar_pronto");
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
    novo: "confirmado",
    confirmado: "em_preparo",
    em_preparo: "pronto",
    pronto: "aguardando_entregador",
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
  confirmado: "Confirmado",
  em_preparo: "Em preparo",
  pronto: "Pronto para retirada/entrega",
  aguardando_entregador: "Aguardando entregador",
  em_rota_entrega: "Saiu para entrega",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

export const KITCHEN_STATUSES: OrderStatus[] = ["novo", "confirmado", "em_preparo", "pronto"];

export const DRIVER_STATUSES: OrderStatus[] = [
  "pronto",
  "aguardando_entregador",
  "em_rota_entrega",
  "entregue",
];
