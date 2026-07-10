import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Loader2, Plug, RefreshCw, UtensilsCrossed } from "lucide-react";
import { getFood99ConfigFn, pollFood99OrdersFn, saveFood99ConfigFn } from "@/functions/food99";
import type { Food99TenantConfigDto } from "@/lib/integrations/food99/types";
import { SupportDetails } from "@/components/sistema/SupportDetails";
import { Switch } from "@/components/ui/switch";

type Props = {
  tenantId: string;
};

export function Food99IntegrationPanel({ tenantId }: Props) {
  const [config, setConfig] = useState<Food99TenantConfigDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingOwner, setSavingOwner] = useState(false);
  const [savingSupport, setSavingSupport] = useState(false);
  const [polling, setPolling] = useState(false);
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

  const credentialsReady = Boolean(config?.client_id_set && config?.client_secret_set);

  const saveOwner = async () => {
    if (!merchantId.trim()) {
      toast.error("Informe o ID da loja na 99Food");
      return;
    }
    if (!credentialsReady) {
      toast.message("Peça ao suporte para conectar a 99Food antes de salvar.");
      return;
    }

    setSavingOwner(true);
    try {
      const saved = await saveFood99ConfigFn({
        data: {
          tenantId,
          merchantId,
          enabled,
          pollingEnabled,
        },
      });
      setConfig(saved);
      toast.success("99Food salvo");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSavingOwner(false);
    }
  };

  const saveSupport = async () => {
    if (!merchantId.trim()) {
      toast.error("Informe o ID da loja na 99Food");
      return;
    }
    if (!clientId.trim() && !config?.client_id_set) {
      toast.error("Informe o ID do aplicativo");
      return;
    }
    if (!clientSecret.trim() && !config?.client_secret_set) {
      toast.error("Informe a senha do aplicativo");
      return;
    }

    setSavingSupport(true);
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
      setWebhookSecret("");
      toast.success("Credenciais 99Food salvas");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSavingSupport(false);
    }
  };

  const pollNow = async () => {
    setPolling(true);
    try {
      const result = await pollFood99OrdersFn({ data: { tenantId } });
      await load();
      if (result.skipped) {
        toast.message(`Importação não feita: ${result.reason ?? "—"}`);
      } else {
        toast.success(`${result.orders_processed} pedido(s) importado(s)`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao buscar pedidos");
    } finally {
      setPolling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-12 justify-center">
        <Loader2 className="size-4 animate-spin" />
        Carregando 99Food…
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="erp-card p-5 space-y-4">
        <div className="flex items-center gap-2 font-medium">
          <UtensilsCrossed className="size-4 text-[#FFD100]" />
          Pedidos da 99Food
        </div>
        <p className="text-sm text-muted-foreground">
          Receba pedidos da 99Food na central. Ative &quot;Pedidos da 99Food&quot; em Minha loja →
          Impressão e extras → Mais recursos.
        </p>

        {!config?.oauth_connected ? (
          <div className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
            Ainda não conectado — o suporte preenche os dados do portal abaixo.
          </div>
        ) : (
          <div className="rounded-xl border border-success/30 bg-success/8 px-4 py-3 text-sm text-success">
            99Food conectado.
          </div>
        )}

        <div>
          <label className="text-xs font-medium text-muted-foreground">ID da loja na 99Food</label>
          <input
            value={merchantId}
            onChange={(e) => setMerchantId(e.target.value)}
            className="mt-1 w-full h-9 rounded-lg border border-border bg-background px-3 text-sm"
            placeholder="Código da loja"
          />
        </div>

        <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-muted/15 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">Receber pedidos da 99Food</p>
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

        {!credentialsReady ? (
          <p className="text-xs text-muted-foreground">
            O suporte precisa conectar a 99Food (abaixo) antes de você salvar o ID e os interruptores.
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void saveOwner()}
            disabled={savingOwner || !credentialsReady}
            className="erp-btn-primary disabled:opacity-50"
          >
            {savingOwner ? <Loader2 className="size-4 animate-spin" /> : <Plug className="size-4" />}
            Salvar
          </button>
          <button
            type="button"
            onClick={() => void pollNow()}
            disabled={polling || !credentialsReady}
            className="erp-btn-secondary disabled:opacity-50"
          >
            {polling ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            Buscar agora
          </button>
        </div>
      </div>

      <SupportDetails title="Para o suporte técnico" hint="Dados do portal 99Food e links.">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              ID do aplicativo {config?.client_id_set ? "(já salvo)" : "*"}
            </label>
            <input
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="mt-1 w-full h-9 rounded-lg border border-border bg-background px-3 text-sm"
              placeholder={config?.client_id_set ? "Deixe vazio para manter" : "Do portal 99Food"}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Senha do aplicativo {config?.client_secret_set ? "(já salva)" : "*"}
            </label>
            <input
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              className="mt-1 w-full h-9 rounded-lg border border-border bg-background px-3 text-sm"
              placeholder="Do portal 99Food"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Endereço da API</label>
            <input
              value={apiBase}
              onChange={(e) => setApiBase(e.target.value)}
              className="mt-1 w-full h-9 rounded-lg border border-border bg-background px-3 text-sm"
              placeholder="https://openapi-food.99app.com"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Senha de segurança {config?.webhook_secret_set ? "(já salva)" : "(opcional)"}
            </label>
            <input
              type="password"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              className="mt-1 w-full h-9 rounded-lg border border-border bg-background px-3 text-sm"
              placeholder="Opcional"
            />
          </div>
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
        <button
          type="button"
          onClick={() => void saveSupport()}
          disabled={savingSupport}
          className="erp-btn-primary"
        >
          {savingSupport ? <Loader2 className="size-4 animate-spin" /> : <Plug className="size-4" />}
          Salvar credenciais
        </button>
      </SupportDetails>
    </div>
  );
}
