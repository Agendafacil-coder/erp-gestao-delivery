import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, Scale } from "lucide-react";
import { toast } from "sonner";
import {
  getIfoodReconciliationComparisonFn,
  importIfoodReconciliationFn,
  type IfoodReconciliationComparison,
} from "@/functions/ifoodFinancial";
import { AppCard, AppCardHeader, AppCardTitle } from "@/components/design/AppCard";
import { fmtBRL } from "@/lib/format/currency";
import { cn } from "@/lib/utils";

type Props = {
  tenantId: string | undefined;
};

function monthInputValue(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function IfoodReconciliationPanel({ tenantId }: Props) {
  const [competence, setCompetence] = useState(() => monthInputValue());
  const [data, setData] = useState<IfoodReconciliationComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const row = await getIfoodReconciliationComparisonFn({
        data: { tenantId, competence },
      });
      setData(row);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao carregar conciliação");
    } finally {
      setLoading(false);
    }
  }, [tenantId, competence]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleImport = async () => {
    if (!tenantId) return;
    setImporting(true);
    try {
      const row = await importIfoodReconciliationFn({ data: { tenantId, competence } });
      setData(row);
      toast.success("Conciliação iFood importada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao importar do iFood");
    } finally {
      setImporting(false);
    }
  };

  if (!tenantId) return null;

  return (
    <AppCard>
      <AppCardHeader className="border-b border-border/40 flex flex-row items-center justify-between gap-3">
        <AppCardTitle className="flex items-center gap-2">
          <Scale className="size-4" />
          Conferência iFood
        </AppCardTitle>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={competence}
            onChange={(e) => setCompetence(e.target.value)}
            className="h-8 rounded-lg border border-border bg-background px-2 text-xs"
          />
          <button
            type="button"
            onClick={() => void handleImport()}
            disabled={importing}
            className="erp-btn-primary text-xs py-1.5"
          >
            {importing ? <Loader2 className="size-3.5 animate-spin" /> : "Buscar do iFood"}
          </button>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="erp-btn-secondary text-xs py-1.5"
          >
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
          </button>
        </div>
      </AppCardHeader>

      <div className="p-4 space-y-4">
        <p className="text-xs text-muted-foreground">
          Compare os pedidos registrados aqui com o extrato do iFood. Conecte a loja em Sistema →
          Automações → iFood antes de usar.
        </p>

        {loading && !data ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
            <Loader2 className="size-4 animate-spin" />
            Carregando…
          </div>
        ) : data ? (
          <div className="grid sm:grid-cols-2 gap-4">
            <CompareBlock
              title="Neste sistema"
              orders={data.local.orders_count}
              gross={data.local.gross_amount}
              net={data.local.gross_amount - data.local.delivery_fees}
            />
            <CompareBlock
              title="iFood (importado)"
              orders={data.ifood.ordersCount}
              gross={data.ifood.grossAmount}
              net={data.ifood.netAmount}
              fees={data.ifood.feesAmount}
            />
          </div>
        ) : null}

        {data && (data.delta_orders != null || data.delta_gross != null) ? (
          <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-sm space-y-1">
            <p className="font-medium">Diferenças</p>
            {data.delta_orders != null ? (
              <p className="text-muted-foreground">
                Pedidos: {data.delta_orders > 0 ? "+" : ""}
                {data.delta_orders} vs iFood
              </p>
            ) : null}
            {data.delta_gross != null ? (
              <p className="text-muted-foreground">
                Bruto local vs iFood: {data.delta_gross > 0 ? "+" : ""}
                {fmtBRL(data.delta_gross)}
              </p>
            ) : null}
            {data.ifood.downloadUrl ? (
              <a
                href={data.ifood.downloadUrl}
                target="_blank"
                rel="noreferrer"
                className="text-primary text-xs font-medium hover:underline inline-block mt-1"
              >
                Baixar planilha do iFood (link válido por tempo limitado)
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
    </AppCard>
  );
}

function CompareBlock({
  title,
  orders,
  gross,
  net,
  fees,
}: {
  title: string;
  orders: number | null;
  gross: number | null;
  net: number | null;
  fees?: number | null;
}) {
  return (
    <div className="rounded-xl border border-border/50 p-4 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <p className="text-sm">
        Pedidos: <span className="font-semibold tabular-nums">{orders ?? "—"}</span>
      </p>
      <p className="text-sm">
        Bruto:{" "}
        <span className="font-semibold tabular-nums">{gross != null ? fmtBRL(gross) : "—"}</span>
      </p>
      {fees != null ? (
        <p className="text-sm text-muted-foreground">
          Taxas iFood: <span className="tabular-nums">{fmtBRL(fees)}</span>
        </p>
      ) : null}
      <p className="text-sm">
        Líquido:{" "}
        <span className="font-semibold tabular-nums">{net != null ? fmtBRL(net) : "—"}</span>
      </p>
    </div>
  );
}
