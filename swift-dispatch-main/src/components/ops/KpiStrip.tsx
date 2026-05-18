import { ArrowDownRight, ArrowUpRight, Activity, Clock, Bike, AlertTriangle, DollarSign, Timer, Flame } from "lucide-react";
import { fmtBRL } from "@/lib/ops/mock";
import { useMemo } from "react";
import { useI18n } from "@/hooks/useI18n";

type Kpi = { icon: any; label: string; value: string; delta: string; trend: "up" | "down" | "warn"; spark: number[] };

type KpiStripProps = {
  tick: number;
  orders?: any[];
  drivers?: any[];
};

export function KpiStrip({ tick, orders = [], drivers = [] }: KpiStripProps) {
  const { t } = useI18n();
  const wobble = (n: number) => Math.round(n + Math.sin(tick / 4 + n) * 0.2);

  const kpis = useMemo(() => {
    // Active orders (everything except entregue / cancelado)
    const active = orders.filter((o) => o.status !== "entregue" && o.status !== "cancelado");
    
    // Drivers count
    const onlineDrivers = drivers.filter((d) => d.status === "disponivel" || d.status === "em_rota" || d.status === "ocioso");
    const totalDrivers = drivers.length;

    // Calculate elapsed time and delays
    let totalElapsed = 0;
    let delayedCount = 0;
    let revenue = 0;

    orders.forEach((o) => {
      if (o.status === "entregue") {
        revenue += Number(o.total_amount ?? 0);
      } else if (o.status !== "cancelado") {
        const placed = new Date(o.placed_at).getTime();
        const elapsed = Math.max(0, Math.floor((Date.now() - placed) / 60000));
        totalElapsed += elapsed;
        const sla = o.sla_minutes ?? 40;
        if (elapsed > sla) {
          delayedCount++;
        }
      }
    });

    const activeCount = active.length;
    // Dynamic realistic ETA logic
    const avgEta = activeCount > 0 ? Math.round(24 + wobble(delayedCount * 2.5) - (onlineDrivers.length * 0.4)) : 24;
    const delayRate = activeCount > 0 ? ((delayedCount / activeCount) * 100).toFixed(1) : "0.0";
    const alertsCount = delayedCount + (active.filter(o => o.priority === "critica").length);

    return [
      {
        icon: Activity,
        label: t("central", "activeOrders"),
        value: `${activeCount}`,
        delta: activeCount > 8 ? "+8%" : "normal",
        trend: "up" as const,
        spark: [3, 5, 4, 7, 6, 8, 9, 8, 9, activeCount],
      },
      {
        icon: Bike,
        label: t("central", "onlineDrivers"),
        value: `${onlineDrivers.length}/${totalDrivers || 12}`,
        delta: "estável",
        trend: "up" as const,
        spark: [8, 9, 10, 10, 11, 11, 12, 11, 11, onlineDrivers.length],
      },
      {
        icon: Timer,
        label: t("central", "avgEta"),
        value: `${avgEta} min`,
        delta: avgEta > 30 ? "+4 min" : "-2 min",
        trend: avgEta > 30 ? ("warn" as const) : ("down" as const),
        spark: [32, 31, 30, 29, 31, 29, 28, 27, 26, avgEta],
      },
      {
        icon: Clock,
        label: t("central", "delayRate"),
        value: `${delayRate}%`,
        delta: Number(delayRate) > 15 ? "+2.4%" : "-1.2%",
        trend: Number(delayRate) > 15 ? ("warn" as const) : ("down" as const),
        spark: [2, 3, 3, 4, 5, 4, 3, 4, 3, Math.round(Number(delayRate))],
      },
      {
        icon: Flame,
        label: t("central", "delayedNow"),
        value: `${delayedCount}`,
        delta: delayedCount > 3 ? t("central", "highRisk") : t("central", "underControl"),
        trend: delayedCount > 3 ? ("warn" as const) : ("down" as const),
        spark: [0, 1, 1, 2, 2, 3, 2, 2, 3, delayedCount],
      },
      {
        icon: DollarSign,
        label: t("central", "billing"),
        value: fmtBRL(revenue || 1240),
        delta: `+R$ ${Math.round(revenue / 4 || 310)}/h`,
        trend: "up" as const,
        spark: [400, 600, 900, 1100, 1200, 1400, 1500, 1800, 2000, revenue || 1240],
      },
      {
        icon: AlertTriangle,
        label: t("central", "criticalAlerts"),
        value: `${alertsCount}`,
        delta: alertsCount > 0 ? "urgente" : "ok",
        trend: alertsCount > 0 ? ("warn" as const) : ("down" as const),
        spark: [0, 1, 1, 0, 1, 2, 1, 1, 2, alertsCount],
      },
    ];
  }, [orders, drivers, tick, t]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3 animate-fade-in">
      {kpis.map((k) => (
        <div key={k.label} className="glass rounded-xl p-4 relative overflow-hidden group">
          <div className="absolute inset-x-0 top-0 h-px scan-line opacity-50" />
          <div className="flex items-center justify-between">
            <div className="size-8 rounded-lg bg-surface-elevated border border-border flex items-center justify-center">
              <k.icon className="size-4 text-primary-glow" />
            </div>
            <span className={`text-[10px] font-medium flex items-center gap-0.5 px-1.5 py-0.5 rounded-md border ${
              k.trend === "up" ? "text-success border-success/30 bg-success/10"
              : k.trend === "down" ? "text-success border-success/30 bg-success/10"
              : "text-warning border-warning/30 bg-warning/10"
            }`}>
              {k.trend === "down" ? <ArrowDownRight className="size-3" /> : <ArrowUpRight className="size-3" />}
              {k.delta}
            </span>
          </div>
          <div className="mt-3 text-xl lg:text-2xl font-display font-semibold tracking-tight leading-none font-mono">
            {k.value}
          </div>
          <div className="text-[10px] lg:text-[11px] text-muted-foreground mt-1.5 truncate">{k.label}</div>
          <Sparkline data={k.spark} />
        </div>
      ))}
    </div>
  );
}

function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = Math.max(1, max - min);
  const w = 100, h = 20;
  const pts = data.map((d, i) => `${(i / (data.length - 1)) * w},${h - ((d - min) / range) * h}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-5 mt-2" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparkFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.62 0.21 275)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="oklch(0.62 0.21 275)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={`0,${h} ${pts} ${w},${h}`} fill="url(#sparkFill)" />
      <polyline points={pts} fill="none" stroke="oklch(0.72 0.22 280)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
