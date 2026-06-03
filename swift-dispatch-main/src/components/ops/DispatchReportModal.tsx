import { Bike, Clock, Coins, MapPin, Route, Sparkles, X } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";

export type DispatchOptimizationResult = {
  totalSavingsBrl: number;
  timeSavedMinutes: number;
  kmReduced: number;
  totalRoutes: number;
  assignedOrders: number;
  routes: Array<{
    driverName: string;
    region: string;
    orderCount: number;
    economyBrl: number;
  }>;
};

type Props = {
  result: DispatchOptimizationResult;
  totalOrders: number;
  onClose: () => void;
};

export function DispatchReportModal({ result, totalOrders, onClose }: Props) {
  const { t } = useI18n();
  const allocationPct = Math.round(
    (result.assignedOrders / Math.max(totalOrders, 1)) * 100,
  );
  const footer = t("central", "dispatchReportFooter").replace("{pct}", String(allocationPct));

  return (
    <div
      className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-[100] p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dispatch-report-title"
      onClick={onClose}
    >
      <div
        className="glass-strong border border-border rounded-2xl p-4 sm:p-6 max-w-lg w-full max-h-[min(92dvh,calc(100dvh-1.5rem))] overflow-y-auto shadow-[var(--shadow-lift)] space-y-4 sm:space-y-5 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="size-10 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0">
              <Sparkles className="size-5 text-primary-glow" />
            </div>
            <div>
              <h2
                id="dispatch-report-title"
                className="font-display text-lg font-semibold text-foreground"
              >
                {t("central", "dispatchReportTitle")}
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {t("central", "dispatchReportSub")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="touch-target rounded-lg border border-border hover:bg-surface flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0"
            aria-label={t("common", "close")}
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <MetricCard
            icon={Coins}
            label={t("central", "dispatchSavings")}
            value={`R$ ${result.totalSavingsBrl.toFixed(2)}`}
            tone="success"
          />
          <MetricCard
            icon={Clock}
            label={t("central", "dispatchTimeSaved")}
            value={`${result.timeSavedMinutes} min`}
            tone="primary"
          />
          <MetricCard
            icon={Route}
            label={t("central", "dispatchKmSaved")}
            value={`${result.kmReduced} km`}
            tone="accent"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-foreground flex items-center gap-1.5">
              <Bike className="size-4 text-muted-foreground" />
              {t("central", "dispatchRoutesTitle")} ({result.totalRoutes})
            </h3>
            <span className="text-xs text-muted-foreground">
              {result.assignedOrders} {t("central", "dispatchOrdersAssigned")}
            </span>
          </div>
          <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
            {result.routes.map((r, i) => (
              <div
                key={`${r.driverName}-${i}`}
                className="flex items-center justify-between p-3 rounded-xl bg-surface/50 border border-border/70 text-sm"
              >
                <div className="min-w-0">
                  <div className="font-medium text-foreground truncate">{r.driverName}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="size-3 shrink-0" />
                    <span className="truncate">{r.region}</span>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <div className="font-semibold tabular-nums">
                    {r.orderCount} {r.orderCount === 1 ? "pedido" : "pedidos"}
                  </div>
                  <div className="text-xs text-success">−R$ {r.economyBrl.toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center border-t border-border/50 pt-3">
          {footer}
        </p>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Coins;
  label: string;
  value: string;
  tone: "success" | "primary" | "accent";
}) {
  const toneClass = {
    success: "border-success/25 bg-success/5",
    primary: "border-primary/25 bg-primary/5",
    accent: "border-accent/25 bg-accent/5",
  }[tone];

  return (
    <div className={`rounded-xl border p-3 text-center ${toneClass}`}>
      <Icon className="size-4 mx-auto mb-1 text-muted-foreground" />
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-base font-semibold font-mono mt-0.5 text-foreground">{value}</div>
    </div>
  );
}
