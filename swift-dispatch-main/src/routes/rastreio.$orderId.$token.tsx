import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { getPublicTrackingFn, type PublicTrackingPayload } from "@/functions/tracking";
import { submitOrderReviewFn } from "@/functions/reviews";
import { toast } from "sonner";
import { OpsMapbox, type MapMarker } from "@/components/map/OpsMapbox";
import { Package, Bike, CheckCircle2, Clock, MapPin, Zap, Copy, Navigation, Star } from "lucide-react";
import { STATUS_LABEL } from "@/lib/ops/orderWorkflow";
import {
  TRACKING_TIMELINE_STEPS,
  trackingStageIndex,
  isTrackingCancelled,
  estimateTrackingEtaMinutes,
} from "@/lib/ops/trackingTimeline";

export const Route = createFileRoute("/rastreio/$orderId/$token")({
  validateSearch: (s: Record<string, unknown>) => ({
    confirmed: s.confirmed === "1" || s.confirmed === 1,
  }),
  component: PublicTrackingPage,
});

function PublicTrackingPage() {
  const { orderId, token } = Route.useParams();
  const { confirmed } = Route.useSearch();
  const [data, setData] = useState<PublicTrackingPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reviewScore, setReviewScore] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewBusy, setReviewBusy] = useState(false);

  const load = async () => {
    try {
      const payload = await getPublicTrackingFn({ data: { orderId, token } });
      setData(payload);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  useEffect(() => {
    void load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [orderId, token]);

  const currentStage = data ? trackingStageIndex(data.order.status) : 0;
  const isCancelled = data ? isTrackingCancelled(data.order.status) : false;

  const markers = useMemo((): MapMarker[] => {
    if (!data) return [];
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
        label: data.order.code,
        kind: "order",
        color: "#6366f1",
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
    if (!data?.driver?.lat || !data.order.lat) return null;
    return {
      from: { lng: data.driver.lng!, lat: data.driver.lat! },
      to: { lng: data.order.lng!, lat: data.order.lat! },
    };
  }, [data]);

  const trailCoordinates = useMemo(() => {
    if (!data?.trail?.length) return [];
    return data.trail.map((p) => ({ lng: p.lng, lat: p.lat }));
  }, [data?.trail]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#06080b] p-6">
        <div className="text-center max-w-sm">
          <Package className="size-12 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-lg font-semibold text-white">Link inválido</h1>
          <p className="text-sm text-muted-foreground mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#06080b] text-muted-foreground text-sm">
        Carregando rastreio...
      </div>
    );
  }

  const elapsed = Math.max(
    0,
    Math.floor((Date.now() - new Date(data.order.placed_at).getTime()) / 60000),
  );
  const eta = data
    ? estimateTrackingEtaMinutes(data.order.status, data.order.sla_minutes, elapsed)
    : 0;

  const showOnlinePaymentDemo =
    data.order.payment_status === "pendente" &&
    (data.order.payment_method === "pix" || data.order.payment_method === "card") &&
    data.pending_payment?.provider === "mock";

  const pendingPix = data.pending_payment?.pix_copy_paste;
  const pendingQr = data.pending_payment?.pix_qr_base64;
  const cardCheckoutUrl = data.pending_payment?.checkout_url;

  const copyPix = async () => {
    if (!pendingPix) return;
    try {
      await navigator.clipboard.writeText(pendingPix);
      toast.success("Código Pix copiado!");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const confirmPayment = async () => {
    try {
      const res = await fetch("/api/payments/confirm-mock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, token }),
      });
      if (!res.ok) throw new Error(await res.text());
      await load();
      toast.success("Pagamento confirmado");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const submitReview = async () => {
    if (reviewScore < 1) {
      toast.error("Escolha uma nota de 1 a 5");
      return;
    }
    setReviewBusy(true);
    try {
      const review = await submitOrderReviewFn({
        data: { orderId, token, score: reviewScore, comment: reviewComment || undefined },
      });
      setData((prev) =>
        prev
          ? {
              ...prev,
              review: {
                score: review.score,
                comment: review.comment,
                created_at: review.created_at,
              },
            }
          : prev,
      );
      toast.success("Obrigado pela avaliação!");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setReviewBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#06080b] text-foreground">
      <header className="border-b border-border px-4 py-4 flex items-center gap-2">
        <Zap className="size-5 text-primary" />
        <div>
          <div className="font-display font-semibold text-sm">Delivery OS</div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Rastreio do pedido
          </p>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-5 pb-10">
        {confirmed && (
          <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-4 text-center">
            <CheckCircle2 className="mx-auto mb-2 size-10 text-green-400" />
            <h2 className="text-lg font-bold text-white">Pedido recebido!</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Seu pedido foi registrado. A cozinha começará o preparo em breve — acompanhe abaixo.
            </p>
          </div>
        )}
        {isCancelled && (
          <div className="rounded-2xl border border-danger/30 bg-danger/10 p-4 text-center">
            <h2 className="text-lg font-bold text-white">Pedido cancelado</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Este pedido foi cancelado. Em caso de dúvida, fale com o restaurante.
            </p>
          </div>
        )}

        {data.order.driver_arriving && data.order.status === "em_rota_entrega" && (
          <div
            className={`rounded-2xl border p-4 flex items-start gap-3 ${
              data.order.arrived_at
                ? "border-success/40 bg-success/10"
                : "border-primary/40 bg-primary/10"
            }`}
          >
            <Navigation
              className={`size-5 shrink-0 mt-0.5 ${
                data.order.arrived_at ? "text-success" : "text-primary"
              }`}
            />
            <div>
              <h2 className="text-sm font-bold text-white">
                {data.order.arrived_at
                  ? "Seu entregador chegou!"
                  : `${data.driver?.name ?? "Entregador"} está chegando`}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                {data.order.arrived_at
                  ? "Aguarde — a entrega será finalizada em instantes."
                  : data.order.driver_distance_m != null
                    ? `A cerca de ${data.order.driver_distance_m < 1000 ? `${data.order.driver_distance_m} m` : `${(data.order.driver_distance_m / 1000).toFixed(1)} km`} do seu endereço.`
                    : "O entregador está a caminho do seu endereço."}
              </p>
            </div>
          </div>
        )}

        <div className="glass-strong rounded-2xl p-5 border border-border space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
                Pedido
              </span>
              <h1 className="text-2xl font-mono font-bold text-white">{data.order.code}</h1>
            </div>
            <div className="flex flex-col gap-1 items-end">
              <span className="text-xs font-mono px-2 py-1 rounded-lg bg-primary/15 text-primary border border-primary/25">
                {STATUS_LABEL[data.order.status] ?? data.order.status}
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                  data.order.payment_status === "pago"
                    ? "bg-success/15 text-success"
                    : "bg-warning/15 text-warning"
                }`}
              >
                {data.order.payment_status === "pago" ? "Pago" : "Aguardando pagamento"}
              </span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground flex items-start gap-2">
            <MapPin className="size-4 shrink-0 mt-0.5" />
            {data.order.address}
          </p>
          {data.order.payment_status === "pendente" &&
            data.order.payment_method === "pix" &&
            pendingPix && (
              <div className="rounded-xl border border-border bg-surface/40 p-4 space-y-3">
                <p className="text-xs font-semibold text-foreground">Pague com Pix</p>
                {pendingQr && (
                  <img
                    src={`data:image/png;base64,${pendingQr}`}
                    alt="QR Code Pix"
                    className="mx-auto w-44 h-44 rounded-lg bg-white p-2"
                  />
                )}
                <p className="text-[10px] text-muted-foreground break-all font-mono leading-relaxed">
                  {pendingPix}
                </p>
                <button
                  type="button"
                  onClick={() => void copyPix()}
                  className="w-full rounded-lg border border-border py-2 text-xs text-foreground flex items-center justify-center gap-1.5"
                >
                  <Copy className="size-3.5" />
                  Copiar código Pix
                </button>
              </div>
            )}
          {data.order.payment_status === "pendente" &&
            data.order.payment_method === "card" &&
            cardCheckoutUrl && (
              <a
                href={cardCheckoutUrl}
                target="_blank"
                rel="noreferrer"
                className="block w-full rounded-lg bg-primary py-2 text-center text-sm text-primary-foreground font-medium"
              >
                Pagar com cartão
              </a>
            )}
          {showOnlinePaymentDemo && (
            <button
              type="button"
              onClick={() => void confirmPayment()}
              className="w-full rounded-lg bg-primary py-2 text-sm text-primary-foreground font-medium"
            >
              Confirmar pagamento (demo Pix)
            </button>
          )}
          {data.order.payment_status === "pendente" && data.order.payment_method === "on_delivery" && (
            <p className="text-xs text-muted-foreground rounded-lg border border-border px-3 py-2">
              Pagamento na entrega — prepare o valor de R$ {data.order.total_amount.toFixed(2)}.
            </p>
          )}
          <div className="flex gap-4 text-xs font-mono">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Clock className="size-3.5" /> ETA ~{eta} min
            </span>
            {data.driver && (
              <span className="flex items-center gap-1 text-success">
                <Bike className="size-3.5" /> {data.driver.name}
              </span>
            )}
          </div>
        </div>

        {data.line_items.length > 0 && (
          <div className="glass-strong rounded-2xl p-5 border border-border">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
              Itens do pedido
            </h2>
            <ul className="space-y-2 text-sm">
              {data.line_items.map((item, i) => (
                <li key={i} className="flex justify-between">
                  <span>
                    {item.quantity}x {item.name}
                  </span>
                  <span className="text-muted-foreground font-mono">
                    R$ {(item.unit_price * item.quantity).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex justify-between mt-3 pt-3 border-t border-border font-semibold text-sm">
              <span>Total</span>
              <span>R$ {data.order.total_amount.toFixed(2)}</span>
            </div>
          </div>
        )}

        <OpsMapbox
          className="h-[280px] w-full rounded-2xl overflow-hidden border border-border"
          markers={markers}
          showRouteLine={!!routeLine}
          routeFrom={routeLine?.from}
          routeTo={routeLine?.to}
          trailCoordinates={trailCoordinates}
          zoom={13}
        />

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
                      {done ? <CheckCircle2 className="size-4" /> : <span className="text-[10px]">{i + 1}</span>}
                    </div>
                    {i < TRACKING_TIMELINE_STEPS.length - 1 && (
                      <div className={`w-0.5 flex-1 min-h-[24px] ${done ? "bg-success/40" : "bg-border"}`} />
                    )}
                  </div>
                  <div className={`pb-5 ${active ? "text-white" : "text-muted-foreground"}`}>
                    <div className="text-sm font-medium">{step.label}</div>
                    {active && (
                      <p className="text-[10px] mt-0.5 text-primary">Atualizado agora</p>
                    )}
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

        {data.order.status === "entregue" && (
          <div className="glass-strong rounded-2xl p-5 border border-border space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Como foi sua experiência?
            </h2>
            {data.review ? (
              <div className="space-y-2">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      className={`size-5 ${n <= data.review!.score ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`}
                    />
                  ))}
                </div>
                {data.review.comment && (
                  <p className="text-sm text-muted-foreground">{data.review.comment}</p>
                )}
                <p className="text-xs text-success">Obrigado pela avaliação!</p>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setReviewScore(n)}
                      className="rounded-lg p-1 transition-colors hover:bg-surface/60"
                      aria-label={`Nota ${n}`}
                    >
                      <Star
                        className={`size-7 ${n <= reviewScore ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`}
                      />
                    </button>
                  ))}
                </div>
                <textarea
                  className="w-full rounded-xl border border-border bg-surface/40 px-3 py-2 text-sm min-h-[4.5rem] resize-none"
                  placeholder="Conte como foi (opcional)"
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  maxLength={500}
                />
                <button
                  type="button"
                  disabled={reviewBusy || reviewScore < 1}
                  onClick={() => void submitReview()}
                  className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
                >
                  {reviewBusy ? "Enviando…" : "Enviar avaliação"}
                </button>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
