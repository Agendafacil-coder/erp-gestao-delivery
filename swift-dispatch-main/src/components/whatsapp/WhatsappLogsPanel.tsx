import { useMemo, useState } from "react";
import {
  Bike,
  CheckCircle2,
  Clock,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  User,
  XCircle,
} from "lucide-react";
import { AppCard, AppCardContent, AppCardHeader, AppCardTitle } from "@/components/design/AppCard";
import { EmptyState, LoadingState } from "@/components/ops/StateViews";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { WHATSAPP_TEMPLATE_META } from "@/lib/whatsapp/templates";
import type {
  WhatsappHubState,
  MessageLog,
  LogFilter,
  StatusFilter,
  RecipientType,
  MessageStatus,
} from "./types";
import {
  PROVIDER_LABELS,
  PROVIDER_SHORT,
  RECIPIENT_LABEL,
  STATUS_LABEL,
} from "./types";

type Props = Pick<
  WhatsappHubState,
  | "logs"
  | "logsLoading"
  | "loadLogs"
  | "triggerManualTest"
  | "gatewayOnline"
  | "selectedApi"
  | "apiKeySet"
>;

const RECIPIENT_FILTERS: { id: LogFilter; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "cliente", label: "Cliente" },
  { id: "entregador", label: "Entregador" },
  { id: "gerente", label: "Gerente" },
];

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "Qualquer status" },
  { id: "sent", label: "Enviado" },
  { id: "demo", label: "Demo" },
  { id: "failed", label: "Falhou" },
  { id: "pending", label: "Pendente" },
];

function RecipientIcon({ type }: { type: RecipientType }) {
  if (type === "entregador") return <Bike className="size-4" />;
  if (type === "gerente") return <ShieldAlert className="size-4" />;
  return <User className="size-4" />;
}

function recipientTone(type: RecipientType) {
  if (type === "cliente") return "bg-primary/12 text-primary border-primary/25";
  if (type === "entregador") return "bg-accent/12 text-accent border-accent/25";
  return "bg-danger/10 text-danger border-danger/25";
}

function statusTone(status: MessageStatus) {
  if (status === "sent") return "text-success bg-success/10 border-success/20";
  if (status === "failed") return "text-danger bg-danger/10 border-danger/20";
  if (status === "demo") return "text-warning bg-warning/10 border-warning/20";
  return "text-muted-foreground bg-muted border-border";
}

function StatusIcon({ status }: { status: MessageStatus }) {
  if (status === "sent") return <CheckCircle2 className="size-3" />;
  if (status === "failed") return <XCircle className="size-3" />;
  return <Clock className="size-3" />;
}

function LogRow({ log }: { log: MessageLog }) {
  const templateLabel =
    log.templateKey && log.templateKey in WHATSAPP_TEMPLATE_META
      ? WHATSAPP_TEMPLATE_META[log.templateKey as keyof typeof WHATSAPP_TEMPLATE_META].label
      : log.templateKey;

  return (
    <article className="group rounded-2xl border border-border/50 bg-muted/15 p-4 transition hover:bg-muted/25 hover:border-border">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "size-10 rounded-xl border flex items-center justify-center shrink-0",
            recipientTone(log.type),
          )}
        >
          <RecipientIcon type={log.type} />
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-foreground truncate">{log.recipient}</span>
            <span
              className={cn(
                "text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border",
                recipientTone(log.type),
              )}
            >
              {RECIPIENT_LABEL[log.type]}
            </span>
            {templateLabel ? (
              <span className="text-[10px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">
                {templateLabel}
              </span>
            ) : null}
          </div>

          <div className="relative max-w-full sm:max-w-[92%]">
            <div className="rounded-2xl rounded-tl-md bg-card border border-border/60 px-3.5 py-2.5 text-sm text-foreground leading-relaxed whitespace-pre-wrap shadow-sm">
              {log.content}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <span className="tabular-nums">{log.timestamp}</span>
            <span
              className={cn(
                "inline-flex items-center gap-1 font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border text-[10px]",
                statusTone(log.status),
              )}
            >
              <StatusIcon status={log.status} />
              {STATUS_LABEL[log.status]}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

function ProviderStatusCard({
  provider,
  selected,
  gatewayOnline,
  apiKeySet,
}: {
  provider: "evolution" | "zapi" | "cloud";
  selected: boolean;
  gatewayOnline: boolean;
  apiKeySet: boolean;
}) {
  const active = selected && gatewayOnline;
  const configured = selected && apiKeySet;

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-muted/20 px-3.5 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="size-9 rounded-lg bg-card border border-border/60 flex items-center justify-center text-[10px] font-bold shrink-0">
          {PROVIDER_SHORT[provider]}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{PROVIDER_LABELS[provider]}</p>
          <p className="text-[11px] text-muted-foreground">
            {selected ? "Provedor selecionado" : "Disponível"}
          </p>
        </div>
      </div>
      <span
        className={cn(
          "text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full border shrink-0",
          active
            ? "text-success bg-success/10 border-success/25"
            : configured
              ? "text-warning bg-warning/10 border-warning/25"
              : "text-muted-foreground bg-muted border-border",
        )}
      >
        {active ? "Ativo" : configured ? "Config OK" : "—"}
      </span>
    </div>
  );
}

export function WhatsappLogsPanel({
  logs,
  logsLoading,
  loadLogs,
  triggerManualTest,
  gatewayOnline,
  selectedApi,
  apiKeySet,
}: Props) {
  const [search, setSearch] = useState("");
  const [testPhone, setTestPhone] = useState("");
  const [recipientFilter, setRecipientFilter] = useState<LogFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const stats = useMemo(() => {
    const sent = logs.filter((l) => l.status === "sent").length;
    const demo = logs.filter((l) => l.status === "demo").length;
    const failed = logs.filter((l) => l.status === "failed").length;
    const cliente = logs.filter((l) => l.type === "cliente").length;
    return { sent, demo, failed, cliente, total: logs.length };
  }, [logs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((log) => {
      if (recipientFilter !== "all" && log.type !== recipientFilter) return false;
      if (statusFilter !== "all" && log.status !== statusFilter) return false;
      if (!q) return true;
      return (
        log.recipient.toLowerCase().includes(q) ||
        log.content.toLowerCase().includes(q) ||
        (log.templateKey?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [logs, search, recipientFilter, statusFilter]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_min(100%,20rem)] gap-4 lg:gap-5">
      <AppCard className="flex flex-col min-h-[420px] lg:min-h-[520px] overflow-hidden">
        <AppCardHeader className="gap-3">
          <div className="min-w-0">
            <AppCardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="size-4 text-primary" />
              Histórico de disparos
            </AppCardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.total} registro{stats.total === 1 ? "" : "s"} · {stats.sent} enviados · {stats.demo} demo
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadLogs()}
            disabled={logsLoading}
            className="erp-btn-secondary text-xs shrink-0"
          >
            <RefreshCw className={cn("size-3.5", logsLoading && "animate-spin")} />
            Atualizar
          </button>
        </AppCardHeader>

        <div className="px-5 sm:px-6 pb-3 space-y-3 border-b border-border/40">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              type="tel"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="Telefone para teste (11) 99999-9999"
              className="h-9 text-sm flex-1"
            />
            <button
              type="button"
              onClick={() => void triggerManualTest(testPhone)}
              className="erp-btn-primary text-xs justify-center shrink-0"
            >
              <Send className="size-3.5" />
              Disparo teste
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar destinatário ou mensagem…"
              className="pl-9 h-9 text-sm"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex flex-wrap gap-1.5 flex-1">
              {RECIPIENT_FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setRecipientFilter(f.id)}
                  className={cn(
                    "text-[11px] px-2.5 py-1 rounded-full border font-medium transition",
                    recipientFilter === f.id
                      ? "bg-primary/15 border-primary/30 text-primary"
                      : "border-border text-muted-foreground hover:bg-muted/50",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="h-8 rounded-lg border border-border/60 bg-muted/40 px-2.5 text-[11px] text-foreground sm:max-w-[9rem]"
            >
              {STATUS_FILTERS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <AppCardContent className="flex-1 overflow-y-auto space-y-3 min-h-[280px] max-h-[min(60vh,560px)]">
          {logsLoading && logs.length === 0 ? (
            <LoadingState label="Carregando histórico…" size="sm" className="border-0 bg-transparent" />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title={logs.length === 0 ? "Nenhum disparo ainda" : "Nenhum resultado neste filtro"}
              description={
                logs.length === 0
                  ? "Avance um pedido na operação ou use o disparo de teste para ver mensagens aqui."
                  : "Ajuste os filtros ou limpe a busca."
              }
              size="sm"
              className="border-0 bg-transparent"
              action={
                logs.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => void triggerManualTest(testPhone)}
                    className="erp-btn-primary text-xs"
                  >
                    <Send className="size-3.5" />
                    Enviar teste
                  </button>
                ) : undefined
              }
            />
          ) : (
            filtered.map((log) => <LogRow key={log.id} log={log} />)
          )}
        </AppCardContent>
      </AppCard>

      <aside className="space-y-4">
        <AppCard>
          <AppCardHeader>
            <AppCardTitle className="text-sm">Resumo da sessão</AppCardTitle>
          </AppCardHeader>
          <AppCardContent className="grid grid-cols-2 gap-3">
            {[
              { label: "Total", value: stats.total },
              { label: "Clientes", value: stats.cliente },
              { label: "Enviados", value: stats.sent, tone: "text-success" },
              { label: "Demo", value: stats.demo, tone: "text-warning" },
              { label: "Falhas", value: stats.failed, tone: "text-danger" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-border/50 bg-muted/20 p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                  {item.label}
                </p>
                <p className={cn("text-xl font-bold tabular-nums mt-1", item.tone ?? "text-foreground")}>
                  {item.value}
                </p>
              </div>
            ))}
          </AppCardContent>
        </AppCard>

        <AppCard>
          <AppCardHeader>
            <AppCardTitle className="text-sm">Provedores de API</AppCardTitle>
          </AppCardHeader>
          <AppCardContent className="space-y-2.5">
            {(["evolution", "zapi", "cloud"] as const).map((provider) => (
              <ProviderStatusCard
                key={provider}
                provider={provider}
                selected={selectedApi === provider}
                gatewayOnline={gatewayOnline}
                apiKeySet={apiKeySet}
              />
            ))}
          </AppCardContent>
        </AppCard>

        <AppCard>
          <AppCardContent className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Gatilhos automáticos</p>
            <ul className="text-xs text-muted-foreground space-y-1.5 leading-relaxed">
              <li>· Pedido recebido, preparo e entrega → cliente</li>
              <li>· Nova entrega atribuída → entregador</li>
              <li>· Prazo estourado → gerente</li>
            </ul>
          </AppCardContent>
        </AppCard>
      </aside>
    </div>
  );
}
