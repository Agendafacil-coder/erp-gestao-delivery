import type { OrderStatus } from "@/lib/ops/mock";

/** Rótulos operacionais unificados (PT-BR) */
export const STATUS_LABEL: Record<OrderStatus, string> = {
  novo: "Novo pedido",
  em_preparo: "Em preparo",
  pronto: "Pronto",
  aguardando_entregador: "Aguardando entregador",
  em_rota_coleta: "Coleta em rota",
  retirado: "Retirado",
  em_rota_entrega: "Saiu para entrega",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

/** Classes Tailwind para badge (fundo, texto, borda, ponto) */
export const STATUS_BADGE_CLASS: Record<OrderStatus, string> = {
  novo: "status-badge status-badge--novo",
  em_preparo: "status-badge status-badge--preparo",
  pronto: "status-badge status-badge--pronto",
  aguardando_entregador: "status-badge status-badge--aguardando",
  em_rota_coleta: "status-badge status-badge--rota",
  retirado: "status-badge status-badge--rota",
  em_rota_entrega: "status-badge status-badge--entrega",
  entregue: "status-badge status-badge--entregue",
  cancelado: "status-badge status-badge--cancelado",
};

/** Compatibilidade com código que usa STATUS_COLOR (Tailwind inline) */
export const STATUS_COLOR: Record<OrderStatus, string> = {
  novo: "bg-[var(--status-novo-bg)] text-[var(--status-novo-fg)] border-[var(--status-novo-border)]",
  em_preparo:
    "bg-[var(--status-preparo-bg)] text-[var(--status-preparo-fg)] border-[var(--status-preparo-border)]",
  pronto: "bg-[var(--status-pronto-bg)] text-[var(--status-pronto-fg)] border-[var(--status-pronto-border)]",
  aguardando_entregador:
    "bg-[var(--status-aguardando-bg)] text-[var(--status-aguardando-fg)] border-[var(--status-aguardando-border)]",
  em_rota_coleta:
    "bg-[var(--status-entrega-bg)] text-[var(--status-entrega-fg)] border-[var(--status-entrega-border)]",
  retirado:
    "bg-[var(--status-entrega-bg)] text-[var(--status-entrega-fg)] border-[var(--status-entrega-border)]",
  em_rota_entrega:
    "bg-[var(--status-entrega-bg)] text-[var(--status-entrega-fg)] border-[var(--status-entrega-border)]",
  entregue:
    "bg-[var(--status-entregue-bg)] text-[var(--status-entregue-fg)] border-[var(--status-entregue-border)]",
  cancelado:
    "bg-[var(--status-cancelado-bg)] text-[var(--status-cancelado-fg)] border-[var(--status-cancelado-border)]",
};

export const DELAYED_BADGE_CLASS = "status-badge status-badge--atrasado";

/** Status agrupados para exibição simplificada */
export const DELIVERY_STATUSES: OrderStatus[] = [
  "em_rota_coleta",
  "retirado",
  "em_rota_entrega",
];

export function isOrderDelayed(elapsedMin: number, slaMin: number): boolean {
  return elapsedMin > slaMin;
}

export function slaBarClass(elapsedMin: number, slaMin: number): string {
  const pct = slaMin > 0 ? (elapsedMin / slaMin) * 100 : 0;
  if (pct > 100) return "sla-bar sla-bar--atrasado";
  if (pct > 85) return "sla-bar sla-bar--critico";
  if (pct > 65) return "sla-bar sla-bar--alerta";
  return "sla-bar sla-bar--ok";
}
