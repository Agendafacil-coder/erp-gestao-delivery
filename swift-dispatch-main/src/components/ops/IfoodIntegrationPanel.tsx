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
  getIfoodHomologationChecklistFn,
  listIfoodEventsFn,
  pollIfoodEventsFn,
  refreshIfoodTokenFn,
  requestIfoodUserCodeFn,
  respondIfoodDisputeFn,
  saveIfoodConfigFn,
  simulateIfoodWebhookFn,
} from "@/functions/ifood";
import type { IfoodInboundEventDto, IfoodTenantConfigDto } from "@/lib/integrations/ifood/types";
import type { IfoodHomologationItem } from "@/lib/integrations/ifood/homologationChecklist";

type Props = {
  tenantId: string;
};

export function IfoodIntegrationPanel({ tenantId }: Props) {
  const [config, setConfig] = useState<IfoodTenantConfigDto | null>(null);
  const [events, setEvents] = useState<IfoodInboundEventDto[]>([]);
  const [checklist, setChecklist] = useState<IfoodHomologationItem[]>([]);
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
      const [cfg, evts, homolog] = await Promise.all([
        getIfoodConfigFn({ data: { tenantId } }),
        listIfoodEventsFn({ data: { tenantId, limit: 20 } }),
        getIfoodHomologationChecklistFn({ data: { tenantId } }),
      ]);
      setConfig(cfg);
      setEvents(evts);
      setChecklist(homolog);
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
      toast.error("ID da loja no iFood é obrigatório");
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
        <strong>Pedidos do iFood</strong> — receba pedidos automaticamente na central. Conecte pelo
        app padrão ou pelo Portal do Parceiro iFood.
        {config?.homologation_mode ? (
          <p className="mt-1 text-xs text-warning">
            Modo de testes iFood ativo — pedidos de teste, não reais.
          </p>
        ) : null}
      </div>

      <div className="erp-card p-5 space-y-3">
        <h3 className="text-sm font-semibold">Checklist de testes iFood</h3>
        <ul className="space-y-2 text-xs">
          {checklist.map((item) => (
            <li key={item.id} className="flex items-start gap-2">
              <CheckCircle
                className={`size-4 shrink-0 ${item.ok ? "text-success" : "text-muted-foreground/40"}`}
              />
              <div>
                <p className={item.ok ? "text-foreground" : "text-muted-foreground"}>
                  {item.label}
                </p>
                {item.hint && !item.ok ? (
                  <p className="text-[10px] text-muted-foreground mt-0.5">{item.hint}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="erp-card p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-border/40 pb-2">
            <Link2 className="size-4 text-primary-glow" />
            <h3 className="text-sm font-semibold">Conexão da loja iFood</h3>
          </div>

          <label className="block space-y-1">
            <span className="text-[10px] uppercase text-muted-foreground font-semibold">
              ID da loja no iFood
            </span>
            <input
              value={merchantId}
              onChange={(e) => setMerchantId(e.target.value)}
              className="w-full p-2.5 bg-surface border border-border rounded-lg text-xs font-mono"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-[10px] uppercase text-muted-foreground font-semibold">
              Senha de segurança (opcional)
            </span>
            <input
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              type="password"
              placeholder={
                config?.webhook_secret_set
                  ? "Senha salva (deixe vazio para manter)"
                  : "Senha de segurança dos avisos de pedido"
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
            Buscar pedidos automaticamente a cada 30 segundos
          </label>

          {config?.last_poll_at && (
            <div className="rounded-lg border border-border/60 bg-surface/30 p-2.5 text-[10px] space-y-0.5">
              <p className="text-muted-foreground">
                Última busca: {new Date(config.last_poll_at).toLocaleString("pt-BR")}
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
              <h3 className="text-sm font-semibold">Login no iFood</h3>
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
            <Zap className="size-3.5" /> Conectar com app padrão
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
            <ExternalLink className="size-3.5" /> Gerar código no Portal do Parceiro
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
              placeholder="Código de autorização (cole aqui)"
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
                  "Conectado!",
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
            <h3 className="text-sm font-semibold">Histórico de pedidos</h3>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void run(() => pollIfoodEventsFn({ data: { tenantId } }), "Busca concluída!")
              }
              className="text-[10px] px-2 py-1 border border-border rounded font-bold flex items-center gap-1"
            >
              <RefreshCw className="size-3" /> Buscar agora
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
              <li key={ev.id} className="border-b border-border/20 py-2 space-y-1">
                <div className="flex justify-between gap-2">
                  <span>
                    {ev.event_type}
                    <span className="text-muted-foreground/70 ml-1">({ev.source})</span>
                  </span>
                  <span className="text-muted-foreground">{ev.external_order_id ?? "—"}</span>
                </div>
                {ev.dispute_id &&
                (ev.event_type.includes("HANDSHAKE") ||
                  ev.event_type.includes("CANCELLATION_REQUESTED")) ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void run(
                          () =>
                            respondIfoodDisputeFn({
                              data: {
                                tenantId,
                                disputeId: ev.dispute_id!,
                                action: "accept",
                              },
                            }),
                          "Disputa aceita",
                        )
                      }
                      className="text-[10px] px-2 py-0.5 rounded bg-success/15 text-success"
                    >
                      Aceitar
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void run(
                          () =>
                            respondIfoodDisputeFn({
                              data: {
                                tenantId,
                                disputeId: ev.dispute_id!,
                                action: "reject",
                              },
                            }),
                          "Disputa recusada",
                        )
                      }
                      className="text-[10px] px-2 py-0.5 rounded bg-danger/15 text-danger"
                    >
                      Recusar
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
