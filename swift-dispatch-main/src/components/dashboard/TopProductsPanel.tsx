import { UtensilsCrossed } from "lucide-react";
import type { ProductRankRow } from "@/lib/ops/dashboardMetrics";
import { fmtBRL } from "@/lib/format/currency";

type Props = {
  products: ProductRankRow[];
  loading?: boolean;
};

export function TopProductsPanel({ products, loading }: Props) {
  const maxRevenue = Math.max(1, ...products.map((p) => p.revenue));

  return (
    <section className="erp-card flex flex-col h-full">
      <header className="erp-card-header">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <UtensilsCrossed className="size-4 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-sm">Produtos mais vendidos</h2>
            <p className="text-xs text-muted-foreground">Hoje · por faturamento</p>
          </div>
        </div>
      </header>
      <div className="flex-1 overflow-auto px-4 pb-4 space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Carregando itens…</p>
        ) : products.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Sem itens detalhados hoje. Os rankings aparecem quando os pedidos tiverem
            itens de cardápio.
          </p>
        ) : (
          products.map((p, i) => (
            <div key={`${p.name}-${i}`} className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="font-medium truncate">
                  <span className="text-muted-foreground mr-1.5 tabular-nums">{i + 1}.</span>
                  {p.name}
                </span>
                <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                  {p.quantity} un.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${(p.revenue / maxRevenue) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-semibold tabular-nums shrink-0">
                  {fmtBRL(p.revenue)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
