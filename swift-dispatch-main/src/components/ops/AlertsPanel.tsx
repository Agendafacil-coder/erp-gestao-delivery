import { AlertOctagon, AlertTriangle, Bell, Sparkles, CheckCircle } from "lucide-react";
import { ALERT_COLOR } from "@/lib/ops/mock";
import { useMemo } from "react";
import { useI18n } from "@/hooks/useI18n";
import { useOps } from "@/hooks/useOps";

type AlertsPanelProps = {
  tick: number;
  orders?: any[];
  drivers?: any[];
};

export function AlertsPanel({ tick, orders = [], drivers = [] }: AlertsPanelProps) {
  const { t } = useI18n();
  const { iaInsights } = useOps();

  return (
    <div className="glass rounded-2xl flex flex-col h-[420px] lg:h-[520px]">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-md bg-danger/15 border border-danger/30 flex items-center justify-center">
            <Bell className="size-3.5 text-danger" />
          </div>
          <div>
            <div className="font-display font-semibold leading-none">
              {t("alerts", "title")}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1 uppercase tracking-widest">
              {t("alerts", "subtitle")} · {iaInsights.length} ativos
            </div>
          </div>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground">t+{tick}s</span>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {iaInsights.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
            <CheckCircle className="size-10 text-success/55 mb-2" />
            <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
              {t("common", "allClear")}
            </span>
            <span className="text-[10px] mt-1 max-w-[200px]">
              {t("alerts", "allClearDesc")}
            </span>
          </div>
        ) : (
          iaInsights.map((a) => {
            const Icon = a.type === "error" ? AlertOctagon : a.type === "info" ? Sparkles : AlertTriangle;
            const levelColor = 
              a.type === "error" ? "border-l-danger text-danger" 
              : a.type === "warning" ? "border-l-warning text-warning" 
              : a.type === "info" ? "border-l-accent text-accent" 
              : "border-l-success text-success";
            
            return (
              <div 
                key={a.id} 
                className={`group rounded-lg bg-surface/60 hover:bg-surface-elevated border-l-2 ${levelColor} border border-border pl-3 pr-3 py-2.5 transition-all cursor-pointer ticker`}
              >
                <div className="flex items-start gap-3">
                  <Icon className="size-4 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground leading-tight">{a.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 truncate">{a.description}</div>
                  </div>
                  <span className="text-[9px] font-mono text-muted-foreground/80 px-1 rounded bg-muted border border-border shrink-0 self-center">
                    {a.metric}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="px-4 py-3 border-t border-border flex items-center justify-between">
        <span className="text-xs text-muted-foreground truncate max-w-[160px]">
          {iaInsights.some(a => a.type === "error") ? t("alerts", "actionRequired") : t("alerts", "iaOpsActive")}
        </span>
        <button className="text-xs font-medium px-3 py-1.5 rounded-md border border-primary/40 text-primary-glow hover:bg-primary/15 transition cursor-pointer shrink-0">
          {t("alerts", "showIa")}
        </button>
      </div>
    </div>
  );
}
