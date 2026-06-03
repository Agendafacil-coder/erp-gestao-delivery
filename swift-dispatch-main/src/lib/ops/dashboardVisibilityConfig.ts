import type { DashboardKpiId } from "@/lib/ops/dashboardMetrics";
import { KPI_LABELS } from "@/components/dashboard/dashboardLabels";

export type DashboardSectionId =
  | "recentOrders"
  | "operationalAlerts"
  | "salesByHour"
  | "topProducts"
  | "topRegions"
  | "driverPerformance";

export type DashboardWidgetId = DashboardKpiId | DashboardSectionId;

export const ALL_DASHBOARD_KPI_IDS: DashboardKpiId[] = [
  "revenueToday",
  "ordersToday",
  "avgTicket",
  "inProgress",
  "delayed",
  "activeDrivers",
  "avgPrepTime",
  "avgDeliveryTime",
  "estimatedProfit",
  "cancellations",
];

export const ALL_DASHBOARD_SECTION_IDS: DashboardSectionId[] = [
  "recentOrders",
  "operationalAlerts",
  "salesByHour",
  "topProducts",
  "topRegions",
  "driverPerformance",
];

export const ALL_DASHBOARD_WIDGET_IDS: DashboardWidgetId[] = [
  ...ALL_DASHBOARD_KPI_IDS,
  ...ALL_DASHBOARD_SECTION_IDS,
];

export const SECTION_LABELS: Record<DashboardSectionId, string> = {
  recentOrders: "Pedidos recentes",
  operationalAlerts: "Alertas operacionais",
  salesByHour: "Vendas por horário",
  topProducts: "Produtos mais vendidos",
  topRegions: "Bairros e regiões",
  driverPerformance: "Desempenho dos entregadores",
};

export function widgetLabel(id: DashboardWidgetId): string {
  if (ALL_DASHBOARD_SECTION_IDS.includes(id as DashboardSectionId)) {
    return SECTION_LABELS[id as DashboardSectionId];
  }
  return KPI_LABELS[id as DashboardKpiId];
}

const STORAGE_KEY = "delivery_os_dashboard_visibility";

export const DEFAULT_VISIBLE_WIDGETS: DashboardWidgetId[] = [...ALL_DASHBOARD_WIDGET_IDS];

function isValidWidgetId(id: string): id is DashboardWidgetId {
  return ALL_DASHBOARD_WIDGET_IDS.includes(id as DashboardWidgetId);
}

export function loadVisibleDashboardWidgets(): DashboardWidgetId[] {
  if (typeof window === "undefined") return DEFAULT_VISIBLE_WIDGETS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_VISIBLE_WIDGETS;
    const parsed = JSON.parse(raw) as string[];
    const valid = parsed.filter(isValidWidgetId);
    return valid.length > 0 ? valid : DEFAULT_VISIBLE_WIDGETS;
  } catch {
    return DEFAULT_VISIBLE_WIDGETS;
  }
}

export function saveVisibleDashboardWidgets(ids: DashboardWidgetId[]) {
  if (typeof window === "undefined") return;
  const valid = ids.filter(isValidWidgetId);
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(valid.length > 0 ? valid : DEFAULT_VISIBLE_WIDGETS),
  );
}
