import { Link } from "@tanstack/react-router";
import { ArrowRight, Clock } from "lucide-react";
import type { RecentOrderRow } from "@/lib/ops/dashboardMetrics";
import { STATUS_BADGE_CLASS, STATUS_LABEL } from "@/lib/ops/statusTheme";
import { normalizeOrderStatus } from "@/lib/ops/orderWorkflow";
import { fmtBRL } from "@/lib/format/currency";
import {
  AppCard,
  AppCardHeader,
  AppCardTitle,
  AppCardDescription,
} from "@/components/design/AppCard";

type Props = {
  orders: RecentOrderRow[];
};

export function RecentOrdersPanel({ orders }: Props) {
  return (
    <AppCard className="flex flex-col min-h-[280px]">
      <AppCardHeader>
        <div>
          <AppCardTitle>Pedidos recentes</AppCardTitle>
          <AppCardDescription>Últimas movimentações</AppCardDescription>
        </div>
        <Link
          to="/kanban"
          className="text-xs text-primary font-medium flex items-center gap-1 hover:underline shrink-0"
        >
          Ver todos
          <ArrowRight className="size-3" />
        </Link>
      </AppCardHeader>
      <div className="flex-1 overflow-auto">
        {orders.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground text-center">
            Nenhum pedido na operação. Crie um pedido manual ou aguarde novos pedidos.
          </p>
        ) : (
          <ul className="divide-y divide-border/40">
            {orders.map((o) => {
              const st = normalizeOrderStatus(o.status);
              return (
                <li
                  key={o.id}
                  className="flex items-center gap-3 px-5 py-3.5 sm:px-6 hover:bg-muted/30 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-medium text-foreground">
                        {o.code}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_BADGE_CLASS[st]}`}
                      >
                        {STATUS_LABEL[st]}
                      </span>
                      {o.isDelayed ? (
                        <span className="text-[10px] text-warning font-medium flex items-center gap-0.5">
                          <Clock className="size-3" />
                          Atrasado
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{o.customer}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold tabular-nums">{fmtBRL(o.total)}</div>
                    <div className="text-[10px] text-muted-foreground tabular-nums">
                      {o.elapsedMin} min
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppCard>
  );
}
