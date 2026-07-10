import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Loader2, Plug, RefreshCw, ShoppingBag } from "lucide-react";
import { getRappiConfigFn, pollRappiOrdersFn, saveRappiConfigFn } from "@/functions/rappi";
import type { RappiTenantConfigDto } from "@/lib/integrations/rappi/types";
import { SupportDetails } from "@/components/sistema/SupportDetails";
import { Switch } from "@/components/ui/switch";

type Props = {
  tenantId: string;
};

export function RappiIntegrationPanel({ tenantId }: Props) {
  const [config, setConfig] = useState<RappiTenantConfigDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [storeId, setStoreId] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [pollingEnabled, setPollingEnabled] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const cfg = await getRappiConfigFn({ data: { tenantId } });
      setConfig(cfg);
      setStoreId(cfg.store_id ?? "");
      setWebhookSecret("");
      setEnabled(cfg.enabled);
      setPollingEnabled(cfg.polling_enabled);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar Rappi");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("URL copiada!");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const save = async () => {
    if (!storeId.trim()) {
      toast.error("Informe o ID da loja no Rappi");
      return;
    }
    setBusy(true);
    try {
      const saved = await saveRappiConfigFn({
        data: {
          tenantId,
          storeId,
          webhookSecret: webhookSecret.trim() || undefined,
          enabled,
          pollingEnabled,
        },
      });
      setConfig(saved);
      toast.success("Rappi salvo");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setBusy(false);
    }
  };

  const pollNow = async () => {
    setBusy(true);
    try {
      const result = await pollRappiOrdersFn({ data: { tenantId } });
      await load();
      if (result.skipped) {
        toast.message(`Importação não feita: ${result.reason ?? "—"}`);
      } else {
        toast.success(`${result.orders_processed} pedido(s) importado(s)`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao buscar pedidos");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-12 justify-center">
        <Loader2 className="size-4 animate-spin" />
        Carregando Rappi…
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="erp-card p-5 space-y-4">
        <div className="flex items-center gap-2 font-medium">
          <ShoppingBag className="size-4 text-[#FF441F]" />
          Pedidos do Rappi
        </div>
        <p className="text-sm text-muted-foreground">
          Receba pedidos do Rappi na central. Ative &quot;Pedidos do Rappi&quot; em Minha loja →
          Impressão e extras → Mais recursos.
        </p>

        {!config?.oauth_configured ? (
          <div className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
            A conexão com o Rappi ainda precisa ser feita pelo suporte.
          </div>
        ) : null}

        <div>
          <label className="text-xs font-medium text-muted-foreground">ID da loja no Rappi</label>
          <input
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            className="mt-1 w-full h-9 rounded-lg border border-border bg-background px-3 text-sm"
            placeholder="Código da loja no Rappi"
          />
        </div>

        <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-muted/15 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">Receber pedidos do Rappi</p>
            <p className="text-xs text-muted-foreground">Ligado: importa para a central.</p>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={setEnabled}
            className="shrink-0 data-[state=unchecked]:bg-border/80"
          />
        </div>

        <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-muted/15 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">Buscar pedidos sozinho</p>
            <p className="text-xs text-muted-foreground">A cada ~30 segundos.</p>
          </div>
          <Switch
            checked={pollingEnabled}
            onCheckedChange={setPollingEnabled}
            className="shrink-0 data-[state=unchecked]:bg-border/80"
          />
        </div>

        {config?.last_poll_at ? (
          <p className="text-xs text-muted-foreground">
            Última importação: {new Date(config.last_poll_at).toLocaleString("pt-BR")}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void save()} disabled={busy} className="erp-btn-primary">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Plug className="size-4" />}
            Salvar
          </button>
          <button
            type="button"
            onClick={() => void pollNow()}
            disabled={busy}
            className="erp-btn-secondary"
          >
            <RefreshCw className="size-4" />
            Buscar agora
          </button>
        </div>
      </div>

      <SupportDetails title="Para o suporte técnico" hint="Senha e link de avisos.">
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Senha de segurança {config?.webhook_secret_set ? "(já salva)" : "(opcional)"}
          </label>
          <input
            type="password"
            value={webhookSecret}
            onChange={(e) => setWebhookSecret(e.target.value)}
            className="mt-1 w-full h-9 rounded-lg border border-border bg-background px-3 text-sm"
            placeholder="Senha opcional"
          />
        </div>
        {config?.webhook_url ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Link para avisos de pedido</p>
            <div className="flex items-center gap-2">
              <code className="text-xs break-all flex-1">{config.webhook_url}</code>
              <button
                type="button"
                className="ops-icon-btn size-8"
                onClick={() => void copy(config.webhook_url)}
                aria-label="Copiar URL"
              >
                <Copy className="size-3.5" />
              </button>
            </div>
          </div>
        ) : null}
      </SupportDetails>
    </div>
  );
}
