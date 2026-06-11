import { useMemo, useState } from "react";
import { Activity, CheckCircle, Copy, Download, Filter, Server, Trash2, Zap } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { LIVE_AUTOMATIONS } from "@/lib/ops/automationRegistry";
import type { AutomationEvent } from "@/lib/ops/detectAutomationEvents";

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function downloadAutomationCsv(
  logs: Array<AutomationEvent & { atIso?: string }>,
  filenameSuffix = "sessao",
) {
  const header = "timestamp,rule_id,level,message";
  const rows = logs.map((l) =>
    [l.atIso ?? l.at, l.ruleId, l.level, l.message].map(csvEscape).join(","),
  );
  const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `automacoes-${filenameSuffix}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 100);
}

type AutomationsLivePanelProps = {
  automationLogs: AutomationEvent[];
  sseConnected?: boolean;
  onSelect?: (id: string) => void;
  selectedId?: string;
  onClear?: () => void;
  isRuleEnabled?: (ruleId: string) => boolean;
  onToggleRule?: (ruleId: string, enabled: boolean) => void;
  togglesBusy?: boolean;
  onExportFullHistory?: () => Promise<Array<AutomationEvent & { atIso?: string }>>;
};

export function AutomationsLivePanel({
  automationLogs,
  sseConnected = false,
  onSelect,
  selectedId,
  onClear,
  isRuleEnabled,
  onToggleRule,
  togglesBusy = false,
  onExportFullHistory,
}: AutomationsLivePanelProps) {
  const [internalSelected, setInternalSelected] = useState(LIVE_AUTOMATIONS[0]?.id ?? "");
  const [consoleFilter, setConsoleFilter] = useState<"selected" | "all">("all");
  const [exportingHistory, setExportingHistory] = useState(false);
  const activeId = selectedId ?? internalSelected;

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const log of automationLogs) {
      map.set(log.ruleId, (map.get(log.ruleId) ?? 0) + 1);
    }
    return map;
  }, [automationLogs]);

  const lastEventAt = useMemo(() => {
    const map = new Map<string, string>();
    for (const log of automationLogs) {
      if (!map.has(log.ruleId)) map.set(log.ruleId, log.at);
    }
    return map;
  }, [automationLogs]);

  const visibleLogs = useMemo(() => {
    if (consoleFilter === "all") return automationLogs;
    return automationLogs.filter((log) => log.ruleId === activeId);
  }, [automationLogs, consoleFilter, activeId]);

  const copyLogs = () => {
    if (visibleLogs.length === 0) {
      toast.message("Nada para exportar");
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

  const pick = (id: string) => {
    setInternalSelected(id);
    onSelect?.(id);
    setConsoleFilter("selected");
  };

  return (
    <>
      <div className="erp-card p-4 space-y-3">
        <div className="flex justify-between items-center border-b border-border/40 pb-2">
          <span className="erp-section-label font-semibold text-foreground flex items-center gap-1.5">
            <Zap className="size-3.5 text-primary" />
            Automações ativas ({LIVE_AUTOMATIONS.length})
          </span>
          {sseConnected ? (
            <span className="erp-meta text-success flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-success animate-pulse" />
              SSE live
            </span>
          ) : (
            <span className="erp-meta">Polling</span>
          )}
        </div>

        <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
          {LIVE_AUTOMATIONS.map((rule) => {
            const count = counts.get(rule.id) ?? 0;
            const lastAt = lastEventAt.get(rule.id);
            const selected = activeId === rule.id;
            const enabled = isRuleEnabled ? isRuleEnabled(rule.id) : true;
            return (
              <div
                key={rule.id}
                className={`w-full text-left p-3 rounded-xl border flex flex-col gap-1 transition ${
                  selected
                    ? "bg-primary/10 border-primary/45 shadow-glow"
                    : "bg-surface/30 border-border/40 hover:bg-surface/50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => pick(rule.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <h4 className="text-xs font-semibold text-foreground leading-snug">
                      {rule.name}
                    </h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                      {rule.description}
                    </p>
                  </button>
                  <div className="shrink-0 flex flex-col items-end gap-1.5">
                    {onToggleRule ? (
                      <Switch
                        checked={enabled}
                        disabled={togglesBusy}
                        onCheckedChange={(next) => onToggleRule(rule.id, next)}
                        className="scale-75 data-[state=checked]:bg-primary"
                        aria-label={`${rule.name}: ${enabled ? "ligada" : "pausada"}`}
                      />
                    ) : null}
                    <span
                      className={`inline-flex items-center gap-1 text-[9px] font-semibold ${
                        enabled ? "text-success" : "text-muted-foreground"
                      }`}
                    >
                      <CheckCircle className="size-3" />
                      {enabled ? "Ativa" : "Pausada"}
                    </span>
                    {rule.serverSide ? (
                      <span className="inline-flex items-center gap-0.5 text-[8px] text-muted-foreground">
                        <Server className="size-2.5" />
                        server
                      </span>
                    ) : null}
                  </div>
                </div>
                <span className="erp-meta">
                  {count} evento{count !== 1 ? "s" : ""}
                  {lastAt ? ` · último ${lastAt}` : count === 0 ? " · aguardando" : ""}
                  {rule.schedule ? ` · ${rule.schedule}` : ""}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="erp-card p-4 flex-1 flex flex-col min-h-[220px]">
        <div className="border-b border-border/40 pb-2 flex items-center justify-between shrink-0 gap-2">
          <span className="erp-section-label font-semibold text-foreground flex items-center gap-1.5">
            <Activity className="size-3 text-accent animate-pulse" />
            Console de execução
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setConsoleFilter((f) => (f === "all" ? "selected" : "all"))}
              className={`inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-1 rounded-md border transition ${
                consoleFilter === "selected"
                  ? "border-primary/40 text-primary bg-primary/10"
                  : "border-border text-muted-foreground"
              }`}
            >
              <Filter className="size-2.5" />
              {consoleFilter === "selected" ? "Filtrado" : "Todos"}
            </button>
            <button
              type="button"
              onClick={copyLogs}
              disabled={visibleLogs.length === 0}
              className="inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-1 rounded-md border border-border text-muted-foreground hover:text-foreground transition disabled:opacity-40"
            >
              <Copy className="size-2.5" />
              Copiar
            </button>
            <button
              type="button"
              onClick={exportCsv}
              disabled={visibleLogs.length === 0}
              className="inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-1 rounded-md border border-border text-muted-foreground hover:text-foreground transition disabled:opacity-40"
            >
              <Download className="size-2.5" />
              CSV
            </button>
            {onExportFullHistory ? (
              <button
                type="button"
                onClick={exportFullHistoryCsv}
                disabled={exportingHistory}
                className="inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-1 rounded-md border border-border text-muted-foreground hover:text-foreground transition disabled:opacity-40"
              >
                <Download className="size-2.5" />
                {exportingHistory ? "…" : "Histórico"}
              </button>
            ) : null}
            {onClear ? (
              <button
                type="button"
                onClick={onClear}
                className="inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-1 rounded-md border border-border text-muted-foreground hover:text-foreground transition"
              >
                <Trash2 className="size-2.5" />
                Limpar
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto font-mono text-[9px] space-y-2 mt-3 pr-1 bg-black/60 p-3 rounded-lg border border-border/40 max-h-[280px]">
          {visibleLogs.length === 0 ? (
            <div className="text-muted-foreground text-center py-10 uppercase text-[8px]">
              {consoleFilter === "selected"
                ? "Nenhum evento desta automação no histórico."
                : "Aguardando eventos operacionais…"}
            </div>
          ) : (
            visibleLogs.map((log) => (
              <div
                key={`${log.id}-${log.at}`}
                className={`leading-relaxed border-b border-white/[0.03] pb-1 animate-in fade-in duration-200 ${
                  log.level === "warning"
                    ? "text-warning/90"
                    : log.level === "success"
                      ? "text-[#22c55e]/90"
                      : "text-[#22c55e]/70"
                }`}
              >
                <span className="text-muted-foreground">[{log.at}]</span> {log.message}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

export function AutomationFlowDetail({ automationId }: { automationId: string }) {
  const rule = LIVE_AUTOMATIONS.find((r) => r.id === automationId) ?? LIVE_AUTOMATIONS[0];
  if (!rule) return null;

  const steps: Record<string, string[]> = {
    "sla-whatsapp": [
      "A cada 60s verifica pedidos fora do prazo",
      "Se houver atraso → envia WhatsApp ao gerente",
      "Cooldown 30 min por pedido",
    ],
    "geofence-arriving": [
      "Ping GPS do entregador (~15s)",
      "Distância ≤ 500 m ao cliente",
      "WhatsApp driver_arriving (dedupe atômico)",
    ],
    "geofence-arrived": [
      "Ping GPS do entregador",
      "Distância ≤ 100 m → grava arrived_at",
      "Banner no rastreio público",
    ],
    "auto-complete": [
      "Pedido com arrived_at preenchido",
      "Após 3 min → status entregue",
      "CMV + WhatsApp + auditoria",
    ],
    "ifood-poll": [
      "Polling OAuth iFood a cada 30s",
      "Importa novos pedidos e eventos",
      "Requer credenciais na aba iFood",
    ],
    "driver-push": [
      "Pedido atribuído a entregador",
      "Envia Web Push via VAPID (PWA)",
      "Requer VAPID_* no .env",
    ],
    "auto-dispatch": [
      "Auto-dispatch ligado em Configurações",
      "Escolhe entregador com menor carga",
      "Push + WhatsApp ao entregador",
    ],
    "ops-alerts": [
      "Monitora novos pedidos e proximidade",
      "Som + toast na Central/Kanban",
      "Alerta entregadores ociosos com fila",
    ],
    "kitchen-bottleneck": [
      "Conta pedidos em em_preparo",
      "Cruza limiar de Indicadores → Prazos",
      "Registra gargalo no console",
    ],
    "sla-delay": [
      "Compara placed_at + sla_minutes",
      "Dispara ao entrar em atraso",
      "Alimenta alertas operacionais",
    ],
  };

  const flow = steps[rule.id] ?? [rule.description];

  return (
    <div className="erp-card p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{rule.name}</h3>
        <p className="text-xs text-muted-foreground mt-1">{rule.description}</p>
      </div>
      <ol className="space-y-2">
        {flow.map((step, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
            <span className="shrink-0 size-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center">
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
      {rule.schedule ? (
        <p className="text-[10px] font-mono text-muted-foreground border-t border-border/40 pt-3">
          Agendamento: {rule.schedule}
        </p>
      ) : null}
    </div>
  );
}
