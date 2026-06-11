import { OpsPage } from "@/components/ops/OpsPage";
import { TrackingLiveView } from "@/components/ops/TrackingLiveView";
import { createFileRoute } from "@tanstack/react-router";
import { useOps } from "@/hooks/useOps";
import { useTenant } from "@/hooks/useTenant";

export const Route = createFileRoute("/_authenticated/tracking")({
  component: TrackingPage,
});

function TrackingPage() {
  const { current } = useTenant();
  const { orders, drivers } = useOps();

  return (
    <OpsPage className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-border/40 pb-4">
        <div>
          <div className="text-[10px] uppercase font-mono tracking-widest text-primary-glow font-bold">
            Operação · Tempo real
          </div>
          <h1 className="erp-page-title mt-1">
            Rastreio <span className="text-gradient">ao vivo</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Posição dos entregadores, pedidos em andamento e trajeto GPS no mapa.
          </p>
        </div>
      </div>

      {current ? (
        <TrackingLiveView tenantId={current.id} orders={orders} drivers={drivers} />
      ) : null}
    </OpsPage>
  );
}
