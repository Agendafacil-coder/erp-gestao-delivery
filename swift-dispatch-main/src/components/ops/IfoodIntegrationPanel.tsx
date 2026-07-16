import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle,
  Copy,
  ExternalLink,
  Loader2,
  Plug,
  RefreshCw,
  ShoppingBag,
  Unplug,
  Wifi,
  WifiOff,
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
import { SupportDetails } from "@/components/sistema/SupportDetails";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const IFOOD_EVENT_LABELS: Record<string, string> = {
  PLACED: "Pedido novo",
  CONFIRMED: "Confirmado",
  INTEGRATED: "Integrado",
  CANCELLED: "Cancelado",
  CANCELLATION_REQUESTED: "Pedido de cancelamento",
  CANCELLATION_REQUEST_FAILED: "Cancelamento recusado",
  READY_TO_PICKUP: "Pronto para retirada",
  DISPATCHED: "Saiu para entrega",
  CONCLUDED: "Concluído",
  DELIVERED: "Entregue",
  HANDSHAKE_DISPUTE: "Contestação",
  HANDSHAKE_SETTLEMENT: "Acordo",
};

function ifoodEventLabel(eventType: string): string {
  if (IFOOD_EVENT_LABELS[eventType]) return IFOOD_EVENT_LABELS[eventType];
  for (const [key, label] of Object.entries(IFOOD_EVENT_LABELS)) {
    if (eventType.includes(key)) return label;
  }
  return eventType.replace(/_/g, " ").toLowerCase();
}

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
  const [connectOpen, setConnectOpen] = useState(false);

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
      toast.error("Informe o ID da loja no iFood");
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
      toast.success("iFood salvo");
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
        Carregando iFood…
      </div>
    );
  }

  const connected = Boolean(config?.oauth_connected);

  const connectIfood = async () => {
    const appId = clientId.trim();
    const appSecret = clientSecret.trim();
    const hasSavedCreds = Boolean(config?.has_client_credentials);

    if (!appId && !hasSavedCreds) {
      toast.error("Informe o ID do aplicativo do Portal do Parceiro iFood.");
      return;
    }
    if (!appSecret && !hasSavedCreds) {
      toast.error("Informe a senha do aplicativo do Portal do Parceiro iFood.");
      return;
    }

    setBusy(true);
    try {
      // Só envia credenciais quando o usuário preencheu — vazio mantém o que já está salvo.
      await saveIfoodConfigFn({
        data: {
          tenantId,
          merchantId: merchantId.trim() || `pending-${tenantId}`,
          enabled: false,
          pollingEnabled,
          ...(appId ? { clientId: appId } : {}),
          ...(appSecret ? { clientSecret: appSecret } : {}),
        },
      });
      const saved = await connectIfoodCentralizedFn({ data: { tenantId } });
      setConfig(saved);
      const withReceive = await saveIfoodConfigFn({
        data: {
          tenantId,
          merchantId: merchantId.trim() || saved.merchant_id || `pending-${tenantId}`,
          enabled: true,
          pollingEnabled: true,
        },
      });
      setConfig(withReceive);
      setEnabled(true);
      setPollingEnabled(true);
      setClientSecret("");
      setConnectOpen(false);
      await load();
      toast.success("iFood conectado — pedidos podem entrar na central");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível conectar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="erp-card p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div
            className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${
              connected ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
            }`}
          >
            {connected ? <Wifi className="size-5" /> : <WifiOff className="size-5" />}
          </div>
          <div className="min-w-0">
            <p className="font-semibold">
              {connected ? "iFood conectado" : "Conectar o iFood"}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {connected
                ? "Pedidos do iFood entram na central automaticamente."
                : "Siga os passos abaixo. Leva menos de um minuto."}
            </p>
            {config?.homologation_mode ? (
              <p className="mt-1 text-xs text-warning">Modo de testes iFood — pedidos de teste.</p>
            ) : null}
          </div>
        </div>

        {!connected ? (
          <div className="space-y-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => setConnectOpen(true)}
              className="erp-btn-primary w-full justify-center text-base py-3 disabled:opacity-50"
            >
              <Zap className="size-4" />
              Conectar iFood
            </button>
            <p className="text-xs text-muted-foreground text-center">
              Você vai precisar de 3 informações do Portal do Parceiro iFood. Leva menos de um
              minuto.
            </p>
          </div>
        ) : (
          <>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-muted-foreground">ID da loja no iFood</span>
              <input
                value={merchantId}
                onChange={(e) => setMerchantId(e.target.value)}
                placeholder="Código da loja no iFood"
                className="w-full h-10 px-3 bg-background border border-border rounded-lg text-sm"
              />
            </label>

            <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-muted/15 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">Receber pedidos do iFood</p>
                <p className="text-xs text-muted-foreground">Ligado: importa pedidos para a central.</p>
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
                <p className="text-xs text-muted-foreground">A cada ~30 segundos, se estiver ligado.</p>
              </div>
              <Switch
                checked={pollingEnabled}
                onCheckedChange={setPollingEnabled}
                className="shrink-0 data-[state=unchecked]:bg-border/80"
              />
            </div>

            {config?.last_poll_at ? (
              <p className="text-xs text-muted-foreground">
                Última busca: {new Date(config.last_poll_at).toLocaleString("pt-BR")}
                {config.last_poll_status === "error" && config.last_poll_message
                  ? ` — ${config.last_poll_message}`
                  : null}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void saveConfig()}
                className="erp-btn-primary text-sm disabled:opacity-50"
              >
                {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Plug className="size-3.5" />}
                Salvar
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void run(() => pollIfoodEventsFn({ data: { tenantId } }), "Busca concluída")
                }
                className="erp-btn-secondary text-sm disabled:opacity-50"
              >
                <RefreshCw className="size-3.5" />
                Buscar agora
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void run(() => disconnectIfoodOAuthFn({ data: { tenantId } }), "Desconectado")
                }
                className="erp-btn-secondary text-sm text-danger disabled:opacity-50"
              >
                <Unplug className="size-3.5" />
                Desconectar
              </button>
            </div>
          </>
        )}
      </div>

      <div className="erp-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <ShoppingBag className="size-4 text-primary" />
          <h3 className="text-sm font-semibold">Últimos pedidos do iFood</h3>
        </div>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">Nenhum pedido recebido ainda.</p>
        ) : (
          <ul className="text-sm space-y-2">
            {events.slice(0, 8).map((ev) => (
              <li
                key={ev.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-border/30 py-2"
              >
                <span>
                  {ifoodEventLabel(ev.event_type)}
                  {ev.external_order_id ? (
                    <span className="text-muted-foreground text-xs ml-2">#{ev.external_order_id}</span>
                  ) : null}
                </span>
                {ev.dispute_id &&
                (ev.event_type.includes("HANDSHAKE") ||
                  ev.event_type.includes("CANCELLATION_REQUESTED")) ? (
                  <span className="flex gap-1">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void run(
                          () =>
                            respondIfoodDisputeFn({
                              data: { tenantId, disputeId: ev.dispute_id!, action: "accept" },
                            }),
                          "Aceito",
                        )
                      }
                      className="text-xs px-2 py-1 rounded bg-success/15 text-success"
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
                              data: { tenantId, disputeId: ev.dispute_id!, action: "reject" },
                            }),
                          "Recusado",
                        )
                      }
                      className="text-xs px-2 py-1 rounded bg-danger/15 text-danger"
                    >
                      Recusar
                    </button>
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <SupportDetails
        title="Para o suporte técnico"
        hint="Portal do Parceiro, senhas, testes e links."
      >
        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Checklist de testes
          </h4>
          <ul className="space-y-2 text-xs">
            {checklist.map((item) => (
              <li key={item.id} className="flex items-start gap-2">
                <CheckCircle
                  className={`size-4 shrink-0 ${item.ok ? "text-success" : "text-muted-foreground/40"}`}
                />
                <div>
                  <p className={item.ok ? "text-foreground" : "text-muted-foreground"}>{item.label}</p>
                  {item.hint && !item.ok ? (
                    <p className="text-[10px] text-muted-foreground mt-0.5">{item.hint}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Plug className="size-3.5" />
            Portal do Parceiro
          </h4>
          <input
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="ID do aplicativo"
            className="w-full p-2.5 bg-background border border-border rounded-lg text-xs font-mono"
          />
          <input
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            type="password"
            placeholder={
              config?.has_client_credentials ? "Senha do aplicativo (já salva)" : "Senha do aplicativo"
            }
            className="w-full p-2.5 bg-background border border-border rounded-lg text-xs font-mono"
          />
          <input
            value={webhookSecret}
            onChange={(e) => setWebhookSecret(e.target.value)}
            type="password"
            placeholder={
              config?.webhook_secret_set
                ? "Senha do webhook (salva)"
                : "Senha de segurança dos avisos (opcional)"
            }
            className="w-full p-2.5 bg-background border border-border rounded-lg text-xs font-mono"
          />

          {config?.token_expires_at ? (
            <p className="text-[10px] text-muted-foreground">
              Token expira: {new Date(config.token_expires_at).toLocaleString("pt-BR")}
            </p>
          ) : null}

          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                if (!clientId.trim()) {
                  throw new Error("Informe o Client ID antes de gerar o código.");
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
            className="w-full py-2 rounded-lg border border-border text-xs flex items-center justify-center gap-1.5"
          >
            <ExternalLink className="size-3.5" /> Gerar código no Portal
          </button>

          {config?.pending_user_code ? (
            <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs space-y-1">
              <p>
                Código: <strong className="font-mono">{config.pending_user_code}</strong>
              </p>
              {config.verification_url ? (
                <a
                  href={config.verification_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline"
                >
                  Abrir portal iFood
                </a>
              ) : null}
            </div>
          ) : null}

          <div className="flex gap-2">
            <input
              value={authCode}
              onChange={(e) => setAuthCode(e.target.value)}
              placeholder="Código de autorização"
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
              className="px-3 py-2 rounded-lg bg-primary/15 text-primary text-xs font-bold disabled:opacity-50"
            >
              Conectar
            </button>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void run(() => refreshIfoodTokenFn({ data: { tenantId } }), "Token renovado")
              }
              className="flex-1 py-2 border border-border rounded-lg text-xs flex items-center justify-center gap-1"
            >
              <RefreshCw className="size-3" /> Renovar token
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void run(() => simulateIfoodWebhookFn({ data: { tenantId } }), "Pedido simulado")
              }
              className="flex-1 py-2 border border-border rounded-lg text-xs"
            >
              Simular pedido
            </button>
          </div>

          {config?.webhook_url ? (
            <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
              <p className="text-[10px] font-mono break-all">{config.webhook_url}</p>
              <button
                type="button"
                onClick={() => void copy(config.webhook_url, "URL")}
                className="text-[10px] flex items-center gap-1 text-primary"
              >
                <Copy className="size-3" /> Copiar link
              </button>
            </div>
          ) : null}
        </div>
      </SupportDetails>

      <Dialog open={connectOpen} onOpenChange={(open) => !busy && setConnectOpen(open)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Conectar o iFood</DialogTitle>
            <DialogDescription>
              Copie as 3 informações do Portal do Parceiro iFood e cole aqui. Se tiver dúvida, peça
              ajuda ao suporte.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">ID da loja</span>
              <input
                value={merchantId}
                onChange={(e) => setMerchantId(e.target.value)}
                placeholder="Código da loja no Portal do Parceiro"
                className="w-full h-11 px-3 bg-background border border-border rounded-lg text-sm"
              />
              <span className="block text-[11px] text-muted-foreground">
                No Portal do Parceiro, aparece como &quot;ID da loja&quot; ou &quot;Merchant
                ID&quot;.
              </span>
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium">
                ID do aplicativo {config?.has_client_credentials ? "(já salvo)" : ""}
              </span>
              <input
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder={
                  config?.has_client_credentials ? "Deixe vazio para manter o salvo" : "Client ID"
                }
                className="w-full h-11 px-3 bg-background border border-border rounded-lg text-sm"
                autoComplete="off"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium">
                Senha do aplicativo {config?.has_client_credentials ? "(já salva)" : ""}
              </span>
              <input
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder={
                  config?.has_client_credentials
                    ? "Deixe vazio para manter a salva"
                    : "Client Secret"
                }
                className="w-full h-11 px-3 bg-background border border-border rounded-lg text-sm"
                autoComplete="new-password"
              />
              <span className="block text-[11px] text-muted-foreground">
                ID e senha ficam no Portal do Parceiro iFood → seu aplicativo.
              </span>
            </label>

            <button
              type="button"
              disabled={busy}
              onClick={() => void connectIfood()}
              className="erp-btn-primary w-full justify-center text-sm py-3 disabled:opacity-50"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
              {busy ? "Conectando…" : "Conectar agora"}
            </button>
            <p className="text-[11px] text-muted-foreground text-center">
              Depois de conectar, os pedidos do iFood entram sozinhos na central.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
