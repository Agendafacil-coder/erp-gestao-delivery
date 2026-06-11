import { useEffect, useMemo, useState } from "react";
import {
  Bot,
  Download,
  MessageCircle,
  Package,
  RefreshCw,
  Search,
  Shield,
  User,
} from "lucide-react";
import { listAuditTrailFn } from "@/functions/audit";
import { useOps } from "@/hooks/useOps";
import { useTenant } from "@/hooks/useTenant";
import { localDb, type LocalOrderEvent } from "@/lib/db/localDb";
import {
  auditEntriesToCsv,
  computeAuditStats,
  filterAuditEntries,
  formatAuditDateTime,
  mapAutomationToAudit,
  mapOrderEventToAudit,
  SOURCE_FILTER_OPTIONS,
  SOURCE_LABEL,
  uniqueAuditActors,
  type AuditEntry,
  type AuditSourceFilter,
} from "@/lib/ops/auditTrail";
import type { HistoryDateFilter } from "@/lib/ops/historyEvents";
import { USE_POSTGRES } from "@/lib/repositories";
import { OpsPageHeader } from "@/components/ops/OpsPageHeader";
import { OrderDetailPanel } from "@/components/ops/OrderDetailPanel";
import { EmptyState, LoadingState } from "@/components/ops/StateViews";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const DATE_FILTERS: { id: HistoryDateFilter; label: string }[] = [
  { id: "today", label: "Hoje" },
  { id: "yesterday", label: "Ontem" },
  { id: "7days", label: "7 dias" },
  { id: "all", label: "Todos" },
];

const SEVERITY_ROW: Record<AuditEntry["severity"], string> = {
  success: "border-l-success/80",
  warning: "border-l-warning/80",
  error: "border-l-danger/80",
  info: "border-l-primary/60",
};

function SourceIcon({ source }: { source: AuditEntry["source"] }) {
  if (source === "automation") return <Bot className="size-4 text-primary" />;
  if (source === "whatsapp") return <MessageCircle className="size-4 text-success" />;
  return <Package className="size-4 text-muted-foreground" />;
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "success" | "danger" | "warning";
}) {
  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "danger"
        ? "text-danger"
        : tone === "warning"
          ? "text-warning"
          : "text-foreground";
  return (
    <div className="erp-card p-3.5">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("text-2xl font-bold tabular-nums mt-1", toneClass)}>{value}</p>
    </div>
  );
}

export function AuditPanel() {
  const { current } = useTenant();
  const { orders, drivers, automationLogs } = useOps();

  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<HistoryDateFilter>("7days");
  const [sourceFilter, setSourceFilter] = useState<AuditSourceFilter>("all");
  const [actorFilter, setActorFilter] = useState("all");
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);

  const loadEntries = async (tenantId: string) => {
    setLoading(true);
    try {
      if (USE_POSTGRES) {
        const rows = await listAuditTrailFn({ data: { tenantId, limit: 200 } });
        setEntries(rows);
        return;
      }

      const merged: AuditEntry[] = [];
      const orderIds = new Set(orders.map((o) => o.id));
      const local = localDb.get<LocalOrderEvent>("order_events");
      merged.push(
        ...local
          .filter((e) => orderIds.has(e.order_id))
          .map((e) =>
            mapOrderEventToAudit({
              id: e.id,
              orderId: e.order_id,
              orderCode: e.order_code,
              fromStatus: e.from_status,
              toStatus: e.to_status,
              note: e.note,
              createdAt: e.created_at,
              actorName: "Operador local",
            }),
          ),
      );
      merged.push(
        ...automationLogs.map((ev) =>
          mapAutomationToAudit({
            ...ev,
            createdAt: new Date().toISOString(),
          }),
        ),
      );
      merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setEntries(merged);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao carregar auditoria");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!current?.id) return;
    void loadEntries(current.id);
  }, [current?.id, orders.length, automationLogs.length]);

  const actors = useMemo(() => uniqueAuditActors(entries), [entries]);

  const filtered = useMemo(
    () =>
      filterAuditEntries(entries, {
        dateFilter,
        sourceFilter,
        actorFilter,
        search,
      }),
    [entries, dateFilter, sourceFilter, actorFilter, search],
  );

  const stats = useMemo(() => computeAuditStats(entries), [entries]);
  const detailOrder = detailOrderId ? orders.find((o) => o.id === detailOrderId) ?? null : null;

  const handleExport = () => {
    if (filtered.length === 0) {
      toast.info("Nenhum registro para exportar");
      return;
    }
    const csv = auditEntriesToCsv(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `auditoria-${current?.slug ?? "loja"}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`${filtered.length} registro(s) exportado(s)`);
  };

  return (
    <div className="flex flex-col gap-4 min-h-0 lg:h-full">
      <OpsPageHeader
        subtitle="Conformidade"
        icon={Shield}
        iconClassName="text-primary"
        title="Auditoria"
        highlight="& rastreabilidade"
        description="Quem fez o quê: mudanças de pedido, automações e mensagens WhatsApp — com responsável e horário."
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleExport}
              disabled={filtered.length === 0}
              className="erp-btn-secondary text-xs disabled:opacity-50"
            >
              <Download className="size-3.5" />
              Exportar CSV
            </button>
            <button
              type="button"
              onClick={() => current?.id && void loadEntries(current.id)}
              disabled={loading}
              className="erp-btn-secondary text-xs"
            >
              <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
              Atualizar
            </button>
          </div>
        }
        className="shrink-0 pb-0"
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 shrink-0">
        <StatCard label="Registros hoje" value={stats.today} />
        <StatCard label="Responsáveis hoje" value={stats.actorsToday} />
        <StatCard label="Cancelamentos hoje" value={stats.cancellationsToday} tone="danger" />
        <StatCard label="Automações hoje" value={stats.automationsToday} tone="warning" />
        <StatCard label="WhatsApp hoje" value={stats.whatsappToday} tone="success" />
      </div>

      <div className="erp-card overflow-hidden flex flex-col min-h-0 flex-1">
        <div className="shrink-0 p-4 border-b border-border/40 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por pedido, pessoa, ação ou texto…"
              className="pl-9 h-9 text-sm"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="segmented-control overflow-x-auto">
              {DATE_FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  data-active={dateFilter === f.id}
                  onClick={() => setDateFilter(f.id)}
                  className="segmented-item text-xs whitespace-nowrap"
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="segmented-control overflow-x-auto">
              {SOURCE_FILTER_OPTIONS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  data-active={sourceFilter === f.id}
                  onClick={() => setSourceFilter(f.id)}
                  className="segmented-item text-xs whitespace-nowrap"
                >
                  {f.label}
                </button>
              ))}
            </div>
            {actors.length > 1 ? (
              <select
                value={actorFilter}
                onChange={(e) => setActorFilter(e.target.value)}
                className="h-9 rounded-lg border border-border bg-background px-3 text-xs"
              >
                <option value="all">Todos os responsáveis</option>
                {actors.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
        </div>

        {loading ? (
          <LoadingState label="Carregando trilha de auditoria…" className="py-16" />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Shield}
            title="Nenhum registro"
            description="Ajuste os filtros ou aguarde novas ações na operação."
            className="border-0 shadow-none"
          />
        ) : (
          <div className="overflow-auto flex-1 min-h-0">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="sticky top-0 z-10 bg-card/95 backdrop-blur border-b border-border/50">
                <tr className="text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Horário</th>
                  <th className="px-4 py-2.5 font-medium">Origem</th>
                  <th className="px-4 py-2.5 font-medium">Quem</th>
                  <th className="px-4 py-2.5 font-medium">Ação</th>
                  <th className="px-4 py-2.5 font-medium">Pedido</th>
                  <th className="px-4 py-2.5 font-medium">Detalhe</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry) => (
                  <tr
                    key={entry.id}
                    className={cn(
                      "border-b border-border/40 border-l-2 hover:bg-muted/20 transition",
                      SEVERITY_ROW[entry.severity],
                    )}
                  >
                    <td className="px-4 py-3 align-top whitespace-nowrap tabular-nums text-xs text-muted-foreground">
                      {formatAuditDateTime(entry.createdAt)}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                        <SourceIcon source={entry.source} />
                        {SOURCE_LABEL[entry.source]}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-start gap-1.5 min-w-[8rem]">
                        <User className="size-3.5 mt-0.5 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-foreground">{entry.actorName}</p>
                          {entry.actorEmail ? (
                            <p className="text-[10px] text-muted-foreground truncate max-w-[10rem]">
                              {entry.actorEmail}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-xs font-medium text-foreground max-w-[12rem]">
                      {entry.action}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {entry.orderId && entry.orderCode ? (
                        <button
                          type="button"
                          onClick={() => setDetailOrderId(entry.orderId!)}
                          className="text-xs font-semibold text-primary hover:underline tabular-nums"
                        >
                          {entry.orderCode}
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-muted-foreground max-w-[18rem]">
                      <span className="line-clamp-2">{entry.summary}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {detailOrder && current ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/40"
            aria-label="Fechar painel"
            onClick={() => setDetailOrderId(null)}
          />
          <OrderDetailPanel
            order={detailOrder}
            drivers={drivers}
            tenantId={current.id}
            driverName={drivers.find((d) => d.id === detailOrder.driver_id)?.name}
            onClose={() => setDetailOrderId(null)}
          />
        </>
      ) : null}
    </div>
  );
}
