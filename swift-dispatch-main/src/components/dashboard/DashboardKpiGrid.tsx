import {
  Activity,
  Bike,
  ChefHat,
  CircleX,
  Clock,
  DollarSign,
  Flame,
  Package,
  Receipt,
  TrendingUp,
  Truck,
  type LucideIcon,
} from "lucide-react";
import type { DashboardKpi, DashboardKpiId } from "@/lib/ops/dashboardMetrics";
import { KPI_LABELS } from "@/components/dashboard/dashboardLabels";

const KPI_ICONS: Record<DashboardKpiId, LucideIcon> = {
  revenueToday: DollarSign,
  ordersToday: Package,
  avgTicket: Receipt,
  inProgress: Activity,
  delayed: Flame,
  activeDrivers: Bike,
  avgPrepTime: ChefHat,
  avgDeliveryTime: Truck,
  estimatedProfit: TrendingUp,
  cancellations: CircleX,
};

const WARN_KPIS: DashboardKpiId[] = ["delayed", "cancellations"];

type Props = {
  kpis: DashboardKpi[];
};

export function DashboardKpiGrid({ kpis }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {kpis.map((kpi) => {
        const Icon = KPI_ICONS[kpi.id];
        const isWarn = WARN_KPIS.includes(kpi.id) && kpi.value > 0;
        return (
          <div
            key={kpi.id}
            className="erp-card p-4 min-w-0 flex flex-col gap-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div
                className={`size-9 rounded-lg flex items-center justify-center shrink-0 ${
                  isWarn ? "bg-warning/15" : "bg-primary/10"
                }`}
              >
                <Icon
                  className={`size-4 ${isWarn ? "text-warning" : "text-primary"}`}
                />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-semibold tabular-nums tracking-tight leading-none truncate">
              {kpi.formatted}
            </div>
            <div className="text-[11px] text-muted-foreground leading-snug">
              {KPI_LABELS[kpi.id]}
            </div>
            {kpi.hint ? (
              <div className="text-[10px] text-muted-foreground/80 truncate">
                {kpi.hint}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
