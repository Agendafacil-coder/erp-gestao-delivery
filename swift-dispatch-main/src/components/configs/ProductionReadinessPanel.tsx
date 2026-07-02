import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  CheckCircle2,
  ChevronRight,
  Circle,
  ClipboardCheck,
  Copy,
  Loader2,
  RefreshCw,
  Server,
  ShieldAlert,
} from "lucide-react";
import { getProductionReadinessFn } from "@/functions/productionReadiness";
import { getTenantIntegrationChecksFn } from "@/functions/integrationHealth";
import { getStoreSettingsFn } from "@/functions/storeSettings";
import { getWhatsappApiConfigFn } from "@/functions/whatsapp";
import type {
  ProductionReadinessReport,
  ReadinessItem,
  ReadinessSeverity,
} from "@/lib/server/productionReadiness";
import { resolveReadinessDestination } from "@/lib/sistema/readinessLinks";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Props = {
  tenantId: string;
};

const SEVERITY_LABEL: Record<ReadinessSeverity, string> = {
  required: "Obrigatório",
  recommended: "Recomendado",
  optional: "Opcional",
};

function ItemRow({ item }: { item: ReadinessItem }) {
  const destination = resolveReadinessDestination(item.id);
  const Icon = item.done ? CheckCircle2 : Circle;
  const clickable = !item.done && destination?.kind === "route";

  const content = (
    <>
      <Icon
        className={cn(
          "size-4 shrink-0 mt-0.5",
          item.done ? "text-success" : "text-muted-foreground/50",
        )}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("text-sm", item.done ? "text-foreground" : "text-muted-foreground")}>
            {item.label}
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80">
            {SEVERITY_LABEL[item.severity]}
          </span>
        </div>
        {item.hint && !item.done ? (
          <p className="text-xs text-muted-foreground mt-1 leading-snug">{item.hint}</p>
        ) : null}
        {!item.done && destination?.kind === "server" ? (
          <p className="inline-flex items-center gap-1 text-[11px] text-muted-foreground mt-1.5">
            <Server className="size-3 shrink-0" aria-hidden />
            {destination.actionLabel}
          </p>
        ) : null}
        {clickable ? (
          <p className="text-xs font-medium text-primary mt-1.5">{destination.actionLabel}</p>
        ) : null}
      </div>
      {clickable ? (
        <ChevronRight className="size-4 shrink-0 text-primary/70 mt-0.5" aria-hidden />
      ) : null}
      {!item.done && item.hint && destination?.kind === "server" ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            void navigator.clipboard.writeText(item.hint ?? "");
            toast.success("Instrução copiada");
          }}
          className="shrink-0 rounded-lg border border-border p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/30"
          aria-label="Copiar instrução"
          title="Copiar instrução"
        >
          <Copy className="size-3.5" />
        </button>
      ) : null}
    </>
  );

  if (clickable && destination.kind === "route") {
    return (
      <li className="border-b border-border/40 last:border-0">
        <Link
          to={destination.to}
          search={destination.search}
          className="flex items-start gap-3 py-2.5 px-1 -mx-1 rounded-lg transition hover:bg-primary/5 hover:ring-1 hover:ring-primary/15"
        >
          {content}
        </Link>
      </li>
    );
  }

  return (
    <li className="flex items-start gap-3 py-2.5 border-b border-border/40 last:border-0">
      {content}
    </li>
  );
}

export function ProductionReadinessPanel({ tenantId }: Props) {
  const [report, setReport] = useState<ProductionReadinessReport | null>(null);
  const [storeChecks, setStoreChecks] = useState<ReadinessItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [serverReport, settings, whatsapp, integrationChecks] = await Promise.all([
        getProductionReadinessFn({ data: { tenantId } }),
        getStoreSettingsFn({ data: { tenantId } }),
        getWhatsappApiConfigFn({ data: { tenantId } }).catch(() => null),
        getTenantIntegrationChecksFn({ data: { tenantId } }).catch(() => []),
      ]);

      const whatsappOk = Boolean(whatsapp?.enabled && whatsapp?.apiKeySet);
      const regionOk = Boolean(settings.store_city?.trim() && settings.store_state?.trim());
      const fulfillmentOk = settings.delivery_enabled || settings.pickup_enabled;

      setReport(serverReport);
      setStoreChecks([
        {
          id: "tenant_whatsapp",
          label: "WhatsApp da loja conectado",
          done: whatsappOk,
          severity: "recommended",
          hint: "Configure Evolution, Z-API ou Cloud API por tenant.",
        },
        {
          id: "tenant_region",
          label: "Região da loja (cidade e UF)",
          done: regionOk,
          severity: "required",
          hint: "Necessário para entregas, GPS e endereço no cardápio.",
        },
        {
          id: "tenant_fulfillment",
          label: "Entrega ou retirada ativa",
          done: fulfillmentOk,
          severity: "required",
          hint: "O cardápio precisa de ao menos uma forma de pedido.",
        },
        ...integrationChecks.map((c) => ({
          id: c.id,
          label: c.label,
          done: c.done,
          severity: c.severity,
          hint: c.hint,
        })),
      ]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar checklist");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [tenantId]);

  const progress = useMemo(() => {
    if (!report) return { done: 0, total: 0, pct: 0 };
    const storeDone = storeChecks.filter((c) => c.done).length;
    const done = report.progress.done + storeDone;
    const total = report.progress.total + storeChecks.length;
    return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
  }, [report, storeChecks]);

  const copyWebhook = (url: string, label: string) => {
    void navigator.clipboard.writeText(url);
    toast.success(`${label} copiado`);
  };

  if (loading) {
    return (
      <section className="erp-card p-5 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Carregando checklist…
      </section>
    );
  }

  if (!report) return null;

  return (
    <section className="erp-card p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 font-medium">
            <ClipboardCheck className="size-4 text-primary" />
            Pronto para produção
          </div>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Clique nos itens pendentes para ir direto à configuração. Itens de servidor indicam
            variáveis no <code className="text-xs">.env</code>.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="erp-btn-secondary text-xs inline-flex items-center gap-1.5"
        >
          <RefreshCw className="size-3.5" />
          Atualizar
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {progress.done} de {progress.total} itens concluídos
          </span>
          <span className="font-medium tabular-nums">{progress.pct}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              progress.pct >= 80 ? "bg-success" : progress.pct >= 50 ? "bg-warning" : "bg-primary",
            )}
            style={{ width: `${progress.pct}%` }}
          />
        </div>
      </div>

      {report.warnings.length > 0 ? (
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-3 space-y-1.5">
          {report.warnings.map((w) => (
            <p key={w} className="flex items-start gap-2 text-xs text-warning">
              <ShieldAlert className="size-3.5 shrink-0 mt-0.5" aria-hidden />
              {w}
            </p>
          ))}
        </div>
      ) : null}

      <div className="space-y-4">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            Esta loja
          </h3>
          <ul>
            {storeChecks.map((item) => (
              <ItemRow key={item.id} item={item} />
            ))}
          </ul>
        </div>

        {report.categories.map((category) => (
          <div key={category.id}>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Servidor · {category.label}
            </h3>
            <ul>
              {category.items.map((item) => (
                <ItemRow key={item.id} item={item} />
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border/50 bg-muted/15 p-3 space-y-2">
        <p className="text-xs font-medium text-muted-foreground">URLs de webhook (servidor)</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => copyWebhook(report.webhookUrls.payments, "Webhook pagamentos")}
            className="erp-btn-secondary text-xs inline-flex items-center gap-1"
          >
            <Copy className="size-3" />
            Pagamentos
          </button>
          <button
            type="button"
            onClick={() => copyWebhook(report.webhookUrls.ifood, "Webhook iFood")}
            className="erp-btn-secondary text-xs inline-flex items-center gap-1"
          >
            <Copy className="size-3" />
            iFood
          </button>
          <button
            type="button"
            onClick={() => copyWebhook(report.webhookUrls.rappi, "Webhook Rappi")}
            className="erp-btn-secondary text-xs inline-flex items-center gap-1"
          >
            <Copy className="size-3" />
            Rappi
          </button>
          <button
            type="button"
            onClick={() => copyWebhook(report.webhookUrls.food99, "Webhook 99Food")}
            className="erp-btn-secondary text-xs inline-flex items-center gap-1"
          >
            <Copy className="size-3" />
            99Food
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground break-all">{report.publicAppUrl}</p>
      </div>
    </section>
  );
}
