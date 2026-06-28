import type { OrderStatus } from "@/lib/ops/orderWorkflow";
import { normalizeOrderStatus } from "@/lib/ops/orderWorkflow";

/** Linha do tempo compartilhada — rastreio público e painel interno */
export const TRACKING_TIMELINE_STEPS = [
  { key: "novo", label: "Pedido recebido", short: "Recebido" },
  { key: "em_preparo", label: "Em preparo", short: "Preparo" },
  { key: "aguardando_entregador", label: "Aguardando entregador", short: "Entregador" },
  { key: "em_rota_entrega", label: "Saiu para entrega", short: "Em rota" },
  { key: "entregue", label: "Finalizado", short: "Entregue" },
] as const;

export type TrackingTimelineStep = (typeof TRACKING_TIMELINE_STEPS)[number];

export const TRACKING_STEP_LABELS = TRACKING_TIMELINE_STEPS.map((s) => s.short);

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

export function isTrackingComplete(status: string): boolean {
  return normalizeOrderStatus(status) === "entregue";
}

/** Mensagem principal do hero conforme status */
export function trackingStatusHeadline(status: string): string {
  const norm = normalizeOrderStatus(status);
  switch (norm) {
    case "novo":
      return "Pedido confirmado";
    case "em_preparo":
      return "Preparando seu pedido";
    case "aguardando_entregador":
      return "Aguardando o entregador";
    case "em_rota_entrega":
      return "A caminho do seu endereço";
    case "entregue":
      return "Pedido entregue!";
    case "cancelado":
      return "Pedido cancelado";
    default:
      return "Acompanhe seu pedido";
  }
}

export function trackingStatusSubline(status: string, etaMinutes: number): string {
  const norm = normalizeOrderStatus(status);
  if (norm === "entregue") return "Obrigado pela preferência.";
  if (norm === "cancelado") return "Entre em contato com o restaurante se precisar de ajuda.";
  if (norm === "em_rota_entrega") {
    return etaMinutes > 0 ? `Chegada estimada em ~${etaMinutes} min` : "Seu entregador está quase aí";
  }
  if (norm === "em_preparo") return "A cozinha está trabalhando no seu pedido.";
  if (norm === "aguardando_entregador") return "Em breve um entregador pegará seu pedido.";
  return etaMinutes > 0 ? `Previsão de entrega: ~${etaMinutes} min` : "Atualizamos o status automaticamente.";
}

/** Progresso do SLA (0–100) */
export function trackingSlaProgress(slaMinutes: number, elapsedMinutes: number): number {
  if (slaMinutes <= 0) return 0;
  return Math.min(100, Math.round((elapsedMinutes / slaMinutes) * 100));
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
