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
import { StatCard } from "@/components/design/StatCard";

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
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
      {kpis.map((kpi) => {
        const Icon = KPI_ICONS[kpi.id];
        const isWarn = WARN_KPIS.includes(kpi.id) && kpi.value > 0;
        return (
          <StatCard
            key={kpi.id}
            icon={Icon}
            value={kpi.formatted}
            label={KPI_LABELS[kpi.id]}
            hint={kpi.hint}
            variant={isWarn ? "warning" : "default"}
          />
        );
      })}
    </div>
  );
}
