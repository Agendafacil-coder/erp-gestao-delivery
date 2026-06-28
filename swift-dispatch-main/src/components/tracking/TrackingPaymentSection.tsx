import { Copy } from "lucide-react";
import { toast } from "sonner";
import type { PublicTrackingPayload } from "@/functions/tracking";

type TrackingPaymentSectionProps = {
  data: PublicTrackingPayload;
  orderId: string;
  token: string;
  onPaymentConfirmed: () => void;
};

export function TrackingPaymentSection({
  data,
  orderId,
  token,
  onPaymentConfirmed,
}: TrackingPaymentSectionProps) {
  const pendingPix = data.pending_payment?.pix_copy_paste;
  const pendingQr = data.pending_payment?.pix_qr_base64;
  const cardCheckoutUrl = data.pending_payment?.checkout_url;

  const showOnlinePaymentDemo =
    data.order.payment_status === "pendente" &&
    (data.order.payment_method === "pix" || data.order.payment_method === "card") &&
    data.pending_payment?.provider === "mock";

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
      onPaymentConfirmed();
      toast.success("Pagamento confirmado");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  if (data.order.payment_status === "pago") return null;

  return (
    <>
      {data.order.payment_method === "pix" && pendingPix && (
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

      {data.order.payment_method === "card" && cardCheckoutUrl && (
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

      {data.order.payment_method === "on_delivery" && (
        <p className="text-xs text-muted-foreground rounded-lg border border-border px-3 py-2">
          Pagamento na entrega — prepare o valor de R$ {data.order.total_amount.toFixed(2)}.
        </p>
      )}
    </>
  );
}
