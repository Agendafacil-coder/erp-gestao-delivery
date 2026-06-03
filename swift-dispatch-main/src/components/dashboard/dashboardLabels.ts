import type { DashboardKpiId } from "@/lib/ops/dashboardMetrics";

export const KPI_LABELS: Record<DashboardKpiId, string> = {
  revenueToday: "Faturamento de hoje",
  ordersToday: "Pedidos de hoje",
  avgTicket: "Ticket médio",
  inProgress: "Pedidos em andamento",
  delayed: "Pedidos atrasados",
  activeDrivers: "Entregadores ativos",
  avgPrepTime: "Tempo médio de preparo",
  avgDeliveryTime: "Tempo médio de entrega",
  estimatedProfit: "Lucro estimado do dia",
  cancellations: "Cancelamentos",
};
