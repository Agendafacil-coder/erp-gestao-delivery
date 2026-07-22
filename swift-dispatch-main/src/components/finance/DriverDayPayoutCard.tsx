import { useEffect, useState } from "react";
import { Bike, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  listDriverEarningsFn,
  markDriverEarningsPaidFn,
} from "@/functions/featureFlags";
import { formatBRL } from "@/lib/finance/calculations";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

type Props = {
  tenantId: string | undefined;
  date: string;
};

export function DriverDayPayoutCard({ tenantId, date }: Props) {
  const { enabled: featureEnabled, loading: flagsLoading } = useFeatureFlags(tenantId);
  const commissionOn = featureEnabled("driver_commission");
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [data, setData] = useState<Awaited<ReturnType<typeof listDriverEarningsFn>> | null>(
    null,
  );

  const load = async () => {
    if (!tenantId || !commissionOn) {
      setData(null);
      return;
    }
    setLoading(true);
    try {
      const result = await listDriverEarningsFn({
        data: { tenantId, from: date, to: date },
      });
      setData(result);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload on date/tenant/flag
  }, [tenantId, date, commissionOn]);

  if (flagsLoading || !tenantId || !commissionOn) return null;

  const handleMarkPaid = async () => {
    if (!tenantId || !data?.unpaid) return;
    setPaying(true);
    try {
      const res = await markDriverEarningsPaidFn({
        data: { tenantId, from: date, to: date },
      });
      toast.success(
        res.updated
          ? `${res.updated} comissão(ões) marcada(s) como paga(s)`
          : "Nada pendente para marcar",
      );
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao marcar pagamento");
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="rounded-xl border border-border/50 bg-muted/20 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <Bike className="size-3.5" />
          Repasse entregadores
        </p>
        {loading ? <Loader2 className="size-3.5 animate-spin text-muted-foreground" /> : null}
      </div>

      {!data || data.by_driver.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem comissões neste dia.</p>
      ) : (
        <>
          {data.by_driver.map((d) => (
            <div key={d.driver_id} className="flex justify-between text-sm gap-2">
              <span>
                {d.driver_name}{" "}
                <span className="text-muted-foreground text-xs">({d.deliveries})</span>
              </span>
              <span className="font-mono tabular-nums shrink-0">
                {formatBRL(d.total)}
                {d.unpaid > 0 && d.unpaid < d.total - 0.001 ? (
                  <span className="text-warning text-xs ml-1">
                    · a pagar {formatBRL(d.unpaid)}
                  </span>
                ) : d.unpaid > 0 ? (
                  <span className="text-warning text-xs ml-1">· a pagar</span>
                ) : (
                  <span className="text-success text-xs ml-1">· pago</span>
                )}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40">
            <p className="text-xs text-muted-foreground">
              Total {formatBRL(data.total)} · pendente {formatBRL(data.unpaid)}
            </p>
            {data.unpaid > 0 ? (
              <button
                type="button"
                disabled={paying}
                onClick={() => void handleMarkPaid()}
                className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
              >
                {paying ? "Marcando…" : "Marcar dia como pago"}
              </button>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
