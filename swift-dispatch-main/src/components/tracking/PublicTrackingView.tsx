import { useMemo, type CSSProperties } from "react";
import { Bike, CheckCircle2, Clock, MapPin, Navigation, Store } from "lucide-react";
import { OpsMapbox, type MapMarker } from "@/components/map/OpsMapbox";
import type { PublicTrackingPayload } from "@/functions/tracking";
import { STATUS_LABEL } from "@/lib/ops/orderWorkflow";
import { isTrackingComplete } from "@/lib/ops/trackingTimeline";
import { TrackingEtaHero } from "@/components/tracking/TrackingEtaHero";
import { TrackingLiveBadge } from "@/components/tracking/TrackingLiveBadge";
import { TrackingOrderDetails } from "@/components/tracking/TrackingOrderDetails";
import { TrackingPaymentSection } from "@/components/tracking/TrackingPaymentSection";
import { TrackingReviewSection } from "@/components/tracking/TrackingReviewSection";
import { TrackingStepper } from "@/components/tracking/TrackingStepper";
import {
  TrackingStatusBanners,
  type TrackingSearchFlags,
} from "@/components/tracking/TrackingStatusBanners";

type PublicTrackingViewProps = {
  data: PublicTrackingPayload;
  orderId: string;
  token: string;
  flags: TrackingSearchFlags;
  lastUpdatedAt: Date | null;
  onDataChange: (updater: (prev: PublicTrackingPayload) => PublicTrackingPayload) => void;
  onReload: () => void;
};

export function PublicTrackingView({
  data,
  orderId,
  token,
  flags,
  lastUpdatedAt,
  onDataChange,
  onReload,
}: PublicTrackingViewProps) {
  const delivered = isTrackingComplete(data.order.status);

  const markers = useMemo((): MapMarker[] => {
    const list: MapMarker[] = [];
    if (data.store) {
      list.push({
        id: "store",
        lng: data.store.lng,
        lat: data.store.lat,
        label: data.store.name,
        kind: "store",
        color: "#f59e0b",
      });
    }
    if (data.order.lat != null && data.order.lng != null) {
      list.push({
        id: "order",
        lng: data.order.lng,
        lat: data.order.lat,
        label: "Você",
        kind: "order",
        color: "#818cf8",
      });
    }
    if (data.driver?.lat != null && data.driver.lng != null) {
      list.push({
        id: "driver",
        lng: data.driver.lng,
        lat: data.driver.lat,
        label: data.driver.name,
        kind: "driver",
        color: "#22c55e",
      });
    }
    return list;
  }, [data]);

  const routeLine = useMemo(() => {
    if (!data.driver?.lat || !data.order.lat) return null;
    return {
      from: { lng: data.driver.lng!, lat: data.driver.lat! },
      to: { lng: data.order.lng!, lat: data.order.lat! },
    };
  }, [data]);

  const trailCoordinates = useMemo(() => {
    if (!data.trail?.length) return [];
    return data.trail.map((p) => ({ lng: p.lng, lat: p.lat }));
  }, [data.trail]);

  const restaurantInitial = data.restaurant.name.charAt(0).toUpperCase();

  return (
    <div className="tracking-page min-h-screen">
      <div className="tracking-page__ambient" aria-hidden />

      <header className="tracking-page__header">
        <div className="flex items-center gap-3 min-w-0">
          <div className="tracking-restaurant-logo">
            {data.restaurant.logo_url ? (
              <img src={data.restaurant.logo_url} alt="" className="size-full object-cover" />
            ) : (
              restaurantInitial
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-display font-bold text-white truncate">
              {data.restaurant.name}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Rastreio em tempo real
            </p>
          </div>
        </div>
        <TrackingLiveBadge lastUpdatedAt={lastUpdatedAt} isDelivered={delivered} />
      </header>

      <main className="tracking-page__main">
        <TrackingStatusBanners data={data} flags={flags} />

        <TrackingEtaHero data={data} />

        <TrackingStepper status={data.order.status} />

        <section className="tracking-map-wrap">
          <OpsMapbox
            className="h-[min(52vh,22rem)] w-full"
            markers={markers}
            showRouteLine={!!routeLine}
            routeFrom={routeLine?.from}
            routeTo={routeLine?.to}
            trailCoordinates={trailCoordinates}
            zoom={13}
            showMarkerLabels
          />
          <div className="tracking-map-legend">
            {data.store && (
              <span className="tracking-map-legend__item">
                <Store className="size-3 text-amber-400" /> Loja
              </span>
            )}
            <span className="tracking-map-legend__item">
              <MapPin className="size-3 text-indigo-400" /> Destino
            </span>
            {data.driver && (
              <span className="tracking-map-legend__item">
                <Bike className="size-3 text-green-400" /> Entregador
              </span>
            )}
            {trailCoordinates.length >= 2 && (
              <span className="tracking-map-legend__item">
                <Navigation className="size-3 text-green-400" /> Trajeto
              </span>
            )}
          </div>
        </section>

        <section className="tracking-card tracking-card--compact">
          <div className="flex flex-wrap items-center gap-2">
            <span className="tracking-pill tracking-pill--status">
              {STATUS_LABEL[data.order.status] ?? data.order.status}
            </span>
            <span
              className={
                data.order.payment_status === "pago"
                  ? "tracking-pill tracking-pill--paid"
                  : "tracking-pill tracking-pill--pending"
              }
            >
              {data.order.payment_status === "pago" ? "Pago" : "Aguardando pagamento"}
            </span>
          </div>

          {data.order.payment_status === "pendente" && (
            <div className="mt-4">
              <TrackingPaymentSection
                data={data}
                orderId={orderId}
                token={token}
                onPaymentConfirmed={onReload}
              />
            </div>
          )}
        </section>

        <TrackingOrderDetails data={data} orderId={orderId} token={token} />

        <TrackingReviewSection
          orderId={orderId}
          token={token}
          data={data}
          onReviewSubmitted={(review) => onDataChange((prev) => ({ ...prev, review }))}
        />
      </main>

      <footer className="tracking-page__footer">
        <p className="text-[10px] text-muted-foreground text-center">
          Atualização automática a cada 5 segundos · Delivery OS
        </p>
      </footer>
    </div>
  );
}

export function PublicTrackingError({ message }: { message: string }) {
  return (
    <div className="tracking-page min-h-screen flex items-center justify-center p-6">
      <div className="tracking-card text-center max-w-sm w-full">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted/40">
          <MapPin className="size-7 text-muted-foreground" />
        </div>
        <h1 className="text-lg font-semibold text-white">Link inválido</h1>
        <p className="text-sm text-muted-foreground mt-2">{message}</p>
      </div>
    </div>
  );
}

export function PublicTrackingLoading() {
  return (
    <div className="tracking-page min-h-screen">
      <div className="tracking-page__header">
        <div className="flex items-center gap-3">
          <div className="tracking-skeleton size-11 rounded-2xl" />
          <div className="space-y-2">
            <div className="tracking-skeleton h-4 w-32 rounded" />
            <div className="tracking-skeleton h-3 w-24 rounded" />
          </div>
        </div>
      </div>
      <main className="tracking-page__main space-y-4">
        <div className="tracking-skeleton h-40 rounded-2xl" />
        <div className="tracking-skeleton h-16 rounded-2xl" />
        <div className="tracking-skeleton h-[min(52vh,22rem)] rounded-2xl" />
        <div className="tracking-skeleton h-24 rounded-2xl" />
      </main>
    </div>
  );
}
