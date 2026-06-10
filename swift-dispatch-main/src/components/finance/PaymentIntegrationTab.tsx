import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  CreditCard,
  ExternalLink,
  Loader2,
  Smartphone,
  Wallet,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppCard, AppCardHeader, AppCardTitle } from "@/components/design/AppCard";
import {
  getPaymentHubStatusFn,
  listRecentPaymentsFn,
  type RecentPaymentRow,
} from "@/functions/paymentSettings";
import type { PaymentHubStatus } from "@/lib/payments/paymentEnvStatus";
import { fmtBRL } from "@/lib/format/currency";
import { cn } from "@/lib/utils";

type Props = {
  tenantId: string | undefined;
  tenantSlug?: string;
  checkoutUrl?: string;
};

const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  pago: "Pago",
  falhou: "Falhou",
  reembolsado: "Reembolsado",
};

const PROVIDER_BADGE: Record<string, string> = {
  mock: "Mock",
  mercadopago: "Mercado Pago",
  stripe: "Stripe",
  asaas: "Asaas",
};

export function PaymentIntegrationTab({ tenantId, tenantSlug, checkoutUrl }: Props) {
  const [hub, setHub] = useState<PaymentHubStatus | null>(null);
  const [payments, setPayments] = useState<RecentPaymentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!tenantId) {
      setHub(null);
      setPayments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [status, recent] = await Promise.all([
        getPaymentHubStatusFn({ data: { tenantId } }),
        listRecentPaymentsFn({ data: { tenantId, limit: 25 } }),
      ]);
      setHub(status);
      setPayments(recent);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copiado`);
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  if (loading && !hub) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
        <Loader2 className="size-5 animate-spin" />
        <span className="text-sm">Carregando integração…</span>
      </div>
    );
  }

  if (!hub) return null;

  const stepsDone = hub.setupSteps.filter((s) => s.done).length;
  const activeMeta = hub.supportedProviders.find((p) => p.id === hub.provider);

  return (
    <div className="space-y-5">
      <div
        className={cn(
          "rounded-2xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3",
          hub.ready
            ? "border-success/30 bg-success/[0.06]"
            : "border-warning/30 bg-warning/[0.06]",
        )}
      >
        <div className="flex items-start gap-3 min-w-0">
          {hub.ready ? (
            <CheckCircle2 className="size-5 text-success shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="size-5 text-warning shrink-0 mt-0.5" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              Provedor ativo: {hub.providerLabel}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {hub.ready
                ? "Credenciais detectadas no servidor — checkout Pix/cartão habilitado."
                : "Configure as variáveis no .env do servidor e reinicie o app."}
            </p>
          </div>
        </div>
        <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground shrink-0">
          NODE_ENV={hub.nodeEnv}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AppCard>
          <AppCardHeader className="border-b border-border/40">
            <AppCardTitle className="flex items-center gap-2">
              <Wallet className="size-4 text-primary" />
              Webhook e URL pública
            </AppCardTitle>
          </AppCardHeader>
          <div className="px-5 py-4 sm:px-6 space-y-4">
            <FieldCopy
              label="Webhook (todos os PSPs)"
              value={hub.webhookUrl}
              onCopy={() => void copyText(hub.webhookUrl, "Webhook")}
            />
            <FieldCopy
              label="PUBLIC_APP_URL"
              value={hub.publicAppUrl}
              onCopy={() => void copyText(hub.publicAppUrl, "URL pública")}
            />
            {tenantSlug && checkoutUrl ? (
              <div className="text-xs text-muted-foreground">
                Checkout do cliente:{" "}
                <Link
                  to="/$tenantSlug/checkout"
                  params={{ tenantSlug }}
                  className="text-primary font-medium hover:underline"
                  target="_blank"
                >
                  {checkoutUrl}
                </Link>
              </div>
            ) : null}
          </div>
        </AppCard>

        <AppCard>
          <AppCardHeader className="border-b border-border/40">
            <AppCardTitle>
              Checklist — {stepsDone}/{hub.setupSteps.length}
            </AppCardTitle>
          </AppCardHeader>
          <ul className="px-5 py-4 sm:px-6 space-y-2">
            {hub.setupSteps.map((step) => (
              <li key={step.id} className="flex items-start gap-2 text-sm">
                {step.done ? (
                  <CheckCircle2 className="size-4 text-success shrink-0 mt-0.5" />
                ) : (
                  <span className="size-4 rounded-full border-2 border-muted-foreground/40 shrink-0 mt-0.5" />
                )}
                <span className={step.done ? "text-muted-foreground" : "text-foreground"}>
                  {step.label}
                </span>
              </li>
            ))}
          </ul>
        </AppCard>
      </div>

      <AppCard>
        <AppCardHeader className="border-b border-border/40">
          <AppCardTitle>Provedores suportados</AppCardTitle>
        </AppCardHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 px-5 py-4 sm:px-6">
          {hub.supportedProviders.map((p) => {
            const active = p.id === hub.provider;
            const cred =
              p.id === "mercadopago"
                ? hub.credentials.mercadopago
                : p.id === "stripe"
                  ? hub.credentials.stripe
                  : p.id === "asaas"
                    ? hub.credentials.asaas
                    : null;
            const configured =
              p.id === "mock" ||
              (p.id === "mercadopago" && cred && "accessTokenSet" in cred && cred.accessTokenSet) ||
              (p.id === "stripe" && cred && "secretKeySet" in cred && cred.secretKeySet) ||
              (p.id === "asaas" && cred && "apiKeySet" in cred && cred.apiKeySet);

            return (
              <div
                key={p.id}
                className={cn(
                  "rounded-xl border p-3 space-y-2",
                  active ? "border-primary/40 bg-primary/[0.05]" : "border-border/50 bg-card/50",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{p.label}</span>
                  {active ? (
                    <span className="text-[9px] uppercase font-bold text-primary">Ativo</span>
                  ) : null}
                </div>
                <div className="flex gap-2 text-[10px] text-muted-foreground">
                  {p.pix ? (
                    <span className="inline-flex items-center gap-0.5">
                      <Smartphone className="size-3" /> Pix
                    </span>
                  ) : null}
                  {p.card ? (
                    <span className="inline-flex items-center gap-0.5">
                      <CreditCard className="size-3" /> Cartão
                    </span>
                  ) : null}
                </div>
                <code className="block text-[10px] text-muted-foreground bg-muted/40 rounded px-2 py-1">
                  {p.envHint}
                </code>
                <p className="text-[10px] text-muted-foreground">
                  {configured ? "Credenciais OK" : "Não configurado"}
                </p>
              </div>
            );
          })}
        </div>
        {activeMeta ? (
          <p className="px-5 pb-4 sm:px-6 text-xs text-muted-foreground">
            Para trocar o provedor, altere <code>PAYMENT_PROVIDER</code> no{" "}
            <code>.env</code> do servidor e reinicie. A configuração é global (não por loja).
          </p>
        ) : null}
      </AppCard>

      <AppCard>
        <AppCardHeader className="border-b border-border/40 flex-row items-center justify-between">
          <AppCardTitle>Transações recentes</AppCardTitle>
          <button
            type="button"
            onClick={() => void load()}
            className="text-xs text-primary font-medium hover:underline"
          >
            Atualizar
          </button>
        </AppCardHeader>
        {payments.length === 0 ? (
          <p className="px-5 py-8 sm:px-6 text-sm text-muted-foreground text-center">
            Nenhum pagamento online registrado ainda. Pedidos Pix/cartão no cardápio público
            aparecem aqui.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border/40">
                  <th className="px-4 py-3 font-semibold">Pedido</th>
                  <th className="px-4 py-3 font-semibold">Provedor</th>
                  <th className="px-4 py-3 font-semibold">Forma</th>
                  <th className="px-4 py-3 font-semibold text-right">Valor</th>
                  <th className="px-4 py-3 font-semibold text-center">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Data</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-border/30 last:border-0 hover:bg-muted/20"
                  >
                    <td className="px-4 py-3 font-mono text-xs">{p.order_code ?? p.order_id.slice(0, 8)}</td>
                    <td className="px-4 py-3 text-xs">
                      {PROVIDER_BADGE[p.provider] ?? p.provider}
                    </td>
                    <td className="px-4 py-3 text-xs capitalize">{p.method ?? "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{fmtBRL(p.amount)}</td>
                    <td className="px-4 py-3 text-center">
                      <StatusPill status={p.status} />
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-muted-foreground tabular-nums">
                      {new Date(p.paid_at ?? p.created_at).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AppCard>

      <p className="text-xs text-muted-foreground leading-relaxed flex items-start gap-1.5">
        <ExternalLink className="size-3.5 shrink-0 mt-0.5" />
        Documentação completa das variáveis em{" "}
        <code className="text-foreground">.env.example</code> e{" "}
        <code className="text-foreground">README.md</code> (seção Pagamentos online).
      </p>
    </div>
  );
}

function FieldCopy({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy: () => void;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1.5">
        {label}
      </p>
      <div className="flex gap-2">
        <input
          readOnly
          value={value}
          className="flex-1 min-w-0 h-9 px-3 rounded-lg border border-border bg-muted/30 text-xs font-mono"
        />
        <button
          type="button"
          onClick={onCopy}
          className="h-9 px-3 rounded-lg border border-border hover:bg-muted/50 shrink-0"
          aria-label={`Copiar ${label}`}
        >
          <Copy className="size-4" />
        </button>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "pago"
      ? "text-success bg-success/10 border-success/25"
      : status === "falhou"
        ? "text-destructive bg-destructive/10 border-destructive/25"
        : "text-warning bg-warning/10 border-warning/25";
  return (
    <span
      className={cn(
        "inline-block text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border",
        tone,
      )}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}
