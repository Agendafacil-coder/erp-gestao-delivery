import type { OrderStatus } from "@/lib/ops/orderWorkflow";
import { normalizeOrderStatus } from "@/lib/ops/orderWorkflow";

/** Linha do tempo compartilhada — rastreio público e painel interno */
export const TRACKING_TIMELINE_STEPS = [
  { key: "novo", label: "Pedido recebido" },
  { key: "em_preparo", label: "Em preparo" },
  { key: "aguardando_entregador", label: "Aguardando entregador" },
  { key: "em_rota_entrega", label: "Saiu para entrega" },
  { key: "entregue", label: "Finalizado" },
] as const;

export type TrackingTimelineStep = (typeof TRACKING_TIMELINE_STEPS)[number];

export function trackingStageIndex(status: string): number {
  const norm = normalizeOrderStatus(status);
  if (norm === "cancelado") return -1;
  if (norm === "novo") return 0;
  if (norm === "em_preparo") return 1;
  if (norm === "aguardando_entregador") return 2;
  if (norm === "em_rota_entrega") return 3;
  if (norm === "entregue") return 4;
  return 0;
}

export function isTrackingCancelled(status: string): boolean {
  return normalizeOrderStatus(status) === "cancelado";
}

/** ETA simples para exibição (minutos) */
export function estimateTrackingEtaMinutes(
  status: OrderStatus | string,
  slaMinutes: number,
  elapsedMinutes: number,
): number {
  const norm = normalizeOrderStatus(status);
  const raw = Math.max(2, slaMinutes - elapsedMinutes);
  if (norm === "entregue") return 0;
  if (norm === "em_rota_entrega") return Math.min(12, raw);
  if (norm === "aguardando_entregador") return Math.min(18, raw);
  if (norm === "em_preparo") return Math.min(25, raw);
  return raw;
}
