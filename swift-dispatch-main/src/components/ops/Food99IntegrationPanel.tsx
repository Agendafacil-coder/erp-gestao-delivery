import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Loader2, Plug, RefreshCw, UtensilsCrossed } from "lucide-react";
import { getFood99ConfigFn, pollFood99OrdersFn, saveFood99ConfigFn } from "@/functions/food99";
import type { Food99TenantConfigDto } from "@/lib/integrations/food99/types";

type Props = {
  tenantId: string;
};

export function Food99IntegrationPanel({ tenantId }: Props) {
  const [config, setConfig] = useState<Food99TenantConfigDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [merchantId, setMerchantId] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [apiBase, setApiBase] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [pollingEnabled, setPollingEnabled] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const cfg = await getFood99ConfigFn({ data: { tenantId } });
      setConfig(cfg);
      setMerchantId(cfg.merchant_id ?? "");
      setClientId("");
      setClientSecret("");
      setApiBase(cfg.api_base ?? "");
      setWebhookSecret("");
      setEnabled(cfg.enabled);
      setPollingEnabled(cfg.polling_enabled);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar 99Food");
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
    if (!merchantId.trim()) {
      toast.error("ID da loja na 99Food é obrigatório");
      return;
    }
    if (!clientId.trim() && !config?.client_id_set) {
      toast.error("Client ID é obrigatório na primeira configuração");
      return;
    }
    if (!clientSecret.trim() && !config?.client_secret_set) {
      toast.error("Client Secret é obrigatório na primeira configuração");
      return;
    }

    setBusy(true);
    try {
      const saved = await saveFood99ConfigFn({
        data: {
          tenantId,
          merchantId,
          clientId: clientId.trim() || undefined,
          clientSecret: clientSecret.trim() || undefined,
          apiBase: apiBase.trim() || undefined,
          webhookSecret: webhookSecret.trim() || undefined,
          enabled,
          pollingEnabled,
        },
      });
      setConfig(saved);
      setClientId("");
      setClientSecret("");
      toast.success("Configuração 99Food salva e conectada!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setBusy(false);
    }
  };

  const pollNow = async () => {
    setBusy(true);
    try {
      const result = await pollFood99OrdersFn({ data: { tenantId } });
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
        Carregando integração 99Food…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="erp-card p-5 space-y-4">
        <div className="flex items-center gap-2 font-medium">
          <UtensilsCrossed className="size-4 text-[#FFD100]" />
          Integração 99Food
        </div>
        <p className="text-sm text-muted-foreground">
          Receba pedidos da 99Food na central. Ative &quot;Pedidos da 99Food&quot; em Sistema →
          Configurações → Operação → Funcionalidades extras. Use as credenciais do portal 99Food.
        </p>

        {!config?.oauth_connected ? (
          <div className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
            Credenciais ainda não validadas — salve os dados do portal para conectar.
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground">ID da loja na 99Food</label>
            <input
              value={merchantId}
              onChange={(e) => setMerchantId(e.target.value)}
              className="mt-1 w-full h-9 rounded-lg border border-border bg-background px-3 text-sm"
              placeholder="ID da loja na 99Food"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              ID do aplicativo {config?.client_id_set ? "(configurado)" : "*"}
            </label>
            <input
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="mt-1 w-full h-9 rounded-lg border border-border bg-background px-3 text-sm"
              placeholder={
                config?.client_id_set ? "Deixe vazio para manter" : "ID do portal 99Food"
              }
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Senha do aplicativo {config?.client_secret_set ? "(configurada)" : "*"}
            </label>
            <input
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              className="mt-1 w-full h-9 rounded-lg border border-border bg-background px-3 text-sm"
              placeholder="Senha do portal 99Food"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Endereço da API (só se o suporte pedir)
            </label>
            <input
              value={apiBase}
              onChange={(e) => setApiBase(e.target.value)}
              className="mt-1 w-full h-9 rounded-lg border border-border bg-background px-3 text-sm"
              placeholder="https://openapi-food.99app.com"
            />
          </div>
          <div className="sm:col-span-2">
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
            Salvar e validar
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
            Envie este endereço ao suporte ou cadastre no portal da 99Food.
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
