import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { LocalDriver, LocalOrder } from "@/lib/db/localDb";
import { ACTION_LABEL, getAvailableActions, type OrderAction } from "@/lib/ops/orderWorkflow";
import { useOps } from "@/hooks/useOps";

type Props = {
  order: LocalOrder;
  drivers?: LocalDriver[];
  compact?: boolean;
  onDone?: () => void;
};

export function OrderActions({ order, drivers = [], compact, onDone }: Props) {
  const { applyOrderAction } = useOps();
  const [loading, setLoading] = useState<OrderAction | null>(null);
  const [pickDriver, setPickDriver] = useState(false);

  const actions = getAvailableActions(order.status, {
    hasDriver: !!order.driver_id,
    pickedUp: !!order.picked_up_at,
    canAssignDriver: drivers.length > 0,
  });

  const run = async (action: OrderAction, driverId?: string) => {
    setLoading(action);
    try {
      await applyOrderAction(order.id, action, driverId);
      toast.success(`${ACTION_LABEL[action]} — ${order.code}`);
      setPickDriver(false);
      onDone?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(null);
    }
  };

  if (actions.length === 0) {
    return <p className="text-xs text-muted-foreground">Nenhuma ação disponível.</p>;
  }

  return (
    <div className={`flex flex-col gap-2 ${compact ? "" : "pt-1"}`}>
      <div className={`flex flex-wrap gap-2 ${compact ? "" : ""}`}>
        {actions.map((action) => {
          if (action === "atribuir_entregador" && pickDriver) return null;
          const isCancel = action === "cancelar";
          return (
            <button
              key={action}
              type="button"
              disabled={!!loading}
              onClick={() => {
                if (action === "atribuir_entregador") {
                  setPickDriver(true);
                  return;
                }
                if (action === "cancelar") {
                  if (!window.confirm(`Cancelar pedido ${order.code}?`)) return;
                }
                void run(action);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition disabled:opacity-50 ${
                isCancel
                  ? "border-danger/40 text-danger bg-danger/5 hover:bg-danger/10"
                  : "border-border bg-card hover:bg-muted text-foreground"
              }`}
            >
              {loading === action && <Loader2 className="size-3 animate-spin" />}
              {ACTION_LABEL[action]}
            </button>
          );
        })}
      </div>

      {pickDriver && (
        <div className="rounded-xl border border-border bg-muted/30 p-2.5 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Selecione o entregador</p>
          <div className="flex flex-wrap gap-2">
            {drivers
              .filter((d) => d.status === "disponivel" || d.status === "pausado")
              .map((d) => (
                <button
                  key={d.id}
                  type="button"
                  disabled={!!loading}
                  onClick={() => void run("atribuir_entregador", d.id)}
                  className="px-2.5 py-1 rounded-lg text-xs border border-primary/30 bg-primary/5 hover:bg-primary/10"
                >
                  {d.name}
                </button>
              ))}
          </div>
          <button
            type="button"
            className="text-xs text-muted-foreground hover:underline"
            onClick={() => setPickDriver(false)}
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}
