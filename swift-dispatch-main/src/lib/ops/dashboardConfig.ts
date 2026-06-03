/** Parâmetros financeiros estimados (substituir por custos reais quando disponível). */
export const DASHBOARD_FINANCE = {
  estimatedMarginRate: 0.33,
  deliveryCostRate: 0.28,
  delayPenaltyRate: 0.05,
} as const;

export const ACTIVE_DRIVER_STATUSES = ["disponivel", "em_rota"] as const;

export const TERMINAL_ORDER_STATUSES = ["entregue", "cancelado"] as const;

export const PREP_STATUSES = ["confirmado", "em_preparo", "pronto", "aguardando_entregador"] as const;

export const DELIVERY_STATUSES = ["aguardando_entregador", "em_rota_entrega", "entregue"] as const;
