import { Bike, Clock, MapPin, ChevronRight, Link2, LayoutGrid } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { fmtBRL } from "@/lib/format/currency";
import { isKitchenActive, type OrderStatus } from "@/lib/ops/orderWorkflow";
import { isOrderDelayed as isDelayedByTime } from "@/lib/ops/orderWorkflow";
import { OrderDetailPanel } from "@/components/ops/OrderDetailPanel";
import type { LocalDriver, LocalOrder } from "@/lib/db/localDb";
import { useTenant } from "@/hooks/useTenant";
import { useOps } from "@/hooks/useOps";
import { StatusBadge } from "@/components/ops/StatusBadge";
import { EmptyState } from "@/components/ops/StateViews";
import { slaBarClass } from "@/lib/ops/statusTheme";
import { useMemo, useState } from "react";

const TABS: Array<{
  key: "all" | "risco" | "rota" | "producao";
  label: string;
  filter: (o: LocalOrder) => boolean;
}> = [
  { key: "all", label: "Todos", filter: () => true },
  {
    key: "risco",
    label: "Risco SLA",
    filter: (o) => o.priority === "alta" || o.priority === "critica",
  },
  {
    key: "producao",
    label: "Produção",
    filter: (o) => isKitchenActive(o.status),
  },
  {
    key: "rota",
    label: "Em rota",
    filter: (o) => ["aguardando_entregador", "em_rota_entrega"].includes(o.status),
  },
];

export function OrdersTable({ tick, orders: propOrders }: { tick: number; orders?: LocalOrder[] }) {
  const { current } = useTenant();
  const { drivers } = useOps();
  const orders = propOrders ?? [];
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("all");
  const [detailId, setDetailId] = useState<string | null>(null);
  const tabCounts = useMemo(
    () =>
      Object.fromEntries(TABS.map((t) => [t.key, orders.filter(t.filter).length])) as Record<
        (typeof TABS)[number]["key"],
        number
      >,
    [orders, tick],
  );

  const filtered = useMemo(
    () => orders.filter(TABS.find((t) => t.key === tab)!.filter),
    [orders, tab, tick],
  );

  const activeOrders = orders.filter((o) => o.status !== "entregue" && o.status !== "cancelado");

  return (
    <div className="rounded-2xl border border-border/50 bg-card shadow-[var(--shadow-card)] overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-border/40 px-4 py-4 sm:px-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-sm font-semibold tracking-tight">Lista operacional</h2>
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
              {activeOrders.length} ativos
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Filtre por risco, produção ou rota</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="segmented-control w-full sm:w-auto overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                data-active={tab === t.key}
                className="segmented-item text-xs whitespace-nowrap gap-1.5 inline-flex items-center"
                onClick={() => setTab(t.key)}
              >
                {t.label}
                <span
                  className={`rounded px-1 py-px text-[10px] font-semibold tabular-nums ${
                    tab === t.key ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {tabCounts[t.key]}
                </span>
              </button>
            ))}
          </div>
          <Link
            to="/kanban"
            className="erp-btn-secondary py-2 px-3 text-xs justify-center shrink-0"
          >
            <LayoutGrid className="size-3.5" />
            Kanban
          </Link>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Nenhum pedido neste filtro"
          description="Altere o filtro ou aguarde novos pedidos na operação."
          size="sm"
          className="border-0 rounded-none bg-transparent"
        />
      ) : (
        <>
          {/* Cards — mobile */}
          <div className="md:hidden divide-y divide-border p-3 space-y-3">
            {filtered.map((o) => (
              <OrderCard key={o.id} order={o} drivers={drivers} onOpen={() => setDetailId(o.id)} />
            ))}
          </div>

          {/* Tabela — tablet/desktop */}
          <div className="erp-table-wrap hidden md:block">
            <table className="erp-table">
              <thead>
                <tr>
                  <th className="pl-5">Pedido</th>
                  <th>Cliente · Região</th>
                  <th>Status</th>
                  <th>SLA</th>
                  <th className="hidden lg:table-cell">Distância</th>
                  <th className="hidden lg:table-cell">ETA</th>
                  <th>Entregador</th>
                  <th className="text-right">Valor</th>
                  <th>Rastreio</th>
                  <th className="pr-5 w-8" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <OrderRow
                    key={o.id}
                    order={o}
                    drivers={drivers}
                    onOpen={() => setDetailId(o.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {detailId &&
        current &&
        (() => {
          const lo = orders.find((o) => o.id === detailId) as LocalOrder | undefined;
          if (!lo) return null;
          const driverName = lo.driver_id ? drivers.find((d) => d.id === lo.driver_id)?.name : null;
          return (
            <>
              <button
                type="button"
                className="fixed inset-0 z-40 bg-black/40"
                aria-label="Fechar"
                onClick={() => setDetailId(null)}
              />
              <OrderDetailPanel
                order={lo}
                drivers={drivers}
                driverName={driverName}
                tenantId={current.id}
                onClose={() => setDetailId(null)}
              />
            </>
          );
        })()}
    </div>
  );
}

function orderMetrics(o: LocalOrder, drivers: LocalDriver[]) {
  const customerName = o.customer_name ?? "Cliente";
  const district = o.neighborhood ?? o.address?.split(",")[0] ?? "Geral";
  const elapsed = Math.max(0, Math.floor((Date.now() - new Date(o.placed_at).getTime()) / 60000));
  const sla = o.sla_minutes ?? 45;
  const value = Number(o.total_amount ?? 0);
  const distance = 1.8;
  const eta = Math.max(5, sla - elapsed);
  const pct = Math.min(100, (elapsed / sla) * 100);
  const priority = o.priority;
  const isCritical = priority === "critica";
  const isHigh = priority === "alta";
  const driverName = o.driver_id
    ? (drivers.find((d) => d.id === o.driver_id)?.name ?? "Entregador")
    : null;

  return {
    customerName,
    district,
    elapsed,
    sla,
    value,
    distance,
    eta,
    pct,
    isCritical,
    isHigh,
    driverName,
  };
}

function OrderRow({
  order: o,
  drivers,
  onOpen,
}: {
  order: LocalOrder;
  drivers: LocalDriver[];
  onOpen: () => void;
}) {
  const m = orderMetrics(o, drivers);

  return (
    <tr className="group cursor-pointer hover:bg-muted/30" onClick={onOpen}>
      <td className="pl-5 font-mono text-xs">
        <div className="flex items-center gap-2">
          <span
            className={`size-1.5 rounded-full ${m.isCritical ? "bg-danger pulse-dot" : m.isHigh ? "bg-warning" : "bg-success"}`}
          />
          {o.code}
        </div>
      </td>
      <td>
        <div className="font-medium leading-none">{m.customerName}</div>
        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
          <MapPin className="size-3" />
          {m.district}
        </div>
      </td>
      <td>
        <StatusBadge status={o.status as OrderStatus} elapsedMin={m.elapsed} slaMin={m.sla} />
      </td>
      <td className="w-32">
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full ${slaBarClass(m.elapsed, m.sla)}`}
              style={{ width: `${m.pct}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
            {m.elapsed}&apos;/{m.sla}&apos;
          </span>
        </div>
      </td>
      <td className="hidden lg:table-cell font-mono text-xs tabular-nums">{m.distance} km</td>
      <td className="hidden lg:table-cell font-mono text-xs tabular-nums">
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3 text-muted-foreground" />
          {m.eta} min
        </span>
      </td>
      <td className="text-xs">
        {m.driverName ? (
          <span className="inline-flex items-center gap-1.5">
            <Bike className="size-3 text-primary" />
            {m.driverName}
          </span>
        ) : (
          <span className="text-muted-foreground italic text-[11px]">aguardando…</span>
        )}
      </td>
      <td className="text-right font-mono text-sm tabular-nums">{fmtBRL(m.value)}</td>
      <td>
        {o.tracking_token ? (
          <button
            type="button"
            title="Copiar link do cliente"
            className="ops-icon-btn size-8"
            onClick={() => {
              const token = o.tracking_token!;
              const url = `${window.location.origin}/rastreio/${o.id}/${token}`;
              void navigator.clipboard.writeText(url);
              toast.success("Link de rastreio copiado!");
            }}
          >
            <Link2 className="size-3.5" />
          </button>
        ) : (
          <span className="text-[10px] text-muted-foreground">—</span>
        )}
      </td>
      <td className="pr-5 text-right">
        <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground transition inline" />
      </td>
    </tr>
  );
}

function OrderCard({
  order: o,
  drivers,
  onOpen,
}: {
  order: LocalOrder;
  drivers: LocalDriver[];
  onOpen: () => void;
}) {
  const m = orderMetrics(o, drivers);
  const placed = o.placed_at;
  const delayed = placed && isDelayedByTime(placed, m.sla);

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className={`rounded-xl border bg-background p-3.5 space-y-2.5 cursor-pointer transition hover:border-primary/30 hover:shadow-[var(--shadow-card)] ${
        delayed ? "border-danger/40 ring-1 ring-danger/15" : "border-border/60"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">{o.code}</span>
            {o.channel ? (
              <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {o.channel}
              </span>
            ) : null}
          </div>
          <div className="font-semibold text-sm mt-0.5">{m.customerName}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="size-3" />
            {m.district}
          </div>
        </div>
        <StatusBadge status={o.status as OrderStatus} elapsedMin={m.elapsed} slaMin={m.sla} />
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="font-mono tabular-nums">{fmtBRL(m.value)}</span>
        <span>{m.distance} km</span>
        <span>{m.eta} min ETA</span>
      </div>
      <div className="h-1 rounded-full bg-muted overflow-hidden">
        <div className={slaBarClass(m.elapsed, m.sla)} style={{ width: `${m.pct}%` }} />
      </div>
    </article>
  );
}
