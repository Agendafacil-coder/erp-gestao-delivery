import { useState } from "react";
import { ChevronDown, MapPin, Share2 } from "lucide-react";
import { toast } from "sonner";
import type { PublicTrackingPayload } from "@/functions/tracking";
import { publicTrackingUrl } from "@/lib/ops/trackingUrl";
import { cn } from "@/lib/utils";

type TrackingOrderDetailsProps = {
  data: PublicTrackingPayload;
  orderId: string;
  token: string;
};

export function TrackingOrderDetails({ data, orderId, token }: TrackingOrderDetailsProps) {
  const [open, setOpen] = useState(false);

  const shareLink = async () => {
    const url = publicTrackingUrl(orderId, token);
    try {
      if (navigator.share) {
        await navigator.share({ title: `Pedido ${data.order.code}`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado!");
    } catch {
      toast.error("Não foi possível compartilhar");
    }
  };

  return (
    <section className="tracking-card">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex flex-1 items-center justify-between gap-2 text-left"
        >
          <div>
            <h2 className="text-sm font-semibold text-white">Detalhes do pedido</h2>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <MapPin className="size-3 shrink-0" />
              <span className="line-clamp-1">{data.order.address}</span>
            </p>
          </div>
          <ChevronDown
            className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")}
          />
        </button>
        <button
          type="button"
          onClick={() => void shareLink()}
          className="tracking-icon-btn"
          title="Compartilhar rastreio"
        >
          <Share2 className="size-4" />
        </button>
      </div>

      {open && (
        <div className="mt-4 space-y-3 border-t border-border/60 pt-4">
          {data.line_items.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {data.line_items.map((item, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span className="text-foreground">
                    {item.quantity}x {item.name}
                  </span>
                  <span className="text-muted-foreground font-mono shrink-0">
                    R$ {(item.unit_price * item.quantity).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Itens não disponíveis.</p>
          )}
          <div className="flex justify-between pt-2 border-t border-border/40 font-semibold text-sm">
            <span>Total</span>
            <span className="font-mono">R$ {data.order.total_amount.toFixed(2)}</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Cliente: <span className="text-foreground">{data.order.customer_name}</span>
          </p>
        </div>
      )}
    </section>
  );
}
