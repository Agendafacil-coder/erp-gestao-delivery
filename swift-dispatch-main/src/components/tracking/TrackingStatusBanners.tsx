import { CheckCircle2, Zap } from "lucide-react";
import type { PublicTrackingPayload } from "@/functions/tracking";
import { isTrackingCancelled } from "@/lib/ops/trackingTimeline";

export type TrackingSearchFlags = {
  confirmed: boolean;
  paid: boolean;
  cancelled: boolean;
  paymentFailed: boolean;
  paymentPending: boolean;
};

type TrackingStatusBannersProps = {
  data: PublicTrackingPayload;
  flags: TrackingSearchFlags;
};

export function TrackingStatusBanners({ data, flags }: TrackingStatusBannersProps) {
  const isCancelled = isTrackingCancelled(data.order.status);
  const paymentJustPaid = flags.paid && data.order.payment_status === "pago";
  const awaitingPayment =
    flags.paid && data.order.payment_status === "pendente";

  return (
    <>
      {flags.confirmed && (
        <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-4 text-center">
          <CheckCircle2 className="mx-auto mb-2 size-10 text-green-400" />
          <h2 className="text-lg font-bold text-white">Pedido recebido!</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Seu pedido foi registrado. A cozinha começará o preparo em breve — acompanhe abaixo.
          </p>
        </div>
      )}

      {paymentJustPaid && (
        <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-4 text-center">
          <CheckCircle2 className="mx-auto mb-2 size-10 text-green-400" />
          <h2 className="text-lg font-bold text-white">Pagamento confirmado!</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Recebemos seu pagamento. O pedido segue em preparo — acompanhe o status abaixo.
          </p>
        </div>
      )}

      {awaitingPayment && (
        <div className="rounded-2xl border border-warning/30 bg-warning/10 p-4 text-center">
          <h2 className="text-lg font-bold text-white">Processando pagamento</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Aguarde alguns instantes — a confirmação pode levar até 1 minuto.
          </p>
        </div>
      )}

      {flags.cancelled && (
        <div className="rounded-2xl border border-border bg-muted/30 p-4 text-center">
          <h2 className="text-lg font-bold text-white">Pagamento cancelado</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            O checkout foi cancelado. Você pode tentar pagar novamente abaixo.
          </p>
        </div>
      )}

      {flags.paymentFailed && (
        <div className="rounded-2xl border border-danger/30 bg-danger/10 p-4 text-center">
          <h2 className="text-lg font-bold text-white">Pagamento não aprovado</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Não foi possível concluir o pagamento. Tente novamente ou escolha outro método.
          </p>
        </div>
      )}

      {flags.paymentPending && !awaitingPayment && (
        <div className="rounded-2xl border border-warning/30 bg-warning/10 p-4 text-center">
          <h2 className="text-lg font-bold text-white">Pagamento em análise</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Seu pagamento está sendo processado. Esta página atualiza automaticamente.
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

      {data.order.driver_arriving && data.order.status === "em_rota_entrega" && !data.order.arrived_at && (
        <div className="rounded-2xl border border-primary/40 bg-primary/10 p-4 flex items-start gap-3">
          <Zap className="size-5 shrink-0 mt-0.5 text-primary" />
          <div>
            <h2 className="text-sm font-bold text-white">
              {data.driver?.name ?? "Entregador"} está chegando
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {data.order.driver_distance_m != null
                ? `A cerca de ${data.order.driver_distance_m < 1000 ? `${data.order.driver_distance_m} m` : `${(data.order.driver_distance_m / 1000).toFixed(1)} km`} do seu endereço.`
                : "O entregador está a caminho do seu endereço."}
            </p>
          </div>
        </div>
      )}

      {data.order.arrived_at && data.order.status === "em_rota_entrega" && (
        <div className="rounded-2xl border border-success/40 bg-success/10 p-4 text-center">
          <h2 className="text-sm font-bold text-white">Seu entregador chegou!</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Aguarde — a entrega será finalizada em instantes.
          </p>
        </div>
      )}
    </>
  );
}

export function TrackingPageHeader() {
  return null;
}
