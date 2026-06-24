import { useEffect, useState } from "react";
import { Loader2, Megaphone, Send } from "lucide-react";
import { listCampaignRecipientsFn } from "@/functions/featureFlags";
import { sendWhatsappCampaignMessageFn } from "@/functions/whatsapp";
import { segmentLabel, type CustomerSegment } from "@/lib/crm/segments";
import { toast } from "sonner";

const SEGMENTS: CustomerSegment[] = ["all", "vip", "inactive_30d", "high_ticket"];

type Props = {
  tenantId: string;
};

export function WhatsappCampaignsPanel({ tenantId }: Props) {
  const [segment, setSegment] = useState<CustomerSegment>("inactive_30d");
  const [message, setMessage] = useState(
    "Olá! Sentimos sua falta 😊 Peça hoje com 10% OFF usando o cupom VOLTA10 no nosso cardápio.",
  );
  const [recipients, setRecipients] = useState<
    Array<{ phone: string; name: string | null; order_count: number }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const loadRecipients = async () => {
    setLoading(true);
    try {
      const rows = await listCampaignRecipientsFn({
        data: { tenantId, segment },
      });
      setRecipients(rows);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao carregar segmento");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRecipients();
  }, [tenantId, segment]);

  const handleSend = async () => {
    if (!message.trim() || recipients.length === 0) return;
    setSending(true);
    let sent = 0;
    try {
      for (const r of recipients.slice(0, 50)) {
        try {
          await sendWhatsappCampaignMessageFn({
            data: {
              tenantId,
              phone: r.phone,
              message: message.trim(),
              recipientLabel: r.name ?? r.phone,
            },
          });
          sent++;
          await new Promise((res) => setTimeout(res, 800));
        } catch {
          /* continua batch */
        }
      }
      toast.success(`${sent} mensagem(ns) enviada(s)`);
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="erp-card p-5 space-y-4">
      <div className="flex items-center gap-2 font-medium">
        <Megaphone className="size-4 text-primary" />
        Campanhas segmentadas
      </div>
      <p className="text-sm text-muted-foreground">
        Disparo em lote com cooldown entre mensagens (máx. 50 por envio).
      </p>

      <div className="flex flex-wrap gap-2">
        {SEGMENTS.map((s) => (
          <button
            key={s}
            type="button"
            data-active={segment === s}
            onClick={() => setSegment(s)}
            className="segmented-item text-xs"
          >
            {segmentLabel(s)}
          </button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        {loading ? (
          <span className="inline-flex items-center gap-1">
            <Loader2 className="size-3 animate-spin" />
            Carregando…
          </span>
        ) : (
          `${recipients.length} destinatário(s) no segmento`
        )}
      </p>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={4}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none"
        placeholder="Mensagem da campanha…"
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void loadRecipients()}
          disabled={loading}
          className="erp-btn-secondary text-xs"
        >
          Atualizar lista
        </button>
        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={sending || recipients.length === 0 || !message.trim()}
          className="erp-btn-primary text-xs disabled:opacity-50"
        >
          {sending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
          Enviar campanha
        </button>
      </div>
    </section>
  );
}
