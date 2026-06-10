import { AlertTriangle, Boxes, Loader2, Package, PiggyBank } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { AppCard, AppCardHeader, AppCardTitle } from "@/components/design/AppCard";
import { useInventoryOverview } from "@/hooks/useInventoryOverview";
import { fmtBRL } from "@/lib/format/currency";
import { marginPct } from "@/lib/finance/inventorySummary";
import { cn } from "@/lib/utils";

type Props = {
  tenantId: string | undefined;
};

export function InventoryCmvTab({ tenantId }: Props) {
  const { overview, items, loading } = useInventoryOverview(tenantId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
        <Loader2 className="size-5 animate-spin" />
        <span className="text-sm">Carregando cardápio…</span>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <AppCard className="p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Nenhum produto no cardápio.{" "}
          <Link to="/cardapio" className="text-primary font-medium hover:underline">
            Cadastre itens
          </Link>{" "}
          para controlar CMV e estoque.
        </p>
      </AppCard>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={PiggyBank}
          label="Cobertura de custo"
          value={`${overview.costCoveragePct}%`}
          sub={`${overview.withUnitCost} de ${overview.totalProducts} produtos`}
          tone={overview.costCoveragePct >= 80 ? "success" : "warning"}
        />
        <StatCard
          icon={Package}
          label="Sem custo cadastrado"
          value={String(overview.withoutUnitCost)}
          sub="Usam estimativa de 65% no CMV"
          tone={overview.withoutUnitCost > 0 ? "warning" : "default"}
        />
        <StatCard
          icon={Boxes}
          label="Estoque controlado"
          value={String(overview.trackedStock)}
          sub="Baixa automática na entrega"
        />
        <StatCard
          icon={AlertTriangle}
          label="Estoque baixo"
          value={String(overview.lowStock.length)}
          sub="Abaixo do mínimo configurado"
          tone={overview.lowStock.length > 0 ? "warning" : "default"}
        />
      </div>

      {overview.costCoveragePct < 100 ? (
        <div className="rounded-2xl border border-warning/30 bg-warning/[0.06] px-4 py-3 text-sm">
          <p className="font-medium text-foreground">
            {overview.withoutUnitCost} produto(s) sem custo unitário
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Cadastre o custo em{" "}
            <Link to="/cardapio" className="text-primary font-medium hover:underline">
              Cardápio → editar produto
            </Link>{" "}
            para lucro real no resumo financeiro.
          </p>
        </div>
      ) : null}

      <AppCard>
        <AppCardHeader className="border-b border-border/40">
          <AppCardTitle>Produtos — custo e estoque</AppCardTitle>
        </AppCardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border/40">
                <th className="px-4 py-3 font-semibold">Produto</th>
                <th className="px-4 py-3 font-semibold text-right">Preço</th>
                <th className="px-4 py-3 font-semibold text-right">Custo</th>
                <th className="px-4 py-3 font-semibold text-right">Margem</th>
                <th className="px-4 py-3 font-semibold text-right">Estoque</th>
                <th className="px-4 py-3 font-semibold text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const margin = marginPct(item.price, item.unit_cost);
                const low =
                  item.stock_quantity != null &&
                  item.stock_quantity <= (item.stock_min ?? 0);
                const noCost = item.unit_cost == null || item.unit_cost <= 0;

                return (
                  <tr
                    key={item.id}
                    className="border-b border-border/30 last:border-0 hover:bg-muted/20"
                  >
                    <td className="px-4 py-3 font-medium text-foreground max-w-[200px] truncate">
                      {item.name}
                      {!item.available ? (
                        <span className="ml-1.5 text-[10px] text-muted-foreground">(pausado)</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{fmtBRL(item.price)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {noCost ? (
                        <span className="text-warning">—</span>
                      ) : (
                        fmtBRL(item.unit_cost!)
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {margin != null ? `${margin}%` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {item.stock_quantity != null ? item.stock_quantity : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {low ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase text-warning">
                          <AlertTriangle className="size-3" />
                          Baixo
                        </span>
                      ) : noCost ? (
                        <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                          Sem custo
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold uppercase text-success">OK</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </AppCard>

      <p className="text-xs text-muted-foreground leading-relaxed">
        Ao marcar um pedido como <strong className="text-foreground font-medium">entregue</strong>,
        o sistema grava entradas de CMV por item e reduz o estoque dos produtos com quantidade
        cadastrada. Deixe estoque em branco para não controlar aquele produto.
      </p>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = "default",
}: {
  icon: typeof Package;
  label: string;
  value: string;
  sub: string;
  tone?: "default" | "success" | "warning";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-4 shadow-[var(--shadow-card)]",
        tone === "warning" && "border-warning/25",
        tone === "success" && "border-success/25",
        tone === "default" && "border-border/50",
      )}
    >
      <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
        <Icon
          className={cn(
            "size-3.5",
            tone === "warning" && "text-warning",
            tone === "success" && "text-success",
            tone === "default" && "text-primary",
          )}
        />
        {label}
      </div>
      <div className="text-2xl font-bold mt-2 tabular-nums">{value}</div>
      <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>
    </div>
  );
}
