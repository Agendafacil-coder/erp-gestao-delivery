import { Clock, MapPin, Route, TrendingDown, X } from "lucide-react";
import { fmtBRL } from "@/lib/format/currency";
import type { LastOptimizationSummary } from "@/hooks/useOps";

type DispatchOptimizationSummaryProps = {
  summary: LastOptimizationSummary;
  onDismiss: () => void;
};

export function DispatchOptimizationSummary({
  summary,
  onDismiss,
}: DispatchOptimizationSummaryProps) {
  return (
    <div className="rounded-2xl border border-success/25 bg-success/[0.05] p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="size-9 rounded-xl bg-success/15 flex items-center justify-center shrink-0">
            <Route className="size-4 text-success" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">Despacho em lote concluído</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {summary.assignedOrders} pedido(s) em {summary.totalRoutes} rota(s)
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground shrink-0"
          aria-label="Fechar resumo"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-card/60 border border-border/50 px-2 py-2">
          <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
            <TrendingDown className="size-3" /> Economia
          </div>
          <div className="text-sm font-bold text-success mt-0.5 tabular-nums">
            {fmtBRL(summary.totalSavingsBrl)}
          </div>
        </div>
        <div className="rounded-lg bg-card/60 border border-border/50 px-2 py-2">
          <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
            <Clock className="size-3" /> Tempo
          </div>
          <div className="text-sm font-bold mt-0.5 tabular-nums">
            −{summary.timeSavedMinutes} min
          </div>
        </div>
        <div className="rounded-lg bg-card/60 border border-border/50 px-2 py-2">
          <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
            <MapPin className="size-3" /> Distância
          </div>
          <div className="text-sm font-bold mt-0.5 tabular-nums">−{summary.kmReduced} km</div>
        </div>
      </div>

      {summary.routes.length > 0 ? (
        <ul className="space-y-1.5">
          {summary.routes.map((route) => (
            <li
              key={`${route.driverName}-${route.region}`}
              className="flex items-center justify-between gap-2 text-xs rounded-lg bg-card/50 border border-border/40 px-3 py-2"
            >
              <span className="min-w-0 truncate">
                <span className="font-semibold text-foreground">{route.driverName}</span>
                <span className="text-muted-foreground"> · {route.region}</span>
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {route.orderCount} ped. · {fmtBRL(route.economyBrl)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
