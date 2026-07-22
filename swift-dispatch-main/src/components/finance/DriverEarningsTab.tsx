import { useEffect, useState } from "react";
import { Bike, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  listDriverEarningsFn,
  markDriverEarningsPaidFn,
} from "@/functions/featureFlags";
import { fmtBRL } from "@/lib/format/currency";
import { AppCard, AppCardHeader, AppCardTitle } from "@/components/design/AppCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { todayIsoDate } from "./FinancialDateFilter";

type Props = {
  tenantId: string | undefined;
};

export function DriverEarningsTab({ tenantId }: Props) {
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [from, setFrom] = useState(todayIsoDate());
  const [to, setTo] = useState(todayIsoDate());
  const [data, setData] = useState<Awaited<ReturnType<typeof listDriverEarningsFn>> | null>(null);

  const load = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const result = await listDriverEarningsFn({ data: { tenantId, from, to } });
      setData(result);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, from, to]);

  const handleMarkPaid = async () => {
    if (!tenantId) return;
    setPaying(true);
    try {
      const res = await markDriverEarningsPaidFn({ data: { tenantId, from, to } });
      toast.success(
        res.updated ? `${res.updated} marcada(s) como paga(s)` : "Nada pendente neste período",
      );
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao marcar pagamento");
    } finally {
      setPaying(false);
    }
  };

  if (!tenantId) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">De</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Até</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9" />
        </div>
        <button
          type="button"
          onClick={() => void handleMarkPaid()}
          disabled={paying || !data?.unpaid}
          className="erp-btn-primary text-xs h-9 disabled:opacity-50"
        >
          {paying ? <Loader2 className="size-3.5 animate-spin" /> : "Marcar período como pago"}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <MiniStat label="Total comissões" value={fmtBRL(data?.total ?? 0)} />
        <MiniStat label="A pagar" value={fmtBRL(data?.unpaid ?? 0)} tone="warning" />
        <MiniStat label="Registros" value={String(data?.rows.length ?? 0)} />
      </div>

      {data?.by_driver?.length ? (
        <AppCard>
          <AppCardHeader className="border-b border-border/40">
            <AppCardTitle className="text-sm">Por entregador (período)</AppCardTitle>
          </AppCardHeader>
          <div className="p-3 space-y-2">
            {data.by_driver.map((d) => (
              <div key={d.driver_id} className="flex justify-between text-sm gap-2">
                <span>
                  {d.driver_name}{" "}
                  <span className="text-muted-foreground text-xs">({d.deliveries} entregas)</span>
                </span>
                <span className="font-mono tabular-nums">
                  {fmtBRL(d.total)}
                  {d.unpaid > 0 ? (
                    <span className="text-warning text-xs ml-1">· {fmtBRL(d.unpaid)} a pagar</span>
                  ) : null}
                </span>
              </div>
            ))}
          </div>
        </AppCard>
      ) : null}

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
            Nenhuma comissão neste período. Ative em Sistema → Configurações → Mais recursos.
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
