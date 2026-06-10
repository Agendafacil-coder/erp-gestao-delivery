import { useMemo } from "react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useDashboardVisibility } from "@/hooks/useDashboardVisibility";
import type { LocalOrder, LocalDriver, LocalAlert } from "@/lib/db/localDb";
import { DashboardKpiGrid } from "@/components/dashboard/DashboardKpiGrid";
import { DashboardVisibilityPicker } from "@/components/dashboard/DashboardVisibilityPicker";
import { RecentOrdersPanel } from "@/components/dashboard/RecentOrdersPanel";
import { OperationalAlertsPanel } from "@/components/dashboard/OperationalAlertsPanel";
import { TopProductsPanel } from "@/components/dashboard/TopProductsPanel";
import { TopRegionsPanel } from "@/components/dashboard/TopRegionsPanel";
import { DriverPerformancePanel } from "@/components/dashboard/DriverPerformancePanel";
import { SalesByHourChart } from "@/components/dashboard/SalesByHourChart";
import { SalesLast7DaysChart } from "@/components/dashboard/SalesLast7DaysChart";
import { DashboardGreeting } from "@/components/dashboard/DashboardGreeting";
import { IaInsightsPanel } from "@/components/ops/IaInsightsPanel";
import { normalizeOrderStatus } from "@/lib/ops/orderWorkflow";
import type { IaInsight } from "@/lib/services/IaOpsService";

type Props = {
  tenantId: string | undefined;
  orders: LocalOrder[];
  drivers: LocalDriver[];
  alerts: LocalAlert[];
  iaInsights?: IaInsight[];
};

export function AdminDashboard({ tenantId, orders, drivers, alerts, iaInsights = [] }: Props) {
  const data = useDashboardData({ tenantId, orders, drivers, alerts });
  const visibility = useDashboardVisibility();

  const visibleKpis = useMemo(
    () => data.kpis.filter((k) => visibility.visibleKpiIds.includes(k.id)),
    [data.kpis, visibility.visibleKpiIds],
  );

  const showRecent = visibility.isSectionVisible("recentOrders");
  const showAlerts = visibility.isSectionVisible("operationalAlerts");
  const showOrdersRow = showRecent || showAlerts;
  const showRankings =
    visibility.isSectionVisible("topProducts") || visibility.isSectionVisible("topRegions");

  const allHidden = visibleKpis.length === 0 && visibility.visibleSectionIds.length === 0;

  const revenueToday = Number(data.kpis.find((k) => k.id === "revenueToday")?.value ?? 0);
  const ordersToday = Number(data.kpis.find((k) => k.id === "ordersToday")?.value ?? 0);
  const pendingKitchen = orders.filter((o) =>
    ["novo", "em_preparo"].includes(normalizeOrderStatus(o.status)),
  ).length;

  return (
    <div className="space-y-4 lg:space-y-6">
      <DashboardGreeting
        revenueToday={revenueToday}
        ordersToday={ordersToday}
        pendingKitchen={pendingKitchen}
      />

      <DashboardVisibilityPicker
        isVisible={visibility.isVisible}
        toggle={visibility.toggle}
        showAll={visibility.showAll}
        resetToDefault={visibility.resetToDefault}
        hiddenCount={visibility.hiddenCount}
      />

      {iaInsights.length > 0 ? <IaInsightsPanel insights={iaInsights} compact /> : null}

      {allHidden ? (
        <div className="rounded-2xl border border-border/50 bg-card shadow-[var(--shadow-card)] p-8 text-center text-muted-foreground">
          <p className="text-sm font-medium text-foreground">Nenhum item visível</p>
          <p className="text-xs mt-1 max-w-sm mx-auto">
            Use &quot;Personalizar painel&quot; ou &quot;Mostrar todos&quot; para exibir indicadores e seções
            novamente.
          </p>
        </div>
      ) : (
        <>
          {visibleKpis.length > 0 ? <DashboardKpiGrid kpis={visibleKpis} /> : null}

          {visibility.isSectionVisible("salesLast7Days") ? (
            <SalesLast7DaysChart data={data.salesLast7Days} />
          ) : null}

          {showOrdersRow ? (
            <div
              className={`grid grid-cols-1 gap-4 ${
                showRecent && showAlerts ? "lg:grid-cols-3" : ""
              }`}
            >
              {showRecent ? (
                <div className={showAlerts ? "lg:col-span-2" : ""}>
                  <RecentOrdersPanel orders={data.recentOrders} />
                </div>
              ) : null}
              {showAlerts ? (
                <div className={showRecent ? "" : "lg:col-span-1"}>
                  <OperationalAlertsPanel alerts={data.operationalAlerts} />
                </div>
              ) : null}
            </div>
          ) : null}

          {visibility.isSectionVisible("salesByHour") ? (
            <SalesByHourChart data={data.salesByHour} />
          ) : null}

          {showRankings ? (
            <div
              className={`grid grid-cols-1 gap-4 ${
                visibility.isSectionVisible("topProducts") &&
                visibility.isSectionVisible("topRegions")
                  ? "md:grid-cols-2"
                  : ""
              }`}
            >
              {visibility.isSectionVisible("topProducts") ? (
                <TopProductsPanel
                  products={data.topProducts}
                  loading={data.lineItemsLoading}
                />
              ) : null}
              {visibility.isSectionVisible("topRegions") ? (
                <TopRegionsPanel regions={data.topRegions} />
              ) : null}
            </div>
          ) : null}

          {visibility.isSectionVisible("driverPerformance") ? (
            <DriverPerformancePanel drivers={data.driverPerformance} />
          ) : null}
        </>
      )}
    </div>
  );
}
