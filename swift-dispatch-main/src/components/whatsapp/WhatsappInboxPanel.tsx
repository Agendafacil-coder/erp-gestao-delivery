import { useCallback, useEffect, useState } from "react";
import { Inbox, Loader2, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  listWhatsappInboundFn,
  markWhatsappInboundReadFn,
  type WhatsappInboundDto,
} from "@/functions/whatsapp";
import { AppCard, AppCardContent, AppCardHeader, AppCardTitle } from "@/components/design/AppCard";
import { ManualOrderDialog } from "@/components/ops/ManualOrderDialog";
import { EmptyState, LoadingState } from "@/components/ops/StateViews";
import { webhookUrl, WEBHOOK_ENDPOINTS } from "@/lib/integrations/endpoints";
import { cn } from "@/lib/utils";

type Props = {
  tenantId: string;
};

export function WhatsappInboxPanel({ tenantId }: Props) {
  const [rows, setRows] = useState<WhatsappInboundDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderOpen, setOrderOpen] = useState(false);
  const [defaults, setDefaults] = useState<{
    channel: "WhatsApp";
    customerName?: string;
    customerPhone?: string;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listWhatsappInboundFn({ data: { tenantId, limit: 40 } });
      setRows(list);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao carregar inbox");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  const webhookHint =
    typeof window !== "undefined"
      ? webhookUrl(WEBHOOK_ENDPOINTS.whatsapp.inbound.path)
      : WEBHOOK_ENDPOINTS.whatsapp.inbound.path;

  const openOrder = async (row: WhatsappInboundDto) => {
    setDefaults({
      channel: "WhatsApp",
      customerName: row.contact_name || undefined,
      customerPhone: row.phone,
    });
    setOrderOpen(true);
    try {
      await markWhatsappInboundReadFn({
        data: { tenantId, messageId: row.id, status: "ordered" },
      });
      setRows((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, status: "ordered" } : r)),
      );
    } catch {
      /* não bloqueia o pedido */
    }
  };

  return (
    <div className="space-y-4">
      <AppCard>
        <AppCardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <AppCardTitle className="flex items-center gap-2 text-base">
              <Inbox className="size-4 text-primary" />
              Mensagens recebidas
            </AppCardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Configure na Evolution o webhook:{" "}
              <code className="text-[11px] bg-muted px-1 rounded">{webhookHint}</code>
            </p>
          </div>
          <button type="button" onClick={() => void load()} className="erp-btn-secondary text-xs">
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
            Atualizar
          </button>
        </AppCardHeader>
        <AppCardContent className="space-y-3 min-h-[280px]">
          {loading && rows.length === 0 ? (
            <LoadingState label="Carregando inbox…" size="sm" className="border-0 bg-transparent" />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="Nenhuma mensagem recebida"
              description="Quando o cliente mandar zap e a Evolution estiver com o webhook, a mensagem aparece aqui para virar pedido."
              size="sm"
              className="border-0 bg-transparent"
            />
          ) : (
            rows.map((row) => (
              <article
                key={row.id}
                className={cn(
                  "rounded-xl border p-3 space-y-2",
                  row.status === "new"
                    ? "border-primary/40 bg-primary/[0.04]"
                    : "border-border/50 bg-muted/15",
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {row.contact_name || "Cliente"} · {row.phone}
                    </p>
                    <p className="text-[11px] text-muted-foreground tabular-nums">
                      {new Date(row.created_at).toLocaleString("pt-BR")}
                      {row.status === "new" ? " · nova" : row.status === "ordered" ? " · pediu" : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void openOrder(row)}
                    className="erp-btn-primary text-xs shrink-0"
                  >
                    <Plus className="size-3.5" />
                    Criar pedido
                  </button>
                </div>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{row.body}</p>
              </article>
            ))
          )}
        </AppCardContent>
      </AppCard>

      <ManualOrderDialog
        open={orderOpen}
        onOpenChange={(next) => {
          setOrderOpen(next);
          if (!next) setDefaults(null);
        }}
        defaults={defaults}
      />
    </div>
  );
}
