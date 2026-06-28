import { CheckCircle2 } from "lucide-react";
import {
  TRACKING_TIMELINE_STEPS,
  trackingStageIndex,
  isTrackingCancelled,
} from "@/lib/ops/trackingTimeline";

type TrackingTimelineProps = {
  status: string;
};

export function TrackingTimeline({ status }: TrackingTimelineProps) {
  const currentStage = trackingStageIndex(status);
  const isCancelled = isTrackingCancelled(status);

  return (
    <div className="glass-strong rounded-2xl p-5 border border-border">
      <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
        Status do pedido
      </h2>
      {!isCancelled ? (
        <ol className="space-y-0">
          {TRACKING_TIMELINE_STEPS.map((step, i) => {
            const done = i <= currentStage;
            const active = i === currentStage;
            return (
              <li key={step.key} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`size-7 rounded-full flex items-center justify-center border ${
                      done
                        ? "bg-success/20 border-success text-success"
                        : "bg-surface border-border text-muted-foreground"
                    } ${active ? "ring-2 ring-success/40" : ""}`}
                  >
                    {done ? (
                      <CheckCircle2 className="size-4" />
                    ) : (
                      <span className="text-[10px]">{i + 1}</span>
                    )}
                  </div>
                  {i < TRACKING_TIMELINE_STEPS.length - 1 && (
                    <div
                      className={`w-0.5 flex-1 min-h-[24px] ${done ? "bg-success/40" : "bg-border"}`}
                    />
                  )}
                </div>
                <div className={`pb-5 ${active ? "text-white" : "text-muted-foreground"}`}>
                  <div className="text-sm font-medium">{step.label}</div>
                  {active && <p className="text-[10px] mt-0.5 text-primary">Atualizado agora</p>}
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="text-sm text-muted-foreground">
          A linha do tempo não está disponível para pedidos cancelados.
        </p>
      )}
    </div>
  );
}
