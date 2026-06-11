import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCircle2,
  ChevronDown,
  Package,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";
import { listOrderEventsFn } from "@/functions/orders";
import { useOps } from "@/hooks/useOps";
import { useTenant } from "@/hooks/useTenant";
import { localDb, type LocalOrder, type LocalOrderEvent } from "@/lib/db/localDb";
import {
  computeHistoryStats,
  filterHistoryEvents,
  formatHistoryDateTime,
  formatHistoryTime,
  groupHistoryByDay,
  KIND_LABEL,
  mapAlertEvent,
  mapOrderAuditEvent,
  SEVERITY_LABEL,
  type HistoryCategoryFilter,
  type HistoryDateFilter,
  type HistoryEvent,
  type HistorySeverity,
} from "@/lib/ops/historyEvents";
import { STATUS_LABEL, type OrderStatus } from "@/lib/ops/orderWorkflow";
import { STATUS_BADGE_CLASS } from "@/lib/ops/statusTheme";
import { USE_POSTGRES } from "@/lib/repositories";
import { fmtBRL } from "@/lib/format/currency";
import { OpsPageHeader } from "@/components/ops/OpsPageHeader";
import { OrderDetailPanel } from "@/components/ops/OrderDetailPanel";
import { EmptyState, LoadingState } from "@/components/ops/StateViews";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const DATE_FILTERS: { id: HistoryDateFilter; label: string }[] = [
  { id: "today", label: "Hoje" },
  { id: "yesterday", label: "Ontem" },
  { id: "7days", label: "7 dias" },
  { id: "all", label: "Todos" },
];

const CATEGORY_FILTERS: { id: HistoryCategoryFilter; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "order", label: "Pedidos" },
  { id: "alert", label: "Alertas" },
];

const SEVERITY_STYLES: Record<HistorySeverity, string> = {
  success: "border-l-success bg-success/5",
  warning: "border-l-warning bg-warning/5",
  error: "border-l-danger bg-danger/5",
  info: "border-l-primary bg-primary/5",
};

function EventIcon({ event }: { event: HistoryEvent }) {
  if (event.kind === "alert") return <AlertTriangle className="size-4 text-warning" />;
  if (event.toStatus === "entregue") return <CheckCircle2 className="size-4 text-success" />;
  if (event.toStatus === "cancelado") return <XCircle className="size-4 text-danger" />;
  return <Package className="size-4 text-primary" />;
}

function StatusPill({ status }: { status: OrderStatus }) {
  return (
    <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium", STATUS_BADGE_CLASS[status])}>
      {STATUS_LABEL[status]}
    </span>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: "success" | "danger" | "warning" }) {
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

function HistoryEventDetail({
  event,
  order,
  showTechnical,
  onToggleTechnical,
  onOpenOrder,
}: {
  event: HistoryEvent;
  order: LocalOrder | null;
  showTechnical: boolean;
  onToggleTechnical: () => void;
  onOpenOrder: () => void;
}) {
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0 border-b border-border/40 pb-4">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted/60">
            <EventIcon event={event} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {KIND_LABEL[event.kind]}
            </p>
            <h3 className="font-display text-lg font-bold text-foreground mt-0.5 truncate">
              {event.orderCode ?? event.title}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">{event.summary}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 space-y-5 pr-1">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
            <dt className="text-xs text-muted-foreground">Horário</dt>
            <dd className="font-medium mt-0.5">{formatHistoryDateTime(event.createdAt)}</dd>
          </div>
          <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
            <dt className="text-xs text-muted-foreground">Tipo</dt>
            <dd className="font-medium mt-0.5">{SEVERITY_LABEL[event.severity]}</dd>
          </div>
        </dl>

        {event.kind === "order" && event.toStatus ? (
          <section className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Transição de status
            </h4>
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/50 bg-card p-3">
              {event.fromStatus ? (
                <>
                  <StatusPill status={event.fromStatus} />
                  <ArrowRight className="size-4 text-muted-foreground shrink-0" />
                </>
              ) : null}
              <StatusPill status={event.toStatus} />
            </div>
          </section>
        ) : null}

        {event.note ? (
          <section className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Observação</h4>
            <p className="text-sm rounded-xl border border-border/50 bg-muted/20 p-3 leading-relaxed">{event.note}</p>
          </section>
        ) : null}

        {order ? (
          <section className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pedido</h4>
            <div className="rounded-xl border border-border/50 bg-card p-3 space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Cliente</span>
                <span className="font-medium text-right truncate">{order.customer_name}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Valor</span>
                <span className="font-semibold tabular-nums">{fmtBRL(order.total_amount)}</span>
              </div>
              {order.channel ? (
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Canal</span>
                  <span>{order.channel}</span>
                </div>
              ) : null}
              <button type="button" onClick={onOpenOrder} className="erp-btn-secondary w-full justify-center mt-2 text-xs">
                Abrir detalhes do pedido
              </button>
            </div>
          </section>
        ) : null}

        <section className="space-y-2">
          <button
            type="button"
            onClick={onToggleTechnical}
            className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition"
          >
            Dados técnicos
            <ChevronDown className={cn("size-4 transition", showTechnical && "rotate-180")} />
          </button>
          {showTechnical ? (
            <pre className="text-[10px] leading-relaxed whitespace-pre-wrap rounded-xl border border-border/50 bg-muted/30 p-3 font-mono overflow-x-auto">
              {JSON.stringify(event.raw, null, 2)}
            </pre>
          ) : null}
        </section>
      </div>
    </div>
  );
}

export function HistoryPanel() {
  const { current } = useTenant();
  const { orders, drivers, alerts } = useOps();

  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<HistoryDateFilter>("today");
  const [categoryFilter, setCategoryFilter] = useState<HistoryCategoryFilter>("all");
  const [showTechnical, setShowTechnical] = useState(false);
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);

  const loadEvents = async (tenantId: string) => {
    setLoading(true);
    try {
      const merged: HistoryEvent[] = [];

      if (USE_POSTGRES) {
        const rows = await listOrderEventsFn({ data: { tenantId, limit: 100 } });
        merged.push(...rows.map(mapOrderAuditEvent));
      } else {
        const orderIds = new Set(orders.map((o) => o.id));
        const local = localDb.get<LocalOrderEvent>("order_events");
        merged.push(
          ...local
            .filter((e) => orderIds.has(e.order_id))
            .map((e) =>
              mapOrderAuditEvent({
                id: e.id,
                orderId: e.order_id,
                orderCode: e.order_code,
                fromStatus: e.from_status,
                toStatus: e.to_status,
                note: e.note,
                createdAt: e.created_at,
              }),
            ),
        );
      }

      merged.push(...alerts.map(mapAlertEvent));

      merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setEvents(merged);
      setSelectedId((prev) => (prev && merged.some((e) => e.id === prev) ? prev : merged[0]?.id ?? ""));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!current?.id) return;
    void loadEvents(current.id);
  }, [current?.id, alerts, orders.length]);

  const filtered = useMemo(
    () => filterHistoryEvents(events, { dateFilter, categoryFilter, search }),
    [events, dateFilter, categoryFilter, search],
  );

  const groups = useMemo(() => groupHistoryByDay(filtered), [filtered]);
  const stats = useMemo(() => computeHistoryStats(events), [events]);

  const selected = filtered.find((e) => e.id === selectedId) ?? filtered[0] ?? null;
  const selectedOrder = selected?.orderId ? orders.find((o) => o.id === selected.orderId) ?? null : null;
  const detailOrder = detailOrderId ? orders.find((o) => o.id === detailOrderId) : null;

  useEffect(() => {
    setShowTechnical(false);
  }, [selected?.id]);

  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedId("");
      return;
    }
    if (!filtered.some((e) => e.id === selectedId)) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  return (
    <div className="flex flex-col gap-4 min-h-0 lg:h-full">
      <OpsPageHeader
        subtitle="Sistema"
        title="Histórico"
        highlight="operacional"
        description="Mudanças de status dos pedidos e alertas reais da operação."
        actions={
          <button
            type="button"
            onClick={() => current?.id && void loadEvents(current.id)}
            disabled={loading}
            className="erp-btn-secondary text-xs"
          >
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
            Atualizar
          </button>
        }
        className="shrink-0 pb-0"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
        <StatCard label="Movimentações hoje" value={stats.today} />
        <StatCard label="Finalizados hoje" value={stats.deliveredToday} tone="success" />
        <StatCard label="Cancelamentos hoje" value={stats.cancelledToday} tone="danger" />
        <StatCard label="Alertas hoje" value={stats.alertsToday} tone="warning" />
      </div>

      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
        <div className="lg:w-[min(100%,26rem)] shrink-0 flex flex-col min-h-0 erp-card overflow-hidden">
          <div className="shrink-0 p-4 border-b border-border/40 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por pedido, cliente ou texto…"
                className="pl-9 h-9 text-sm"
              />
            </div>

            <div className="segmented-control w-full overflow-x-auto">
              {DATE_FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  data-active={dateFilter === f.id}
                  className="segmented-item text-xs flex-1 whitespace-nowrap"
                  onClick={() => setDateFilter(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setCategoryFilter(f.id)}
                  className={cn(
                    "text-[11px] px-2.5 py-1 rounded-full border transition font-medium",
                    categoryFilter === f.id
                      ? "bg-primary/15 border-primary/30 text-primary"
                      : "border-border text-muted-foreground hover:bg-muted/50",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <p className="text-[11px] text-muted-foreground tabular-nums">
              {filtered.length} evento{filtered.length === 1 ? "" : "s"}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-3 min-h-[240px] lg:min-h-0">
            {loading ? (
              <LoadingState label="Carregando histórico…" size="sm" className="border-0 bg-transparent" />
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={Bell}
                title="Nenhum evento neste filtro"
                description="Altere o período ou a categoria, ou aguarde novas movimentações na operação."
                size="sm"
                className="border-0 bg-transparent"
              />
            ) : (
              <div className="space-y-4">
                {groups.map((group) => (
                  <div key={group.key}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-2 sticky top-0 bg-card/95 backdrop-blur py-1 z-10">
                      {group.label}
                    </p>
                    <ul className="space-y-2">
                      {group.events.map((ev) => (
                        <li key={ev.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedId(ev.id)}
                            className={cn(
                              "w-full text-left rounded-xl border border-l-4 p-3 transition",
                              SEVERITY_STYLES[ev.severity],
                              selected?.id === ev.id
                                ? "ring-2 ring-primary/30 border-primary/40"
                                : "border-border/50 hover:bg-muted/30",
                            )}
                          >
                            <div className="flex items-start gap-2.5">
                              <div className="mt-0.5 shrink-0">
                                <EventIcon event={ev} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-bold text-foreground truncate">
                                    {ev.orderCode ?? ev.title}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                                    {formatHistoryTime(ev.createdAt)}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-snug">
                                  {ev.summary}
                                </p>
                                <span className="inline-block mt-1.5 text-[9px] uppercase tracking-wide font-semibold text-muted-foreground/80">
                                  {KIND_LABEL[ev.kind]}
                                </span>
                              </div>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-[320px] lg:min-h-0 erp-card p-5 overflow-hidden flex flex-col">
          {selected ? (
            <HistoryEventDetail
              event={selected}
              order={selectedOrder}
              showTechnical={showTechnical}
              onToggleTechnical={() => setShowTechnical((v) => !v)}
              onOpenOrder={() => selected.orderId && setDetailOrderId(selected.orderId)}
            />
          ) : (
            <EmptyState
              title="Selecione um evento"
              description="Escolha um item na lista para ver os detalhes de forma clara."
              size="md"
              className="flex-1 border-0 bg-transparent"
            />
          )}
        </div>
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
