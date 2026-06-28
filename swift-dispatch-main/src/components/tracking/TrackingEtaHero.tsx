import type { CSSProperties } from "react";
import { Bike, CheckCircle2, Clock } from "lucide-react";
import {
  estimateTrackingEtaMinutes,
  isTrackingCancelled,
  isTrackingComplete,
  trackingSlaProgress,
  trackingStatusHeadline,
  trackingStatusSubline,
} from "@/lib/ops/trackingTimeline";
import type { PublicTrackingPayload } from "@/functions/tracking";

type TrackingEtaHeroProps = {
  data: PublicTrackingPayload;
};

export function TrackingEtaHero({ data }: TrackingEtaHeroProps) {
  const elapsed = Math.max(
    0,
    Math.floor((Date.now() - new Date(data.order.placed_at).getTime()) / 60000),
  );
  const eta = estimateTrackingEtaMinutes(data.order.status, data.order.sla_minutes, elapsed);
  const slaProgress = trackingSlaProgress(data.order.sla_minutes, elapsed);
  const cancelled = isTrackingCancelled(data.order.status);
  const delivered = isTrackingComplete(data.order.status);
  const inRoute = data.order.status === "em_rota_entrega";

  return (
    <section className="tracking-eta-hero">
      <div className="tracking-eta-hero__glow" aria-hidden />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/80">
            {data.order.code}
          </p>
          <h1 className="mt-1 text-xl font-display font-bold text-white leading-tight">
            {trackingStatusHeadline(data.order.status)}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {trackingStatusSubline(data.order.status, eta)}
          </p>
        </div>

        {!cancelled && !delivered && (
          <div className="tracking-eta-ring shrink-0" style={{ "--progress": `${slaProgress}%` } as CSSProperties}>
            <div className="tracking-eta-ring__inner">
              <Clock className="size-4 text-primary mb-0.5" />
              <span className="text-2xl font-bold font-mono tabular-nums text-white leading-none">
                {eta}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground">min</span>
            </div>
          </div>
        )}

        {delivered && (
          <div className="tracking-eta-ring tracking-eta-ring--success shrink-0">
            <div className="tracking-eta-ring__inner">
              <CheckCircle2 className="size-8 text-success" />
            </div>
          </div>
        )}
      </div>

      {!cancelled && !delivered && (
        <div className="mt-4 space-y-1.5">
          <div className="flex justify-between text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            <span>Progresso do pedido</span>
            <span>{slaProgress}% do prazo</span>
          </div>
          <div className="tracking-sla-bar">
            <div
              className="tracking-sla-bar__fill"
              style={{ width: `${slaProgress}%` }}
            />
          </div>
        </div>
      )}

      {inRoute && data.driver && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-success/25 bg-success/10 px-3 py-2.5">
          <div className="flex size-10 items-center justify-center rounded-xl bg-success/15 text-success font-bold text-sm">
            {data.driver.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white flex items-center gap-1.5">
              <Bike className="size-4 text-success" />
              {data.driver.name}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {data.order.driver_distance_m != null
                ? `A ~${data.order.driver_distance_m < 1000 ? `${data.order.driver_distance_m} m` : `${(data.order.driver_distance_m / 1000).toFixed(1)} km`} de você`
                : "Entregador a caminho"}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
