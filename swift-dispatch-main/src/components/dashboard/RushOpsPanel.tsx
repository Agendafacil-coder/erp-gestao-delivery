import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Bike,
  Clock,
  Flame,
  Timer,
  UtensilsCrossed,
} from "lucide-react";
import type { LocalOrder, LocalDriver } from "@/lib/db/localDb";
import { normalizeOrderStatus } from "@/lib/ops/orderWorkflow";
import { isOrderDelayed, elapsedMinutes } from "@/lib/ops/dashboardMetrics";
import { fmtBRL } from "@/lib/format/currency";
import { cn } from "@/lib/utils";

type Props = {
  orders: LocalOrder[];
  drivers: LocalDriver[];
};

type RushItem = {
  id: string;
  code: string;
  title: string;
  detail: string;
  level: "warn" | "crit";
  href?: string;
};

/** Painel de rush para o dono: o que precisa de ação agora no pico. */
export function RushOpsPanel({ orders, drivers }: Props) {
  const snapshot = useMemo(() => {
    const active = orders.filter((o) => {
      const s = normalizeOrderStatus(o.status);
      return s !== "entregue" && s !== "cancelado";
    });

    const delayed = active.filter((o) => isOrderDelayed(o));
    const kitchen = active.filter((o) =>
      ["novo", "em_preparo"].includes(normalizeOrderStatus(o.status)),
    );
    const waitingDriver = active.filter(
      (o) =>
        normalizeOrderStatus(o.status) === "aguardando_entregador" &&
        !o.driver_id &&
        o.channel !== "salao",
    );
    const onRoute = active.filter(
      (o) => normalizeOrderStatus(o.status) === "em_rota_entrega",
    );
    const salonOpen = active.filter((o) => o.channel === "salao");
    const availableDrivers = drivers.filter((d) => d.status === "disponivel").length;

    const items: RushItem[] = [];

    for (const o of delayed.slice(0, 5)) {
      items.push({
        id: `delay-${o.id}`,
        code: o.code,
        title: `Atrasado · #${o.code}`,
        detail: `${elapsedMinutes(o.placed_at)} min · ${o.customer_name}`,
        level: elapsedMinutes(o.placed_at) >= 45 ? "crit" : "warn",
        href: "/kanban",
      });
    }

    for (const o of waitingDriver.slice(0, 4)) {
      items.push({
        id: `drv-${o.id}`,
        code: o.code,
        title: `Sem entregador · #${o.code}`,
        detail: `${fmtBRL(o.total_amount)} · ${o.address?.slice(0, 40) ?? "—"}`,
        level: "crit",
        href: "/central",
      });
    }

    return {
      delayed: delayed.length,
      kitchen: kitchen.length,
      waitingDriver: waitingDriver.length,
      onRoute: onRoute.length,
      salonOpen: salonOpen.length,
      availableDrivers,
      items: items.slice(0, 8),
      pressure: delayed.length + waitingDriver.length,
    };
  }, [orders, drivers]);

  const healthy = snapshot.pressure === 0 && snapshot.kitchen < 8;

  return (
    <section
      className={cn(
        "rounded-2xl border p-4 space-y-3",
        healthy
          ? "border-success/30 bg-success/[0.04]"
          : snapshot.pressure >= 3
            ? "border-danger/40 bg-danger/[0.06]"
            : "border-warning/40 bg-warning/[0.06]",
      )}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Flame
            className={cn(
              "size-4",
              healthy ? "text-success" : snapshot.pressure >= 3 ? "text-danger" : "text-warning",
            )}
          />
          <h2 className="text-sm font-semibold">Rush agora</h2>
          <span className="text-[11px] text-muted-foreground">
            {healthy ? "Operação sob controle" : "Ação necessária"}
          </span>
        </div>
        <Link to="/kds" className="text-xs text-primary hover:underline">
          Abrir cozinha
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <RushStat icon={Timer} label="Atrasados" value={snapshot.delayed} danger={snapshot.delayed > 0} />
        <RushStat icon={UtensilsCrossed} label="Na cozinha" value={snapshot.kitchen} />
        <RushStat
          icon={Bike}
          label="Sem entregador"
          value={snapshot.waitingDriver}
          danger={snapshot.waitingDriver > 0}
        />
        <RushStat icon={Clock} label="Em rota" value={snapshot.onRoute} />
        <RushStat icon={AlertTriangle} label="Motos livres" value={snapshot.availableDrivers} />
      </div>

      {snapshot.salonOpen > 0 ? (
        <p className="text-[11px] text-muted-foreground">
          {snapshot.salonOpen} pedido(s) de mesa ativos na cozinha ·{" "}
          <Link to="/salao" className="text-primary hover:underline">
            Ver salão
          </Link>
        </p>
      ) : null}

      {snapshot.items.length > 0 ? (
        <ul className="space-y-1.5">
          {snapshot.items.map((item) => (
            <li key={item.id}>
              <Link
                to={item.href ?? "/kanban"}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-xs transition hover:bg-muted/40",
                  item.level === "crit"
                    ? "border-danger/30 bg-danger/[0.05]"
                    : "border-warning/30 bg-warning/[0.05]",
                )}
              >
                <span className="min-w-0">
                  <span className="font-semibold block truncate">{item.title}</span>
                  <span className="text-muted-foreground truncate block">{item.detail}</span>
                </span>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                    item.level === "crit" ? "bg-danger/15 text-danger" : "bg-warning/15 text-warning",
                  )}
                >
                  {item.level === "crit" ? "Urgente" : "Atenção"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-2">
          Nenhum pedido em risco no momento.
        </p>
      )}
    </section>
  );
}

function RushStat({
  icon: Icon,
  label,
  value,
  danger,
}: {
  icon: typeof Timer;
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/40 bg-background/60 px-2.5 py-2 text-center">
      <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
        <Icon className="size-3" />
        <span className="text-[10px] uppercase tracking-wide">{label}</span>
      </div>
      <p className={cn("text-lg font-bold tabular-nums", danger && value > 0 && "text-danger")}>
        {value}
      </p>
    </div>
  );
}
