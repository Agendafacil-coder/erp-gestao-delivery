import type { OrderAuditEvent } from "@/functions/orders";
import type { WhatsappMessageLog } from "@/lib/whatsapp/orderNotifications";
import type { AutomationEvent } from "@/lib/ops/detectAutomationEvents";
import {
  describeOrderTransition,
  type HistoryDateFilter,
  isInDateFilter,
} from "@/lib/ops/historyEvents";
import { normalizeOrderStatus, STATUS_LABEL, type OrderStatus } from "@/lib/ops/orderWorkflow";

export type AuditSource = "order" | "automation" | "whatsapp";
export type AuditSeverity = "success" | "warning" | "error" | "info";
export type AuditSourceFilter = "all" | AuditSource;

export type AuditEntry = {
  id: string;
  source: AuditSource;
  createdAt: string;
  actorName: string;
  actorEmail?: string | null;
  action: string;
  summary: string;
  orderId?: string | null;
  orderCode?: string | null;
  severity: AuditSeverity;
  raw?: unknown;
};

function orderSeverity(to: OrderStatus): AuditSeverity {
  if (to === "cancelado") return "error";
  if (to === "entregue") return "success";
  return "info";
}

export function mapOrderEventToAudit(ev: OrderAuditEvent & {
  actorName?: string | null;
  actorEmail?: string | null;
}): AuditEntry {
  const to = normalizeOrderStatus(ev.toStatus);
  const from = ev.fromStatus ? normalizeOrderStatus(ev.fromStatus) : null;
  const actorName = ev.actorName?.trim() || (from == null && to === "novo" ? "Cliente / Sistema" : "Sistema");
  const action =
    from == null && to === "novo"
      ? "Pedido criado"
      : to === "cancelado"
        ? "Pedido cancelado"
        : describeOrderTransition(from, to);

  return {
    id: `order-${ev.id}`,
    source: "order",
    createdAt: ev.createdAt,
    actorName,
    actorEmail: ev.actorEmail ?? null,
    action,
    summary: ev.note?.trim() || action,
    orderId: ev.orderId,
    orderCode: ev.orderCode,
    severity: orderSeverity(to),
    raw: ev,
  };
}

export function mapAutomationToAudit(
  ev: AutomationEvent & { createdAt?: string },
): AuditEntry {
  return {
    id: `auto-${ev.id}`,
    source: "automation",
    createdAt: ev.createdAt ?? new Date().toISOString(),
    actorName: "Automação",
    action: ev.ruleId,
    summary: ev.message,
    severity: ev.level === "error" ? "error" : ev.level === "warn" ? "warning" : "info",
    raw: ev,
  };
}

export function mapWhatsappToAudit(log: WhatsappMessageLog): AuditEntry {
  const severity: AuditSeverity =
    log.status === "failed" ? "error" : log.status === "sent" ? "success" : "info";
  return {
    id: `wa-${log.id}`,
    source: "whatsapp",
    createdAt: log.created_at,
    actorName: "WhatsApp",
    action: log.template_key ? `Mensagem · ${log.template_key}` : "Mensagem enviada",
    summary: `${log.recipient_label}: ${log.content.slice(0, 120)}${log.content.length > 120 ? "…" : ""}`,
    orderId: log.order_id,
    severity,
    raw: log,
  };
}

export function filterAuditEntries(
  entries: AuditEntry[],
  opts: {
    dateFilter: HistoryDateFilter;
    sourceFilter: AuditSourceFilter;
    actorFilter: string;
    search: string;
    now?: number;
  },
): AuditEntry[] {
  const q = opts.search.trim().toLowerCase();
  const now = opts.now ?? Date.now();

  return entries.filter((entry) => {
    if (!isInDateFilter(entry.createdAt, opts.dateFilter, now)) return false;
    if (opts.sourceFilter !== "all" && entry.source !== opts.sourceFilter) return false;
    if (opts.actorFilter !== "all" && entry.actorName !== opts.actorFilter) return false;
    if (!q) return true;
    const hay = [
      entry.actorName,
      entry.actorEmail,
      entry.action,
      entry.summary,
      entry.orderCode,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

export function computeAuditStats(entries: AuditEntry[], now = Date.now()) {
  const today = entries.filter((e) => isInDateFilter(e.createdAt, "today", now));
  return {
    total: entries.length,
    today: today.length,
    cancellationsToday: today.filter(
      (e) => e.source === "order" && e.action.includes("cancelado"),
    ).length,
    automationsToday: today.filter((e) => e.source === "automation").length,
    whatsappToday: today.filter((e) => e.source === "whatsapp").length,
    actorsToday: new Set(today.map((e) => e.actorName)).size,
  };
}

export function uniqueAuditActors(entries: AuditEntry[]): string[] {
  return [...new Set(entries.map((e) => e.actorName))].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export function formatAuditDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function auditEntriesToCsv(entries: AuditEntry[]): string {
  const header = ["Data/Hora", "Origem", "Quem", "Ação", "Pedido", "Resumo"];
  const rows = entries.map((e) => [
    formatAuditDateTime(e.createdAt),
    SOURCE_LABEL[e.source],
    e.actorName,
    e.action,
    e.orderCode ?? "",
    e.summary.replace(/"/g, '""'),
  ]);
  return [header, ...rows]
    .map((cols) => cols.map((c) => `"${c}"`).join(","))
    .join("\n");
}

export const SOURCE_LABEL: Record<AuditSource, string> = {
  order: "Pedido",
  automation: "Automação",
  whatsapp: "WhatsApp",
};

export const SOURCE_FILTER_OPTIONS: { id: AuditSourceFilter; label: string }[] = [
  { id: "all", label: "Todas" },
  { id: "order", label: "Pedidos" },
  { id: "automation", label: "Automações" },
  { id: "whatsapp", label: "WhatsApp" },
];
