import { Flame, X, Check, Bike } from "lucide-react";
import type { LocalOrder } from "@/lib/repositories";
import { formatBRL } from "@/lib/menu/format";

type Props = {
  order: LocalOrder;
  onAccept: () => void;
  onDismiss: () => void;
};

export function NewOrderToast({ order, onAccept, onDismiss }: Props) {
  const total = Number(order.total_amount) || 0;

  return (
    <div className="ops-new-order-toast w-[min(100vw-2rem,24rem)] rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-lift)] animate-in slide-in-from-top-2 fade-in duration-300">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Flame className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Novo pedido recebido
          </p>
          <p className="mt-0.5 font-display text-base font-bold text-foreground">{order.code}</p>
          <p className="truncate text-sm text-muted-foreground">{order.customer_name}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground tabular-nums">
              {formatBRL(total)}
            </span>
            {order.channel ? (
              <span className="rounded-full bg-muted px-2 py-0.5">{order.channel}</span>
            ) : null}
            {order.driver_id ? null : (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
                <Bike className="size-3" />
                Delivery
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="ops-icon-btn size-8 shrink-0"
          aria-label="Fechar"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={onAccept} className="erp-btn-primary flex-1 justify-center py-2.5">
          <Check className="size-4" />
          Aceitar pedido
        </button>
        <button type="button" onClick={onDismiss} className="erp-btn-secondary px-4 py-2.5">
          Depois
        </button>
      </div>
    </div>
  );
}
