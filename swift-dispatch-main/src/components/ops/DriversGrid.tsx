import { Bike, ShieldAlert, CheckCircle, Star } from "lucide-react";
import { useMemo } from "react";
import type { LocalDriver, LocalOrder } from "@/lib/db/localDb";

const STATUS_LABELS: Record<string, { label: string; tone: string; dot: string }> = {
  disponivel: {
    label: "Disponível",
    tone: "text-success border-success/30 bg-success/5",
    dot: "bg-success",
  },
  em_rota: {
    label: "Em rota",
    tone: "text-primary-glow border-primary/30 bg-primary/5",
    dot: "bg-primary-glow",
  },
  ocioso: {
    label: "Ocioso",
    tone: "text-warning border-warning/30 bg-warning/5",
    dot: "bg-warning",
  },
  offline: {
    label: "Offline",
    tone: "text-muted-foreground border-border bg-surface/30",
    dot: "bg-muted-foreground",
  },
};

type DriversGridProps = {
  tick: number;
  drivers: LocalDriver[];
  orders: LocalOrder[];
};

export function DriversGrid({ tick, drivers, orders }: DriversGridProps) {
  const driverStats = useMemo(() => {
    return drivers.map((d) => {
      const activeOrder = orders.find(
        (o) => o.driver_id === d.id && !["entregue", "cancelado"].includes(o.status),
      );

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
        activeOrder,
        orderElapsed,
        orderSla,
        delayRisk,
        ratingDisplay: (d.rating ?? 4.8).toFixed(1),
      };
    });
  }, [drivers, orders, tick]);

  if (driverStats.length === 0) {
    return (
      <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
        Nenhum entregador nesta unidade no momento.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {driverStats.map((d) => {
        const status = STATUS_LABELS[d.status] ?? STATUS_LABELS.disponivel!;

        return (
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
                    className={`absolute bottom-0 right-0 size-3 rounded-full border-2 border-surface ${status.dot}`}
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground truncate">{d.name}</h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Bike className="size-3 shrink-0" />
                    <span className="capitalize">{d.vehicle}</span>
                    <span>·</span>
                    <span>{d.active_orders ?? 0} em rota</span>
                  </p>
                </div>
              </div>
              <span
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium border shrink-0 ${status.tone}`}
              >
                {status.label}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center text-sm">
              <div className="rounded-lg bg-surface/40 border border-border/60 p-2">
                <div className="text-[11px] text-muted-foreground">Avaliação</div>
                <div className="font-semibold flex items-center justify-center gap-0.5 mt-0.5">
                  <Star className="size-3 fill-warning text-warning" />
                  {d.ratingDisplay}
                </div>
              </div>
              <div className="rounded-lg bg-surface/40 border border-border/60 p-2">
                <div className="text-[11px] text-muted-foreground">Pedidos ativos</div>
                <div className="font-semibold mt-0.5">{d.active_orders ?? 0}</div>
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
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span className="capitalize">{d.activeOrder.status.replace(/_/g, " ")}</span>
                    <span>
                      {d.orderElapsed} / {d.orderSla} min
                    </span>
                  </div>
                  <div className="h-1.5 bg-border/50 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        d.delayRisk === "high"
                          ? "bg-danger"
                          : d.delayRisk === "low"
                            ? "bg-warning"
                            : "bg-success"
                      }`}
                      style={{
                        width: `${Math.min(100, (d.orderElapsed / d.orderSla) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : d.status === "ocioso" ? (
              <p className="text-xs text-warning text-center py-2 rounded-lg border border-warning/15 bg-warning/5">
                Sem rota ativa — aguardando próximo pedido
              </p>
            ) : d.status === "offline" ? (
              <p className="text-xs text-muted-foreground text-center py-2 rounded-lg border border-border bg-surface/30">
                Fora do expediente
              </p>
            ) : (
              <p className="text-xs text-success text-center py-2 rounded-lg border border-success/15 bg-success/5 flex items-center justify-center gap-1">
                <CheckCircle className="size-3.5" />
                Pronto para nova entrega
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

