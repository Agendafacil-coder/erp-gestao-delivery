import { useEffect, useState } from "react";

type Line = { name: string; quantity: number; unit_price: number; notes: string | null };

export function OrderLineItems({ orderId, tenantId }: { orderId: string; tenantId: string }) {
  const [items, setItems] = useState<Line[]>([]);

  useEffect(() => {
    const url = `/api/orders/line-items?orderId=${encodeURIComponent(orderId)}&tenantId=${encodeURIComponent(tenantId)}`;
    void fetch(url)
      .then((r) => (r.ok ? r.json() : []))
      .then(setItems)
      .catch(() => setItems([]));
  }, [orderId, tenantId]);

  if (!items.length) {
    return (
      <div className="text-xs text-muted-foreground italic">Sem itens detalhados</div>
    );
  }

  return (
    <div className="text-xs font-medium text-white/95 space-y-1">
      {items.map((item, i) => (
        <div key={i} className="flex justify-between items-center py-0.5">
          <span>
            {item.quantity}x {item.name}
          </span>
          <span className="text-muted-foreground font-mono">
            R$ {(item.unit_price * item.quantity).toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  );
}
