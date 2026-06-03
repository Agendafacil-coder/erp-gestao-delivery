import type { DriverOrderView } from "@/functions/driverOps";
import { buildGoogleMapsDirectionsUrl, buildWazeUrl } from "@/lib/drivers/driverMaps";
import { STATUS_LABEL, normalizeOrderStatus } from "@/lib/ops/orderWorkflow";
import { MapPin, Navigation, Phone } from "lucide-react";

type Props = {
  order: DriverOrderView;
  storeLabel?: string;
  storeAddress?: string;
  onRetirei?: () => void;
  onSaiu?: () => void;
  onEntregue?: () => void;
  busy?: boolean;
};

export function DriverOrderCard({
  order,
  storeLabel = "Restaurante",
  storeAddress,
  onRetirei,
  onSaiu,
  onEntregue,
  busy,
}: Props) {
  const status = normalizeOrderStatus(order.status);
  const pickedUp = !!order.picked_up_at;
  const navTarget = status === "aguardando_entregador" && !pickedUp
    ? { address: storeAddress, lat: null, lng: null }
    : { address: order.address, lat: order.lat, lng: order.lng };

  return (
    <article className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-base font-bold text-foreground">{order.code}</p>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide mt-0.5">
            {STATUS_LABEL[status]}
          </p>
        </div>
        <span className="text-xs font-semibold text-success tabular-nums">
          R$ {order.driver_payout.toFixed(2)}
        </span>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex gap-2">
          <span className="shrink-0 size-6 rounded-full bg-danger/10 text-danger text-[10px] font-bold flex items-center justify-center">
            LJ
          </span>
          <div className="min-w-0">
            <p className="font-medium text-foreground">{storeLabel}</p>
            {storeAddress && (
              <p className="text-xs text-muted-foreground truncate">{storeAddress}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <MapPin className="size-4 text-success shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="font-medium text-foreground">{order.customer_name}</p>
            <p className="text-xs text-muted-foreground">{order.address}</p>
            {order.customer_phone && (
              <a
                href={`tel:${order.customer_phone.replace(/\D/g, "")}`}
                className="inline-flex items-center gap-1 text-xs text-primary mt-1"
              >
                <Phone className="size-3" />
                {order.customer_phone}
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <a
          href={buildGoogleMapsDirectionsUrl(navTarget)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 inline-flex items-center justify-center gap-1.5 min-h-[2.75rem] py-2.5 rounded-xl border border-border bg-muted/40 text-xs font-semibold"
        >
          <Navigation className="size-3.5" />
          Maps
        </a>
        <a
          href={buildWazeUrl(navTarget)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 inline-flex items-center justify-center gap-1.5 min-h-[2.75rem] py-2.5 rounded-xl border border-border bg-muted/40 text-xs font-semibold"
        >
          Waze
        </a>
      </div>

      <div className="flex flex-col gap-2">
        {(status === "aguardando_entregador" || status === "pronto") && !pickedUp && onRetirei && (
          <button
            type="button"
            disabled={busy}
            onClick={onRetirei}
            className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-50"
          >
            Retirei o pedido
          </button>
        )}
        {status === "aguardando_entregador" && pickedUp && onSaiu && (
          <button
            type="button"
            disabled={busy}
            onClick={onSaiu}
            className="w-full py-3.5 rounded-xl bg-warning text-black font-bold text-sm disabled:opacity-50"
          >
            Saiu para entrega
          </button>
        )}
        {status === "em_rota_entrega" && onEntregue && (
          <button
            type="button"
            disabled={busy}
            onClick={onEntregue}
            className="w-full py-3.5 rounded-xl bg-success text-black font-bold text-sm disabled:opacity-50"
          >
            Entregue
          </button>
        )}
      </div>
    </article>
  );
}
