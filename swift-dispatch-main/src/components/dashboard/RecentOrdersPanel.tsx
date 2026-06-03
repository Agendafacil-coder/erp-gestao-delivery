import { Link } from "@tanstack/react-router";
import { ArrowRight, Clock } from "lucide-react";
import type { RecentOrderRow } from "@/lib/ops/dashboardMetrics";
import { STATUS_BADGE_CLASS, STATUS_LABEL } from "@/lib/ops/statusTheme";
import { normalizeOrderStatus } from "@/lib/ops/orderWorkflow";
import { fmtBRL } from "@/lib/ops/mock";

type Props = {
  orders: RecentOrderRow[];
};

export function RecentOrdersPanel({ orders }: Props) {
  return (
    <section className="erp-card flex flex-col min-h-[280px]">
      <header className="erp-card-header">
        <div>
          <h2 className="font-semibold text-sm">Pedidos recentes</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Últimas movimentações</p>
        </div>
        <Link
          to="/kanban"
          className="text-xs text-primary font-medium flex items-center gap-1 hover:underline"
        >
          Ver todos
          <ArrowRight className="size-3" />
        </Link>
      </header>
      <div className="flex-1 overflow-auto divide-y divide-border/60">
        {orders.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground text-center">
            Nenhum pedido na operação. Crie um pedido manual ou aguarde novos pedidos.
          </p>
        ) : (
          orders.map((o) => {
            const st = normalizeOrderStatus(o.status);
            return (
            <div
              key={o.id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-semibold text-foreground">
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
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {o.customer}
                </p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-semibold tabular-nums">{fmtBRL(o.total)}</div>
                <div className="text-[10px] text-muted-foreground tabular-nums">
                  {o.elapsedMin} min
                </div>
              </div>
            </div>
          );
          })
        )}
      </div>
    </section>
  );
}
