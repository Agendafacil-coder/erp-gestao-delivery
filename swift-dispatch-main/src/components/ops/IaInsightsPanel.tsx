import { Activity, AlertTriangle, Info, Sparkles, Zap } from "lucide-react";
import type { IaInsight } from "@/lib/services/IaOpsService";
import { cn } from "@/lib/utils";

type IaInsightsPanelProps = {
  insights: IaInsight[];
  onDispatchBatch?: () => void;
  onEnableAutoDispatch?: () => void;
  autoDispatchEnabled?: boolean;
  compact?: boolean;
};

const TYPE_STYLES: Record<
  IaInsight["type"],
  { border: string; bg: string; icon: typeof Info; iconClass: string }
> = {
  warning: {
    border: "border-l-warning",
    bg: "bg-warning/[0.04]",
    icon: AlertTriangle,
    iconClass: "text-warning",
  },
  error: {
    border: "border-l-danger",
    bg: "bg-danger/[0.04]",
    icon: AlertTriangle,
    iconClass: "text-danger",
  },
  info: {
    border: "border-l-primary",
    bg: "bg-primary/[0.04]",
    icon: Info,
    iconClass: "text-primary",
  },
  success: {
    border: "border-l-success",
    bg: "bg-success/[0.04]",
    icon: Activity,
    iconClass: "text-success",
  },
};

export function IaInsightsPanel({
  insights,
  onDispatchBatch,
  onEnableAutoDispatch,
  autoDispatchEnabled = false,
  compact = false,
}: IaInsightsPanelProps) {
  if (insights.length === 0) return null;

  return (
    <div className={cn("erp-card", compact ? "p-3" : "")}>
      <div className={cn("erp-card-header", compact && "px-0 pt-0")}>
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="size-4 text-primary" />
          </div>
          <div>
            <div className="font-semibold text-sm leading-none">Insights operacionais</div>
            <p className="text-xs text-muted-foreground mt-1">
              Diagnóstico em tempo real · {insights.length}{" "}
              {insights.length === 1 ? "sinal" : "sinais"}
            </p>
          </div>
        </div>
      </div>

      <div className={cn("space-y-2", compact ? "mt-2" : "px-3 pb-3")}>
        {insights.map((insight) => {
          const style = TYPE_STYLES[insight.type];
          const Icon = style.icon;
          const showDispatch =
            insight.id === "ia-idle-fleet" && !autoDispatchEnabled && onDispatchBatch;
          const showAutoToggle =
            insight.id === "ia-idle-fleet" && !autoDispatchEnabled && onEnableAutoDispatch;

          return (
            <div
              key={insight.id}
              className={cn(
                "rounded-xl border border-border/50 border-l-4 p-3 space-y-2",
                style.border,
                style.bg,
              )}
            >
              <div className="flex items-start gap-2.5">
                <Icon className={cn("size-4 shrink-0 mt-0.5", style.iconClass)} />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">{insight.title}</span>
                    {insight.metric ? (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-muted/60 text-muted-foreground">
                        {insight.metric}
                      </span>
                    ) : null}
                    {insight.actionRequired ? (
                      <span className="text-[10px] font-medium text-danger">Ação recomendada</span>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {insight.description}
                  </p>
                </div>
              </div>

              {showDispatch || showAutoToggle ? (
                <div className="flex flex-wrap gap-2 pl-6">
                  {showDispatch ? (
                    <button
                      type="button"
                      onClick={onDispatchBatch}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90"
                    >
                      <Zap className="size-3.5" />
                      Despachar fila
                    </button>
                  ) : null}
                  {showAutoToggle ? (
                    <button
                      type="button"
                      onClick={onEnableAutoDispatch}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border hover:bg-muted/50"
                    >
                      Ativar despacho automático
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
