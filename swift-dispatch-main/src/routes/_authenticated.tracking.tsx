import { TrackingLiveView } from "@/components/ops/TrackingLiveView";
import { OpsPage } from "@/components/ops/OpsPage";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Bike, MapPin, Package, Radio } from "lucide-react";
import { useOps } from "@/hooks/useOps";
import { useTenant } from "@/hooks/useTenant";
import { isDriverActiveOrder } from "@/lib/ops/orderWorkflow";

export const Route = createFileRoute("/_authenticated/tracking")({
  component: TrackingPage,
});

function TrackingPage() {
  const { current } = useTenant();
  const { orders, drivers } = useOps();

  const stats = useMemo(() => {
    const active = orders.filter((o) => isDriverActiveOrder(o.status));
    const inRoute = active.filter((o) => o.status === "em_rota_entrega");
    const withGps = drivers.filter((d) => d.status !== "offline" && d.lat != null && d.lng != null);
    const online = drivers.filter((d) => d.status !== "offline");
    return { active: active.length, inRoute: inRoute.length, withGps: withGps.length, online: online.length };
  }, [orders, drivers]);

  return (
    <OpsPage className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-border/40 pb-4">
        <div>
          <div className="text-[10px] uppercase font-mono tracking-widest text-primary-glow font-bold">
            Operação · Tempo real
          </div>
          <h1 className="erp-page-title mt-1">
            Rastreio <span className="text-gradient">ao vivo</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Mapa, trajeto GPS, ETA com trânsito e alertas de proximidade.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <TrackingKpi icon={Package} label="Pedidos ativos" value={String(stats.active)} />
          <TrackingKpi icon={Bike} label="Em rota" value={String(stats.inRoute)} highlight />
          <TrackingKpi icon={Radio} label="Entregadores online" value={String(stats.online)} />
          <TrackingKpi icon={MapPin} label="Com GPS ativo" value={String(stats.withGps)} />
        </div>
      </div>

      {current ? (
        <TrackingLiveView tenantId={current.id} orders={orders} drivers={drivers} />
      ) : null}
    </OpsPage>
  );
}

function TrackingKpi({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: typeof Package;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 ${
        highlight
          ? "border-primary/30 bg-primary/5"
          : "border-border bg-card"
      }`}
    >
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <Icon className={`size-3.5 ${highlight ? "text-primary" : ""}`} />
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-bold font-mono tabular-nums text-foreground">{value}</p>
    </div>
  );
}
