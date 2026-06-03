import { useMemo, useState } from "react";
import {
  Bike,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  DollarSign,
  History,
  Package,
  ShieldAlert,
  Star,
  UserPlus,
} from "lucide-react";
import type { LocalDriver, LocalOrder } from "@/lib/db/localDb";
import { DRIVER_STATUS_UI } from "@/lib/drivers/driverStats";
import {
  buildDriverHistory,
  computeDriverDayStats,
} from "@/lib/drivers/driverStats";
import { useOps } from "@/hooks/useOps";
import { toast } from "sonner";

type DriversGridProps = {
  tick: number;
  drivers: LocalDriver[];
  orders: LocalOrder[];
};

export function DriversGrid({ tick, drivers, orders }: DriversGridProps) {
  const { applyOrderAction } = useOps();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [assignDriverId, setAssignDriverId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);

  const unassignedReady = useMemo(
    () =>
      orders.filter(
        (o) =>
          !o.driver_id &&
          ["pronto", "aguardando_entregador"].includes(o.status),
      ),
    [orders],
  );

  const driverRows = useMemo(() => {
    return drivers.map((d) => {
      const activeOrder = orders.find(
        (o) => o.driver_id === d.id && !["entregue", "cancelado"].includes(o.status),
      );
      const stats = computeDriverDayStats(orders, d.id);
      const history = buildDriverHistory(orders, d.id, 6);

      let orderElapsed = 0;
      let orderSla = 40;
      let delayRisk: "none" | "low" | "high" = "none";

      if (activeOrder) {
        orderElapsed = Math.max(
          0,
          Math.floor((Date.now() - new Date(activeOrder.placed_at).getTime()) / 60000),
        );
        orderSla = activeOrder.sla_minutes ?? 40;
        if (orderElapsed > orderSla * 0.75) delayRisk = "high";
        else if (orderElapsed > orderSla * 0.5) delayRisk = "low";
      }

      return {
        ...d,
        stats,
        history,
        activeOrder,
        orderElapsed,
        orderSla,
        delayRisk,
        ratingDisplay: (d.rating ?? 4.8).toFixed(1),
        statusUi: DRIVER_STATUS_UI[d.status] ?? DRIVER_STATUS_UI.disponivel!,
      };
    });
  }, [drivers, orders, tick]);

  const handleAssign = async (orderId: string, driverId: string) => {
    setAssigning(true);
    try {
      await applyOrderAction(orderId, "atribuir_entregador", driverId);
      toast.success("Pedido atribuído ao entregador");
      setAssignDriverId(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setAssigning(false);
    }
  };

  if (driverRows.length === 0) {
    return (
      <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
        Nenhum entregador nesta unidade no momento.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {driverRows.map((d) => (
          <div
            key={d.id}
            className="glass rounded-2xl border border-border p-4 space-y-3 hover:border-border-strong transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  <div className="size-11 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center border border-border text-sm font-bold uppercase">
                    {d.name.slice(0, 2)}
                  </div>
                  <span
                    className={`absolute bottom-0 right-0 size-3 rounded-full border-2 border-surface ${d.statusUi.dot}`}
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground truncate">{d.name}</h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 capitalize">
                    <Bike className="size-3 shrink-0" />
                    {d.vehicle}
                  </p>
                </div>
              </div>
              <span
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium border shrink-0 ${d.statusUi.tone}`}
              >
                {d.statusUi.label}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="rounded-lg bg-surface/40 border border-border/60 p-2">
                <div className="text-muted-foreground flex items-center justify-center gap-0.5">
                  <Package className="size-3" /> Hoje
                </div>
                <div className="font-bold mt-0.5 tabular-nums">{d.stats.deliveriesToday}</div>
              </div>
              <div className="rounded-lg bg-surface/40 border border-border/60 p-2">
                <div className="text-muted-foreground flex items-center justify-center gap-0.5">
                  <Clock className="size-3" /> Média
                </div>
                <div className="font-bold mt-0.5 tabular-nums">
                  {d.stats.avgDeliveryMinutes != null ? `${d.stats.avgDeliveryMinutes}m` : "—"}
                </div>
              </div>
              <div className="rounded-lg bg-surface/40 border border-border/60 p-2 col-span-2 sm:col-span-1">
                <div className="text-muted-foreground flex items-center justify-center gap-0.5">
                  <DollarSign className="size-3" /> A pagar
                </div>
                <div className="font-bold mt-0.5 tabular-nums text-success">
                  R$ {d.stats.earningsToday.toFixed(2)}
                </div>
              </div>
              <div className="rounded-lg bg-surface/40 border border-border/60 p-2 hidden sm:block">
                <div className="text-muted-foreground">Nota</div>
                <div className="font-semibold flex items-center justify-center gap-0.5 mt-0.5">
                  <Star className="size-3 fill-warning text-warning" />
                  {d.ratingDisplay}
                </div>
              </div>
            </div>

            {d.status === "em_rota" && d.activeOrder ? (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-foreground">Pedido {d.activeOrder.code}</span>
                  {d.delayRisk === "high" ? (
                    <span className="text-[11px] font-medium text-danger flex items-center gap-1">
                      <ShieldAlert className="size-3" /> SLA em risco
                    </span>
                  ) : d.delayRisk === "low" ? (
                    <span className="text-[11px] font-medium text-warning">Atenção ao SLA</span>
                  ) : (
                    <span className="text-[11px] font-medium text-success flex items-center gap-1">
                      <CheckCircle className="size-3" /> No prazo
                    </span>
                  )}
                </div>
                <p className="text-xs text-foreground truncate">{d.activeOrder.customer_name}</p>
                <p className="text-xs text-muted-foreground truncate">{d.activeOrder.address}</p>
              </div>
            ) : d.status === "disponivel" ? (
              <p className="text-xs text-success text-center py-2 rounded-lg border border-success/15 bg-success/5">
                Pronto para nova entrega
              </p>
            ) : d.status === "offline" ? (
              <p className="text-xs text-muted-foreground text-center py-2 rounded-lg border border-border bg-surface/30">
                Fora do expediente
              </p>
            ) : null}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAssignDriverId(assignDriverId === d.id ? null : d.id)}
                disabled={unassignedReady.length === 0 || d.status === "offline"}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg border border-primary/30 bg-primary/5 text-xs font-semibold text-primary hover:bg-primary/10 disabled:opacity-40"
              >
                <UserPlus className="size-3.5" />
                Atribuir pedido
              </button>
              <button
                type="button"
                onClick={() => setExpandedId(expandedId === d.id ? null : d.id)}
                className="px-3 py-2 rounded-lg border border-border text-xs font-medium hover:bg-muted"
              >
                {expandedId === d.id ? (
                  <ChevronUp className="size-4" />
                ) : (
                  <History className="size-4" />
                )}
              </button>
            </div>

            {assignDriverId === d.id && (
              <div className="rounded-xl border border-border bg-muted/30 p-2 space-y-1.5 max-h-40 overflow-y-auto">
                {unassignedReady.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-2">Nenhum pedido pronto sem entregador.</p>
                ) : (
                  unassignedReady.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      disabled={assigning}
                      onClick={() => void handleAssign(o.id, d.id)}
                      className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-card text-xs flex justify-between gap-2"
                    >
                      <span className="font-mono font-semibold">{o.code}</span>
                      <span className="text-muted-foreground truncate">{o.customer_name}</span>
                    </button>
                  ))
                )}
              </div>
            )}

            {expandedId === d.id && (
              <div className="border-t border-border/60 pt-2 space-y-1.5">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1">
                  <History className="size-3" /> Histórico de entregas
                </p>
                {d.history.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sem entregas registradas.</p>
                ) : (
                  d.history.map((h) => (
                    <div
                      key={h.orderId}
                      className="flex justify-between text-xs py-1 border-b border-border/40 last:border-0"
                    >
                      <span className="font-mono">{h.code}</span>
                      <span className="text-success font-medium">R$ {h.payout.toFixed(2)}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
