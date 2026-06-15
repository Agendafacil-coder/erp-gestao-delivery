import { useMemo, useState } from "react";
import { Activity, Copy, Download, Filter, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { downloadAutomationCsv } from "@/components/ops/automations/automationCsv";
import type { AutomationEvent } from "@/lib/ops/detectAutomationEvents";
import { cn } from "@/lib/utils";

type Props = {
  logs: AutomationEvent[];
  selectedRuleId: string;
  onClear?: () => void;
  onExportFullHistory?: () => Promise<Array<AutomationEvent & { atIso?: string }>>;
};

export function AutomationConsole({
  logs,
  selectedRuleId,
  onClear,
  onExportFullHistory,
}: Props) {
  const [consoleFilter, setConsoleFilter] = useState<"selected" | "all">("all");
  const [exportingHistory, setExportingHistory] = useState(false);

  const visibleLogs = useMemo(() => {
    if (consoleFilter === "all") return logs;
    return logs.filter((log) => log.ruleId === selectedRuleId);
  }, [logs, consoleFilter, selectedRuleId]);

  const copyLogs = () => {
    if (visibleLogs.length === 0) {
      toast.message("Nada para copiar");
      return;
    }
    const text = visibleLogs.map((l) => `[${l.at}] ${l.message}`).join("\n");
    void navigator.clipboard.writeText(text).then(
      () => toast.success("Console copiado"),
      () => toast.error("Não foi possível copiar"),
    );
  };

  const exportCsv = () => {
    if (visibleLogs.length === 0) {
      toast.message("Nada para exportar");
      return;
    }
    downloadAutomationCsv(visibleLogs, "sessao");
    toast.success("CSV da sessão baixado");
  };

  const exportFullHistoryCsv = () => {
    if (!onExportFullHistory) return;
    setExportingHistory(true);
    void onExportFullHistory()
      .then((rows) => {
        if (rows.length === 0) {
          toast.message("Nenhum evento no histórico");
          return;
        }
        downloadAutomationCsv(rows, "historico");
        toast.success(`Histórico exportado (${rows.length} eventos)`);
      })
      .catch(() => toast.error("Não foi possível carregar o histórico"))
      .finally(() => setExportingHistory(false));
  };

  return (
    <div className="erp-card flex flex-col min-h-[240px] min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 px-4 py-3 shrink-0">
        <span className="erp-section-label font-semibold text-foreground flex items-center gap-1.5">
          <Activity className="size-3.5 text-accent" />
          Console de execução
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setConsoleFilter((f) => (f === "all" ? "selected" : "all"))}
            className={cn(
              "inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-1 rounded-md border transition",
              consoleFilter === "selected"
                ? "border-primary/40 text-primary bg-primary/10"
                : "border-border text-muted-foreground",
            )}
          >
            <Filter className="size-2.5" />
            {consoleFilter === "selected" ? "Só selecionada" : "Todas"}
          </button>
          <ConsoleAction icon={Copy} label="Copiar" onClick={copyLogs} disabled={visibleLogs.length === 0} />
          <ConsoleAction icon={Download} label="CSV" onClick={exportCsv} disabled={visibleLogs.length === 0} />
          {onExportFullHistory ? (
            <ConsoleAction
              icon={Download}
              label={exportingHistory ? "…" : "Histórico"}
              onClick={exportFullHistoryCsv}
              disabled={exportingHistory}
            />
          ) : null}
          {onClear ? (
            <ConsoleAction icon={Trash2} label="Limpar" onClick={onClear} />
          ) : null}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto font-mono text-[10px] leading-relaxed p-4 space-y-2 bg-black/60 max-h-[320px]">
        {visibleLogs.length === 0 ? (
          <p className="text-muted-foreground text-center py-12 text-[10px] uppercase tracking-wide">
            {consoleFilter === "selected"
              ? "Nenhum evento desta automação na sessão."
              : "Aguardando eventos operacionais…"}
          </p>
        ) : (
          visibleLogs.map((log) => (
            <div
              key={`${log.id}-${log.at}`}
              className={cn(
                "border-b border-white/[0.04] pb-1.5 animate-in fade-in duration-200",
                log.level === "warning"
                  ? "text-warning/90"
                  : log.level === "success"
                    ? "text-[#22c55e]/90"
                    : "text-[#22c55e]/70",
              )}
            >
              <span className="text-muted-foreground">[{log.at}]</span> {log.message}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ConsoleAction({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: typeof Copy;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-1 rounded-md border border-border text-muted-foreground hover:text-foreground transition disabled:opacity-40"
    >
      <Icon className="size-2.5" />
      {label}
    </button>
  );
}
