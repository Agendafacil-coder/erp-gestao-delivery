import { useMemo, useState } from "react";
import { Package, Search } from "lucide-react";
import type { LocalOrder } from "@/lib/db/localDb";
import { STATUS_LABEL, isDriverActiveOrder } from "@/lib/ops/orderWorkflow";
import { cn } from "@/lib/utils";

type TrackingOrdersQuickListProps = {
  orders: LocalOrder[];
  selectedOrderId: string | null;
  onSelect: (orderId: string, driverId: string | null) => void;
};

export function TrackingOrdersQuickList({
  orders,
  selectedOrderId,
  onSelect,
}: TrackingOrdersQuickListProps) {
  const [query, setQuery] = useState("");

  const activeOrders = useMemo(
    () => orders.filter((o) => isDriverActiveOrder(o.status)),
    [orders],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return activeOrders;
    return activeOrders.filter(
      (o) =>
        o.code.toLowerCase().includes(q) ||
        o.customer_name.toLowerCase().includes(q) ||
        o.address.toLowerCase().includes(q),
    );
  }, [activeOrders, query]);

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Package className="size-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground flex-1">
          Pedidos em andamento
          <span className="ml-1.5 text-muted-foreground font-normal">({activeOrders.length})</span>
        </h3>
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por código, cliente ou endereço…"
          className="w-full rounded-xl border border-border bg-muted/30 pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">
          {activeOrders.length === 0
            ? "Nenhum pedido ativo no momento."
            : "Nenhum resultado para esta busca."}
        </p>
      ) : (
        <ul className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
          {filtered.map((order) => (
            <li key={order.id}>
              <button
                type="button"
                onClick={() => onSelect(order.id, order.driver_id ?? null)}
                className={cn(
                  "w-full text-left rounded-xl border px-3 py-2.5 transition",
                  selectedOrderId === order.id
                    ? "border-primary/50 bg-primary/5"
                    : "border-border/50 bg-muted/20 hover:border-border",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-sm text-foreground">{order.code}</span>
                  <span className="text-[9px] uppercase font-bold text-muted-foreground">
                    {STATUS_LABEL[order.status]}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{order.customer_name}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
