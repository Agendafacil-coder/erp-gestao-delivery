import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Loader2, Plug, RefreshCw, ShoppingBag } from "lucide-react";
import { getRappiConfigFn, pollRappiOrdersFn, saveRappiConfigFn } from "@/functions/rappi";
import type { RappiTenantConfigDto } from "@/lib/integrations/rappi/types";

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
      toast.error("ID da loja no Rappi é obrigatório");
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
      toast.success("Configuração Rappi salva!");
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
      toast.error(e instanceof Error ? e.message : "Erro no polling");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-12 justify-center">
        <Loader2 className="size-4 animate-spin" />
        Carregando integração Rappi…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="erp-card p-5 space-y-4">
        <div className="flex items-center gap-2 font-medium">
          <ShoppingBag className="size-4 text-[#FF441F]" />
          Integração Rappi
        </div>
        <p className="text-sm text-muted-foreground">
          Receba pedidos do Rappi na central. Ative &quot;Pedidos do Rappi&quot; em Sistema →
          Configurações → Operação → Funcionalidades extras.
        </p>

        {!config?.oauth_configured ? (
          <div className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
            Conexão com o Rappi ainda não foi feita pelo suporte — pedidos não serão importados.
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground">ID da loja no Rappi</label>
            <input
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              className="mt-1 w-full h-9 rounded-lg border border-border bg-background px-3 text-sm"
              placeholder="ID da loja no Rappi"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Senha de segurança {config?.webhook_secret_set ? "(configurada)" : "(opcional)"}
            </label>
            <input
              type="password"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              className="mt-1 w-full h-9 rounded-lg border border-border bg-background px-3 text-sm"
              placeholder="Senha de segurança (opcional)"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            Integração ativa
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={pollingEnabled}
              onChange={(e) => setPollingEnabled(e.target.checked)}
            />
            Importar pedidos automaticamente a cada 30 segundos
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void save()}
            disabled={busy}
            className="erp-btn-primary"
          >
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
            Importar agora
          </button>
        </div>
      </div>

      {config?.webhook_url ? (
        <div className="erp-card p-5 space-y-2">
          <p className="text-sm font-medium">Endereço para avisos de pedido</p>
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
          <p className="text-xs text-muted-foreground">
            Envie este endereço ao suporte ou cadastre no portal do Rappi.
          </p>
        </div>
      ) : null}

      {config?.last_poll_at ? (
        <p className="text-xs text-muted-foreground">
          Última importação: {new Date(config.last_poll_at).toLocaleString("pt-BR")} —{" "}
          {config.last_poll_status ?? "—"}
          {config.last_poll_message ? ` · ${config.last_poll_message}` : ""}
        </p>
      ) : null}
    </div>
  );
}
