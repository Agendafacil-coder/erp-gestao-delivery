import { createFileRoute } from "@tanstack/react-router";
import { PublicTrackingError, PublicTrackingLoading, PublicTrackingView } from "@/components/tracking/PublicTrackingView";
import type { TrackingSearchFlags } from "@/components/tracking/TrackingStatusBanners";
import { usePublicTracking } from "@/hooks/usePublicTracking";

function parseSearchFlags(s: Record<string, unknown>): TrackingSearchFlags {
  const str = (key: string) => s[key] === "1" || s[key] === 1;
  const payment = typeof s.payment === "string" ? s.payment : "";
  return {
    confirmed: str("confirmed"),
    paid: str("paid"),
    cancelled: str("cancelled"),
    paymentFailed: payment === "failed",
    paymentPending: payment === "pending",
  };
}

export const Route = createFileRoute("/rastreio/$orderId/$token")({
  validateSearch: (s: Record<string, unknown>) => parseSearchFlags(s),
  component: PublicTrackingPage,
});

function PublicTrackingPage() {
  const { orderId, token } = Route.useParams();
  const flags = Route.useSearch();
  const { data, setData, error, loading, reload, lastUpdatedAt } = usePublicTracking(orderId, token);

  if (error) return <PublicTrackingError message={error} />;
  if (loading && !data) return <PublicTrackingLoading />;
  if (!data) return <PublicTrackingError message="Pedido não encontrado" />;

  return (
    <PublicTrackingView
      data={data}
      orderId={orderId}
      token={token}
      flags={flags}
      lastUpdatedAt={lastUpdatedAt}
      onDataChange={(updater) => setData((prev) => (prev ? updater(prev) : prev))}
      onReload={() => void reload()}
    />
  );
}
