import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle,
  Copy,
  ExternalLink,
  Link2,
  Loader2,
  Plug,
  RefreshCw,
  ShoppingBag,
  Unplug,
  Zap,
} from "lucide-react";
import {
  completeIfoodOAuthFn,
  connectIfoodCentralizedFn,
  disconnectIfoodOAuthFn,
  getIfoodConfigFn,
  listIfoodEventsFn,
  pollIfoodEventsFn,
  refreshIfoodTokenFn,
  requestIfoodUserCodeFn,
  saveIfoodConfigFn,
  simulateIfoodWebhookFn,
} from "@/functions/ifood";
import type { IfoodInboundEventDto, IfoodTenantConfigDto } from "@/lib/integrations/ifood/types";

type Props = {
  tenantId: string;
};

export function IfoodIntegrationPanel({ tenantId }: Props) {
  const [config, setConfig] = useState<IfoodTenantConfigDto | null>(null);
  const [events, setEvents] = useState<IfoodInboundEventDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [merchantId, setMerchantId] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [pollingEnabled, setPollingEnabled] = useState(true);
  const [authCode, setAuthCode] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cfg, evts] = await Promise.all([
        getIfoodConfigFn({ data: { tenantId } }),
        listIfoodEventsFn({ data: { tenantId, limit: 20 } }),
      ]);
      setConfig(cfg);
      setEvents(evts);
      setMerchantId(cfg.merchant_id ?? "");
      setWebhookSecret("");
      setClientId(cfg.client_id ?? "");
      setClientSecret("");
      setAuthCode("");
      setEnabled(cfg.enabled);
      setPollingEnabled(cfg.polling_enabled);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar iFood");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copiado!`);
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const saveConfig = async () => {
    if (!merchantId.trim()) {
      toast.error("Merchant ID é obrigatório");
      return;
    }
    setBusy(true);
    try {
      const saved = await saveIfoodConfigFn({
        data: {
          tenantId,
          merchantId,
          webhookSecret: webhookSecret.trim() || undefined,
          enabled,
          pollingEnabled,
          clientId: clientId.trim() || undefined,
          clientSecret: clientSecret.trim() || undefined,
        },
      });
      setConfig(saved);
      setClientSecret("");
      toast.success("Configuração iFood salva!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setBusy(false);
    }
  };

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      const result = await fn();
      if (result && typeof result === "object" && "tenant_id" in result) {
        setConfig(result as IfoodTenantConfigDto);
      }
      await load();
      toast.success(ok);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Operação falhou");
    } finally {
      setBusy(false);
    }
  };

  if (loading && !config) {
    return (
      <div className="erp-card p-10 flex items-center justify-center text-muted-foreground text-sm gap-2">
        <Loader2 className="size-4 animate-spin" />
        Carregando integração iFood…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm">
        <strong>Integração iFood</strong> — webhook, credenciais OAuth e conexão centralizada ou
        distribuída (Portal do Parceiro).
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="erp-card p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-border/40 pb-2">
            <Link2 className="size-4 text-primary-glow" />
            <h3 className="text-sm font-semibold">Webhook & Merchant</h3>
          </div>

          <label className="block space-y-1">
            <span className="text-[10px] uppercase text-muted-foreground font-semibold">
              Merchant ID
            </span>
            <input
              value={merchantId}
              onChange={(e) => setMerchantId(e.target.value)}
              className="w-full p-2.5 bg-surface border border-border rounded-lg text-xs font-mono"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-[10px] uppercase text-muted-foreground font-semibold">
              Webhook secret
            </span>
            <input
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              type="password"
              placeholder={
                config?.webhook_secret_set
                  ? "Secret salvo (deixe vazio para manter)"
                  : "HMAC secret do webhook"
              }
              className="w-full p-2.5 bg-surface border border-border rounded-lg text-xs font-mono"
            />
          </label>

          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            Integração ativa
          </label>

          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={pollingEnabled}
              onChange={(e) => setPollingEnabled(e.target.checked)}
            />
            Polling automático (API Events, 30s)
          </label>

          {config?.last_poll_at && (
            <div className="rounded-lg border border-border/60 bg-surface/30 p-2.5 text-[10px] space-y-0.5">
              <p className="text-muted-foreground">
                Último poll: {new Date(config.last_poll_at).toLocaleString("pt-BR")}
              </p>
              {config.last_poll_status && (
                <p>
                  Status:{" "}
                  <span
                    className={
                      config.last_poll_status === "error"
                        ? "text-danger"
                        : config.last_poll_status === "ok"
                          ? "text-success"
                          : "text-muted-foreground"
                    }
                  >
                    {config.last_poll_status}
                  </span>
                  {config.last_poll_message ? ` — ${config.last_poll_message}` : null}
                </p>
              )}
            </div>
          )}

          {config?.webhook_url && (
            <div className="rounded-lg border border-border bg-surface/40 p-3 space-y-2">
              <p className="text-[10px] font-mono break-all">{config.webhook_url}</p>
              <button
                type="button"
                onClick={() => void copy(config.webhook_url, "URL")}
                className="text-[10px] flex items-center gap-1 text-primary-glow"
              >
                <Copy className="size-3" /> Copiar URL
              </button>
            </div>
          )}

          <button
            type="button"
            disabled={busy}
            onClick={() => void saveConfig()}
            className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold disabled:opacity-50"
          >
            Salvar configuração
          </button>
        </div>

        <div className="erp-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border/40 pb-2">
            <div className="flex items-center gap-2">
              <Plug className="size-4 text-accent" />
              <h3 className="text-sm font-semibold">OAuth iFood</h3>
            </div>
            {config?.oauth_connected && (
              <span className="text-[10px] font-bold text-success flex items-center gap-1">
                <CheckCircle className="size-3" /> Conectado
              </span>
            )}
          </div>

          <input
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="Client ID"
            className="w-full p-2.5 bg-surface border border-border rounded-lg text-xs font-mono"
          />
          <input
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            type="password"
            placeholder={config?.has_client_credentials ? "Client Secret (salvo)" : "Client Secret"}
            className="w-full p-2.5 bg-surface border border-border rounded-lg text-xs font-mono"
          />

          {config?.token_expires_at && (
            <p className="text-[10px] text-muted-foreground font-mono">
              Expira: {new Date(config.token_expires_at).toLocaleString("pt-BR")}
            </p>
          )}

          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void run(
                () => connectIfoodCentralizedFn({ data: { tenantId } }),
                "Conectado (centralizado)!",
              )
            }
            className="w-full py-2 rounded-lg border border-border text-xs font-semibold flex items-center justify-center gap-1.5"
          >
            <Zap className="size-3.5" /> App centralizado
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                if (!clientId.trim()) {
                  throw new Error("Informe o Client ID antes de gerar o userCode.");
                }
                await saveIfoodConfigFn({
                  data: {
                    tenantId,
                    merchantId: merchantId.trim() || `pending-${tenantId}`,
                    clientId,
                    clientSecret,
                    enabled,
                    pollingEnabled,
                  },
                });
                return requestIfoodUserCodeFn({ data: { tenantId } });
              }, "Código gerado")
            }
            className="w-full py-2 rounded-lg border border-accent/30 text-xs text-accent flex items-center justify-center gap-1.5"
          >
            <ExternalLink className="size-3.5" /> Gerar userCode (distribuído)
          </button>

          {config?.pending_user_code && (
            <div className="rounded-lg border border-accent/20 bg-accent/5 p-3 text-xs space-y-1">
              <p>
                Código: <strong className="font-mono">{config.pending_user_code}</strong>
              </p>
              {config.verification_url && (
                <a
                  href={config.verification_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent underline"
                >
                  Portal iFood
                </a>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <input
              value={authCode}
              onChange={(e) => setAuthCode(e.target.value)}
              placeholder="Authorization code"
              className="flex-1 p-2 border border-border rounded-lg text-xs font-mono"
            />
            <button
              type="button"
              disabled={busy || !authCode.trim()}
              onClick={() =>
                void run(
                  () =>
                    completeIfoodOAuthFn({
                      data: { tenantId, authorizationCode: authCode.trim() },
                    }),
                  "OAuth OK!",
                )
              }
              className="px-3 py-2 rounded-lg bg-accent/20 text-accent text-xs font-bold"
            >
              Conectar
            </button>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void run(() => refreshIfoodTokenFn({ data: { tenantId } }), "Token OK")
              }
              className="flex-1 py-2 border border-border rounded-lg text-[10px] flex items-center justify-center gap-1"
            >
              <RefreshCw className="size-3" /> Renovar
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void run(() => disconnectIfoodOAuthFn({ data: { tenantId } }), "Desconectado")
              }
              className="flex-1 py-2 border border-danger/30 text-danger rounded-lg text-[10px] flex items-center justify-center gap-1"
            >
              <Unplug className="size-3" /> Desconectar
            </button>
          </div>
        </div>
      </div>

      <div className="erp-card p-5 space-y-3">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <ShoppingBag className="size-4" />
            <h3 className="text-sm font-semibold">Eventos</h3>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void run(() => pollIfoodEventsFn({ data: { tenantId } }), "Polling concluído!")
              }
              className="text-[10px] px-2 py-1 border border-border rounded font-bold flex items-center gap-1"
            >
              <RefreshCw className="size-3" /> Poll agora
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void run(() => simulateIfoodWebhookFn({ data: { tenantId } }), "Pedido simulado!")
              }
              className="text-[10px] px-2 py-1 bg-success/15 text-success rounded font-bold"
            >
              Simular pedido
            </button>
          </div>
        </div>
        {events.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Nenhum evento.</p>
        ) : (
          <ul className="text-[11px] space-y-1 font-mono">
            {events.map((ev) => (
              <li key={ev.id} className="flex justify-between border-b border-border/20 py-1 gap-2">
                <span>
                  {ev.event_type}
                  <span className="text-muted-foreground/70 ml-1">({ev.source})</span>
                </span>
                <span className="text-muted-foreground">{ev.external_order_id ?? "—"}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
