import { MapPin } from "lucide-react";
import type { RegionRankRow } from "@/lib/ops/dashboardMetrics";
import { fmtBRL } from "@/lib/format/currency";

type Props = {
  regions: RegionRankRow[];
};

export function TopRegionsPanel({ regions }: Props) {
  const maxRevenue = Math.max(1, ...regions.map((r) => r.revenue));

  return (
    <section className="erp-card flex flex-col h-full">
      <header className="erp-card-header">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <MapPin className="size-4 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-sm">Bairros e regiões</h2>
            <p className="text-xs text-muted-foreground">Ranking do dia</p>
          </div>
        </div>
      </header>
      <div className="flex-1 overflow-auto px-4 pb-4 space-y-3">
        {regions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Nenhum pedido com endereço hoje.
          </p>
        ) : (
          regions.map((r, i) => (
            <div key={`${r.region}-${i}`} className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="font-medium truncate">
                  <span className="text-muted-foreground mr-1.5 tabular-nums">{i + 1}.</span>
                  {r.region}
                </span>
                <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                  {r.orders} ped.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent transition-all"
                    style={{ width: `${(r.revenue / maxRevenue) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-semibold tabular-nums shrink-0">
                  {fmtBRL(r.revenue)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
