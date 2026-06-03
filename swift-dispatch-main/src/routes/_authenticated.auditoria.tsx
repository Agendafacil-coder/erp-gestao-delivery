import { OpsPage } from "@/components/ops/OpsPage";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { useTenant } from "@/hooks/useTenant";
import { useOps } from "@/hooks/useOps";
import { useI18n } from "@/hooks/useI18n";
import { Terminal, Sparkles, Clock, ChevronRight } from "lucide-react";
import { listOrderEventsFn, type OrderAuditEvent } from "@/functions/orders";
import { STATUS_LABEL } from "@/lib/ops/mock";
import { USE_POSTGRES } from "@/lib/repositories";
import type { LocalAlert } from "@/lib/db/localDb";

export const Route = createFileRoute("/_authenticated/auditoria")({
  component: AuditPage,
});

type AuditEvent = {
  id: string;
  timestamp: string;
  type: "info" | "success" | "warning" | "error" | "ai";
  category: "pedido" | "cozinha" | "driver" | "sla" | "whatsapp" | "supabase";
  title: string;
  detail: string;
  payload: string;
};

function mapOrderEvent(ev: OrderAuditEvent): AuditEvent {
  const from = ev.fromStatus ? STATUS_LABEL[ev.fromStatus] : "—";
  const to = STATUS_LABEL[ev.toStatus];
  const at = new Date(ev.createdAt);
  return {
    id: ev.id,
    timestamp: at.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    type: ev.toStatus === "cancelado" ? "error" : "success",
    category: "pedido",
    title: `${ev.orderCode}: ${from} → ${to}`,
    detail: "Alteração de status registrada no banco",
    payload: JSON.stringify(ev, null, 2),
  };
}

function mapAlert(a: LocalAlert): AuditEvent {
  const levelType: AuditEvent["type"] =
    a.level === "crit" ? "error" : a.level === "high" ? "warning" : a.level === "med" ? "info" : "success";
  return {
    id: `alert-${a.id}`,
    timestamp: new Date(a.timestamp).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
    type: levelType,
    category: "sla",
    title: a.title,
    detail: a.detail,
    payload: JSON.stringify(a, null, 2),
  };
}

function AuditPage() {
  const { current } = useTenant();
  const { t } = useI18n();
  const { tick, alerts } = useOps();

  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  const loadEvents = async (tenantId: string) => {
    setEventsLoading(true);
    try {
      const merged: AuditEvent[] = [];
      if (USE_POSTGRES) {
        const rows = await listOrderEventsFn({ data: { tenantId, limit: 40 } });
        merged.push(...rows.map(mapOrderEvent));
      }
      merged.push(...alerts.map(mapAlert));
      merged.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      setEvents(merged.slice(0, 50));
      if (merged.length > 0) {
        setSelectedEventId((prev) => (prev && merged.some((e) => e.id === prev) ? prev : merged[0].id));
      } else {
        setSelectedEventId("");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setEventsLoading(false);
    }
  };

  useEffect(() => {
    if (!current?.id) return;
    void loadEvents(current.id);
  }, [current?.id, tick, alerts]);

  const selectedEvent = useMemo(() => {
    return events.find((e) => e.id === selectedEventId) ?? events[0] ?? null;
  }, [events, selectedEventId]);
  return (
    <OpsPage className="ops-split-page !space-y-0">
            
            {/* Left Timeline Panel: Military log layout */}
            <div className="lg:col-span-4 flex flex-col space-y-4 min-h-0 lg:h-full overflow-y-auto lg:overflow-hidden">
              <div>
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-primary-glow animate-pulse" />
                  <span className="text-xs text-muted-foreground">Histórico</span>
                </div>
                <h1 className="erp-page-title mt-1">Auditoria operacional</h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Eventos reais de pedidos e alertas da operação.
                </p>
              </div>

              {/* Timeline list box */}
              <div className="bg-card border border-border rounded-2xl p-4 flex-1 flex flex-col overflow-hidden">
                <div className="border-b border-border/40 pb-2 flex justify-between items-center shrink-0">
                  <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider font-bold">Timeline Operacional ({events.length})</span>
                  <span className="text-[8px] font-mono text-muted-foreground uppercase flex items-center gap-1">
                    <Clock className="size-2.5 animate-pulse" /> TICK: #{tick}
                  </span>
                </div>

                {/* Event list */}
                <div className="flex-1 overflow-y-auto mt-4 pr-1 space-y-3 relative">
                  {eventsLoading ? (
                    <p className="text-xs text-muted-foreground text-center py-8">{t("common", "loading")}</p>
                  ) : events.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-8 leading-relaxed">
                      Nenhum evento ainda. Alterações de status e alertas aparecem aqui conforme a operação roda.
                    </p>
                  ) : null}
                  <div className="absolute left-[13px] top-2 bottom-2 w-0.5 border-l-2 border-dashed border-border/40 pointer-events-none" />

                  {events.map(ev => {
                    const typeColors: Record<AuditEvent["type"], { glow: string; text: string; bg: string }> = {
                      info: { glow: "oklch(0.72 0.22 280)", text: "text-blue-400", bg: "bg-blue-950/20 border-blue-500/20" },
                      success: { glow: "oklch(0.74 0.17 155)", text: "text-success", bg: "bg-success/5 border-success/15" },
                      warning: { glow: "oklch(0.82 0.16 80)", text: "text-warning", bg: "bg-warning/5 border-warning/15" },
                      error: { glow: "oklch(0.65 0.24 25)", text: "text-danger", bg: "bg-danger/5 border-danger/15" },
                      ai: { glow: "var(--primary)", text: "text-primary-glow animate-pulse", bg: "bg-primary/5 border-primary/20 shadow-[0_0_12px_rgba(var(--primary-rgb),0.05)]" }
                    };
                    const color = typeColors[ev.type];

                    return (
                      <div 
                        key={ev.id}
                        onClick={() => setSelectedEventId(ev.id)}
                        className={`flex items-start gap-3 p-2.5 rounded-xl border transition cursor-pointer relative z-10 ${
                          selectedEventId === ev.id 
                            ? "bg-white/[0.03] border-white/20 shadow-glow" 
                            : "bg-surface/10 border-transparent hover:bg-surface/30"
                        }`}
                      >
                        {/* Event Category Indicator circle */}
                        <div 
                          className="size-7 rounded-full flex items-center justify-center shrink-0 border"
                          style={{ borderColor: color.glow, backgroundColor: color.glow + "12", color: color.glow }}
                        >
                          <span className="text-[9px] font-mono font-black">{ev.timestamp.slice(0, 5)}</span>
                        </div>

                        <div className="overflow-hidden flex-1">
                          <div className={`text-[10px] font-bold truncate leading-snug flex items-center gap-1.5 ${color.text}`}>
                            {ev.type === "ai" && <Sparkles className="size-3" />}
                            {ev.title}
                          </div>
                          <p className="text-[9px] text-muted-foreground mt-0.5 leading-snug truncate">{ev.detail}</p>
                        </div>
                        
                        <ChevronRight className="size-3 text-muted-foreground shrink-0 mt-2" />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="lg:col-span-8 flex flex-col min-h-[280px] lg:min-h-0 lg:h-full overflow-hidden">
              <div className="bg-card border border-border rounded-2xl p-5 flex-1 flex flex-col overflow-hidden">
                <div className="border-b border-border/40 pb-3 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <Terminal className="size-4 text-primary" />
                    <div>
                      <h3 className="text-xs font-semibold text-foreground">Detalhes do evento</h3>
                      <p className="text-[11px] text-muted-foreground">Payload registrado</p>
                    </div>
                  </div>
                  {selectedEvent ? (
                    <span className="text-[9px] font-mono text-muted-foreground border border-border px-2 py-0.5 rounded">
                      {selectedEvent.id}
                    </span>
                  ) : null}
                </div>

                {selectedEvent ? (
                  <div className="flex-1 overflow-auto mt-4 pr-1 font-mono text-[11px] text-foreground leading-relaxed bg-muted/40 p-4 rounded-xl border border-border">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground mb-4">
                      <div>Horário: <b className="text-foreground">{selectedEvent.timestamp}</b></div>
                      <div>Categoria: <b className="text-foreground uppercase">{selectedEvent.category}</b></div>
                      <div>Tipo: <b className="text-foreground uppercase">{selectedEvent.type}</b></div>
                    </div>
                    <pre className="whitespace-pre-wrap text-[10px]">{selectedEvent.payload}</pre>
                  </div>
                ) : (
                  <p className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                    Selecione um evento na timeline
                  </p>
                )}
              </div>
            </div>
    </OpsPage>
  );
}
