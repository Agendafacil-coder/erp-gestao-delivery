import { AlertOctagon, AlertTriangle, Sparkles, CheckCircle } from "lucide-react";
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
          <div className="size-7 rounded-md bg-primary/15 border border-primary/30 flex items-center justify-center">
            <Sparkles className="size-3.5 text-primary-glow" />
          </div>
          <div>
            <div className="font-display font-semibold leading-none">
              {t("alerts", "title")}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {t("alerts", "subtitle")} · {iaInsights.length}{" "}
              {iaInsights.length === 1 ? "item" : "itens"}
            </p>
          </div>
        </div>
        <span className="text-xs text-muted-foreground hidden sm:inline">Ao vivo</span>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {iaInsights.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
            <CheckCircle className="size-10 text-success/55 mb-2" />
            <span className="text-sm font-medium text-foreground">
              {t("common", "allClear")}
            </span>
            <span className="text-[10px] mt-1 max-w-[200px]">
              {t("alerts", "allClearDesc")}
            </span>
          </div>
        ) : (
          iaInsights.map((a, idx) => {
            const Icon = a.type === "error" ? AlertOctagon : a.type === "info" ? Sparkles : AlertTriangle;
            
            // Custom premium glowing styles based on alert gravity
            const levelStyles = 
              a.type === "error" 
                ? "border-l-danger border-danger/30 bg-danger/[0.04] shadow-[0_0_10px_rgba(239,68,68,0.1)] text-danger" 
                : a.type === "warning" 
                  ? "border-l-warning border-warning/30 bg-warning/[0.03] shadow-[0_0_10px_rgba(245,158,11,0.06)] text-warning" 
                  : "border-l-primary border-primary/30 bg-primary/[0.03] shadow-[0_0_10px_rgba(var(--primary-rgb),0.06)] text-primary-glow";
            
            return (
              <div 
                key={a.id} 
                className={`group rounded-lg border-l-[3px] border border-border pl-3 pr-3 py-3 transition-all duration-300 cursor-pointer hover:border-border-strong animate-alert-entry ${levelStyles}`}
                style={{ animationDelay: `${idx * 0.08}s` }}
              >
                <div className="flex items-start gap-3">
                  {/* Pulsing signal status ring */}
                  <div className="relative shrink-0 mt-0.5">
                    <Icon className="size-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-bold text-foreground leading-tight group-hover:text-primary-glow transition-colors">{a.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-2">{a.description}</div>
                  </div>
                  
                  <span className="text-[9px] font-mono text-muted-foreground/90 px-1.5 py-0.5 rounded bg-surface/50 border border-border/80 shrink-0 self-center font-bold">
                    {a.metric}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="px-4 py-3 border-t border-border flex items-center justify-between">
        <span className="text-xs text-muted-foreground truncate max-w-[160px] font-medium">
          {iaInsights.some(a => a.type === "error") ? t("alerts", "actionRequired") : t("alerts", "iaOpsActive")}
        </span>
        <button className="text-xs font-semibold px-3 py-1.5 rounded-md border border-primary/30 text-primary-glow hover:bg-primary/10 transition cursor-pointer shrink-0">
          {t("alerts", "showIa")}
        </button>
      </div>

      {/* Global Alert Entry Keyframes */}
      <style>{`
        @keyframes alert-entry {
          from { opacity: 0; transform: translateX(16px) scale(0.98); }
          to { opacity: 1; transform: translateX(0) scale(1); }
        }
        .animate-alert-entry {
          opacity: 0;
          animation: alert-entry 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}
