import {
  ArrowDownRight,
  ArrowUpRight,
  Activity,
  Clock,
  Bike,
  AlertTriangle,
  DollarSign,
  Timer,
  Flame,
  Settings2,
} from "lucide-react";
import { fmtBRL } from "@/lib/format/currency";
import { useMemo, useState, useEffect } from "react";
import { useI18n } from "@/hooks/useI18n";
import {
  type KpiId,
  ALL_KPI_IDS,
  loadVisibleKpis,
  saveVisibleKpis,
} from "@/lib/ops/kpiConfig";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Kpi = {
  id: KpiId;
  icon: typeof Activity;
  label: string;
  value: string;
  delta: string;
  trend: "up" | "down" | "warn";
  spark: number[];
};

const KPI_LABELS: Record<KpiId, (t: ReturnType<typeof useI18n>["t"]) => string> = {
  active: (t) => t("central", "activeOrders"),
  drivers: (t) => t("central", "onlineDrivers"),
  avgEta: (t) => t("central", "avgEta"),
  delayRate: (t) => t("central", "delayRate"),
  delayed: (t) => t("central", "delayedNow"),
  billing: (t) => t("central", "billing"),
  critical: (t) => t("central", "criticalAlerts"),
};

type KpiStripProps = {
  tick: number;
  orders?: any[];
  drivers?: any[];
};

export function KpiStrip({ tick, orders = [], drivers = [] }: KpiStripProps) {
  const { t } = useI18n();
  const [visibleIds, setVisibleIds] = useState<KpiId[]>(loadVisibleKpis);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    saveVisibleKpis(visibleIds);
  }, [visibleIds]);

  const wobble = (n: number) => Math.round(n + Math.sin(tick / 4 + n) * 0.2);

  const allKpis = useMemo((): Kpi[] => {
    const active = orders.filter((o) => o.status !== "entregue" && o.status !== "cancelado");
    const onlineDrivers = drivers.filter(
      (d) => d.status === "disponivel" || d.status === "em_rota" || d.status === "ocioso",
    );
    const totalDrivers = drivers.length;

    let delayedCount = 0;
    let revenue = 0;

    orders.forEach((o) => {
      if (o.status === "entregue") {
        revenue += Number(o.total_amount ?? 0);
      } else if (o.status !== "cancelado") {
        const placed = new Date(o.placed_at).getTime();
        const elapsed = Math.max(0, Math.floor((Date.now() - placed) / 60000));
        if (elapsed > (o.sla_minutes ?? 40)) delayedCount++;
      }
    });

    const activeCount = active.length;
    const avgEta =
      activeCount > 0 ? Math.round(24 + wobble(delayedCount * 2.5) - onlineDrivers.length * 0.4) : 24;
    const delayRate =
      activeCount > 0 ? ((delayedCount / activeCount) * 100).toFixed(1) : "0.0";
    const alertsCount =
      delayedCount + active.filter((o) => o.priority === "critica").length;

    const defs: Record<KpiId, Omit<Kpi, "id" | "label">> = {
      active: {
        icon: Activity,
        value: `${activeCount}`,
        delta: activeCount > 8 ? "+8%" : "normal",
        trend: "up",
        spark: [3, 5, 4, 7, 6, 8, 9, 8, 9, activeCount],
      },
      drivers: {
        icon: Bike,
        value: `${onlineDrivers.length}/${totalDrivers || 0}`,
        delta: "estável",
        trend: "up",
        spark: [8, 9, 10, 10, 11, 11, 12, 11, 11, onlineDrivers.length],
      },
      avgEta: {
        icon: Timer,
        value: `${avgEta} min`,
        delta: avgEta > 30 ? "+4 min" : "-2 min",
        trend: avgEta > 30 ? "warn" : "down",
        spark: [32, 31, 30, 29, 31, 29, 28, 27, 26, avgEta],
      },
      delayRate: {
        icon: Clock,
        value: `${delayRate}%`,
        delta: Number(delayRate) > 15 ? "+2.4%" : "-1.2%",
        trend: Number(delayRate) > 15 ? "warn" : "down",
        spark: [2, 3, 3, 4, 5, 4, 3, 4, 3, Math.round(Number(delayRate))],
      },
      delayed: {
        icon: Flame,
        value: `${delayedCount}`,
        delta: delayedCount > 3 ? t("central", "highRisk") : t("central", "underControl"),
        trend: delayedCount > 3 ? "warn" : "down",
        spark: [0, 1, 1, 2, 2, 3, 2, 2, 3, delayedCount],
      },
      billing: {
        icon: DollarSign,
        value: fmtBRL(revenue || 0),
        delta: `+R$ ${Math.round(revenue / 4 || 0)}/h`,
        trend: "up",
        spark: [400, 600, 900, 1100, 1200, 1400, 1500, 1800, 2000, revenue || 0],
      },
      critical: {
        icon: AlertTriangle,
        value: `${alertsCount}`,
        delta: alertsCount > 0 ? "urgente" : "ok",
        trend: alertsCount > 0 ? "warn" : "down",
        spark: [0, 1, 1, 0, 1, 2, 1, 1, 2, alertsCount],
      },
    };

    return ALL_KPI_IDS.map((id) => ({
      id,
      label: KPI_LABELS[id](t),
      ...defs[id],
    }));
  }, [orders, drivers, tick, t]);

  const visibleKpis = allKpis.filter((k) => visibleIds.includes(k.id));

  const toggleKpi = (id: KpiId) => {
    setVisibleIds((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((x) => x !== id);
        return next.length > 0 ? next : prev;
      }
      return [...prev, id];
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end">
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 px-2 py-1 rounded-lg border border-border/80 hover:bg-surface/60 transition-colors"
            >
              <Settings2 className="size-3.5" />
              Personalizar indicadores
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56 p-3">
            <p className="text-xs font-medium mb-2">Exibir na dashboard</p>
            <div className="space-y-1.5">
              {allKpis.map((k) => (
                <label
                  key={k.id}
                  className="flex items-center gap-2 text-sm cursor-pointer rounded-md px-2 py-1.5 hover:bg-muted/50"
                >
                  <input
                    type="checkbox"
                    checked={visibleIds.includes(k.id)}
                    onChange={() => toggleKpi(k.id)}
                    className="rounded border-border"
                  />
                  {k.label}
                </label>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">Pelo menos um indicador deve ficar visível.</p>
          </PopoverContent>
        </Popover>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 auto-rows-fr">
        {visibleKpis.map((k) => (
          <div
            key={k.id}
            className="erp-card p-4 relative overflow-hidden min-w-0"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <k.icon className="size-4 text-primary" />
              </div>
              <span
                className={`text-[10px] font-medium flex items-center gap-0.5 px-1.5 py-0.5 rounded-md border shrink-0 ${
                  k.trend === "warn"
                    ? "text-warning border-warning/30 bg-warning/10"
                    : "text-success border-success/30 bg-success/10"
                }`}
              >
                {k.trend === "down" ? (
                  <ArrowDownRight className="size-3" />
                ) : (
                  <ArrowUpRight className="size-3" />
                )}
                {k.delta}
              </span>
            </div>
            <div
              key={`${k.id}-${k.value}`}
              className="mt-3 text-xl lg:text-2xl font-semibold tracking-tight leading-none ticker truncate tabular-nums"
            >
              {k.value}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1.5 truncate">{k.label}</div>
            <Sparkline data={k.spark} id={k.id} />
          </div>
        ))}
      </div>
    </div>
  );
}

function Sparkline({ data, id }: { data: number[]; id: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = Math.max(1, max - min);
  const w = 100;
  const h = 20;
  const pts = data.map((d, i) => `${(i / (data.length - 1)) * w},${h - ((d - min) / range) * h}`).join(" ");
  const fillId = `sparkFill-${id}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-5 mt-2" preserveAspectRatio="none">
      <defs>
        <linearGradient id={fillId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.2" />
          <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={`0,${h} ${pts} ${w},${h}`} fill={`url(#${fillId})`} />
      <polyline
        points={pts}
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
