import { useEffect, useState } from "react";
import { Bike, Loader2 } from "lucide-react";
import { listDriverEarningsFn } from "@/functions/featureFlags";
import { fmtBRL } from "@/lib/format/currency";
import { AppCard, AppCardHeader, AppCardTitle } from "@/components/design/AppCard";

type Props = {
  tenantId: string | undefined;
};

export function DriverEarningsTab({ tenantId }: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Awaited<ReturnType<typeof listDriverEarningsFn>> | null>(null);

  const load = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const result = await listDriverEarningsFn({ data: { tenantId } });
      setData(result);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [tenantId]);

  if (!tenantId) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <MiniStat label="Total comissões" value={fmtBRL(data?.total ?? 0)} />
        <MiniStat label="A pagar" value={fmtBRL(data?.unpaid ?? 0)} tone="warning" />
        <MiniStat label="Registros" value={String(data?.rows.length ?? 0)} />
      </div>

      <AppCard>
        <AppCardHeader className="border-b border-border/40 flex flex-row items-center justify-between">
          <AppCardTitle className="flex items-center gap-2">
            <Bike className="size-4" />
            Comissões por entrega
          </AppCardTitle>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="erp-btn-secondary text-xs"
          >
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : "Atualizar"}
          </button>
        </AppCardHeader>
        {loading && !data ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Carregando…</p>
        ) : !data?.rows.length ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            Nenhuma comissão registrada. Ative em Minha loja → Impressão e extras → Mais recursos.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wide text-muted-foreground border-b border-border/40">
                  <th className="px-4 py-2">Pedido</th>
                  <th className="px-4 py-2">Entregador</th>
                  <th className="px-4 py-2 text-right">Valor</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/30">
                    <td className="px-4 py-2.5 font-mono font-semibold">{r.order_code}</td>
                    <td className="px-4 py-2.5">{r.driver_name}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{fmtBRL(r.amount)}</td>
                    <td className="px-4 py-2.5 text-xs">
                      {r.paid_at ? (
                        <span className="text-success">Pago</span>
                      ) : (
                        <span className="text-warning">Pendente</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AppCard>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "warning";
}) {
  return (
    <div className="erp-card p-3.5">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={`text-xl font-bold tabular-nums mt-1 ${tone === "warning" ? "text-warning" : "text-foreground"}`}
      >
        {value}
      </p>
    </div>
  );
}
