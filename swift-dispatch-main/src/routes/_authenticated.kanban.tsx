import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  DndContext, DragOverlay, PointerSensor, useDraggable, useDroppable,
  useSensor, useSensors, type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { OpsSidebar } from "@/components/ops/Sidebar";
import { OpsHeader } from "@/components/ops/Header";
import { Onboarding } from "@/components/ops/Onboarding";
import { useTenant } from "@/hooks/useTenant";
import { useOps } from "@/hooks/useOps";
import { useI18n } from "@/hooks/useI18n";
import { toast } from "sonner";
import { AlertTriangle, Bike, Clock, Flame, Package, Phone } from "lucide-react";
import { type OrderStatus } from "@/lib/ops/mock";
import { formatPhoneShort, whatsAppChatUrl } from "@/lib/whatsapp";

export const Route = createFileRoute("/_authenticated/kanban")({
  component: KanbanPage,
});

type LocalOrder = {
  id: string; code: string; status: OrderStatus; priority: "baixa"|"normal"|"alta"|"critica";
  customer_name: string; customer_phone: string | null; address: string;
  items_count: number; total_amount: number; channel: string | null;
  sla_minutes: number; placed_at: string; driver_id: string | null;
};

const COLUMN_ACCENT: Record<OrderStatus, string> = {
  novo: "bg-primary",
  em_preparo: "bg-warning",
  pronto: "bg-muted-foreground/40",
  aguardando_entregador: "bg-primary/70",
  em_rota_coleta: "bg-primary/70",
  retirado: "bg-primary/50",
  em_rota_entrega: "bg-primary",
  entregue: "bg-success",
  cancelado: "bg-danger",
};

const COLUMNS: { id: OrderStatus }[] = [
  { id: "novo" },
  { id: "em_preparo" },
  { id: "pronto" },
  { id: "aguardando_entregador" },
  { id: "em_rota_coleta" },
  { id: "retirado" },
  { id: "em_rota_entrega" },
  { id: "entregue" },
  { id: "cancelado" },
];

function KanbanPage() {
  const { current, loading } = useTenant();
  const { t } = useI18n();
  const { orders, tick, updateOrderStatus } = useOps();
  const [activeId, setActiveId] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map: Record<OrderStatus, LocalOrder[]> = {
      novo: [], em_preparo: [], pronto: [], aguardando_entregador: [],
      em_rota_coleta: [], retirado: [], em_rota_entrega: [], entregue: [], cancelado: [],
    };
    for (const o of orders) {
      if (map[o.status]) {
        map[o.status].push(o as LocalOrder);
      }
    }
    return map;
  }, [orders]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const onDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    const id = e.active.id as string;
    const to = e.over?.id as OrderStatus | undefined;
    if (!to) return;
    
    const order = orders.find(o => o.id === id);
    if (!order || order.status === to) return;
    
    try {
      await updateOrderStatus(id, to);
      toast.success(`Pedido ${order.code} movido para ${t("kanban", "columns")[to]}!`);
    } catch (err: any) {
      toast.error(`Erro ao mover cartão: ${err.message}`);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">{t("common", "loading")}</div>;
  }

  return (
    <div className="min-h-screen flex">
      <OpsSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <OpsHeader tick={tick} />
        {!current ? (
          <Onboarding />
        ) : (
          <main className="flex-1 p-4 lg:p-6 space-y-5 overflow-hidden flex flex-col bg-background">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="erp-page-subtitle">{t("kanban", "subtitle")}</p>
                <h1 className="erp-page-title mt-1">
                  {t("kanban", "title")} {t("kanban", "highlight")}
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <KanbanPill>{orders.length} {t("kanban", "itemsCount")}</KanbanPill>
                <KanbanPill tone="warning">{grouped.em_preparo.length} em preparo</KanbanPill>
                <KanbanPill tone="primary">{grouped.em_rota_entrega.length} em rota</KanbanPill>
                <KanbanPill tone="success">{grouped.entregue.length} entregues</KanbanPill>
              </div>
            </div>

            <DndContext sensors={sensors} onDragStart={(e: DragStartEvent) => setActiveId(e.active.id as string)} onDragEnd={onDragEnd}>
              <div className="flex-1 overflow-x-auto -mx-4 lg:-mx-6 px-4 lg:px-6">
                <div className="flex gap-3 min-w-max pb-4 h-[calc(100vh-210px)]">
                  {COLUMNS.map((col) => (
                    <Column
                      key={col.id}
                      col={{
                        id: col.id,
                        title: t("kanban", "columns")[col.id],
                        accent: COLUMN_ACCENT[col.id],
                      }}
                      orders={grouped[col.id]}
                    />
                  ))}
                </div>
              </div>
              <DragOverlay>
                {activeId ? <Card order={orders.find(o => o.id === activeId) as LocalOrder} dragging /> : null}
              </DragOverlay>
            </DndContext>
          </main>
        )}
      </div>
    </div>
  );
}

function KanbanPill({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "muted" | "warning" | "primary" | "success";
}) {
  const tones: Record<string, string> = {
    muted: "bg-muted text-muted-foreground",
    warning: "bg-warning/15 text-warning",
    primary: "bg-primary/10 text-primary",
    success: "bg-success/15 text-success",
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

function Column({
  col,
  orders,
}: {
  col: { id: OrderStatus; title: string; accent: string };
  orders: LocalOrder[];
}) {
  const { isOver, setNodeRef } = useDroppable({ id: col.id });
  const { t } = useI18n();

  return (
    <div className="w-[292px] flex-shrink-0 flex flex-col h-full select-none">
      <div className="rounded-2xl border border-border bg-muted/30 flex flex-col h-full overflow-hidden shadow-sm">
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border bg-card shrink-0">
          <span className={`size-2 rounded-full shrink-0 ${col.accent}`} aria-hidden />
          <span className="text-sm font-medium text-foreground flex-1 truncate">{col.title}</span>
          <span className="text-xs font-medium tabular-nums text-muted-foreground bg-muted px-2 py-0.5 rounded-full min-w-[1.5rem] text-center">
            {orders.length}
          </span>
        </div>
        <div
          ref={setNodeRef}
          className={`flex-1 overflow-y-auto p-3 space-y-3 transition-colors ${
            isOver ? "bg-primary/5 ring-2 ring-inset ring-primary/25" : "bg-muted/20"
          }`}
        >
          {orders.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">{t("kanban", "empty")}</p>
          )}
          {orders.map((o) => (
            <DraggableCard key={o.id} order={o} />
          ))}
        </div>
      </div>
    </div>
  );
}

function DraggableCard({ order }: { order: LocalOrder }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: order.id });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`cursor-grab active:cursor-grabbing transition-transform ${isDragging ? "opacity-35 scale-95" : ""}`}
    >
      <Card order={order} />
    </div>
  );
}

function Card({ order, dragging = false }: { order: LocalOrder; dragging?: boolean }) {
  const placed = new Date(order.placed_at).getTime();
  const elapsed = Math.max(0, Math.floor((Date.now() - placed) / 60000));
  const remaining = order.sla_minutes - elapsed;
  const isDelayed = remaining < 0;

  const slaPct = Math.min(100, (elapsed / order.sla_minutes) * 100);
  const slaBar =
    slaPct < 60 ? "bg-success" : slaPct < 90 ? "bg-warning" : "bg-danger";

  const prio = order.priority;
  const prioAccent =
    prio === "critica"
      ? "ring-danger/30"
      : prio === "alta"
        ? "ring-warning/25"
        : "ring-transparent";

  const prioIcon =
    prio === "critica" ? (
      <Flame className="size-3.5 text-danger" />
    ) : prio === "alta" ? (
      <AlertTriangle className="size-3.5 text-warning" />
    ) : null;

  const waUrl = whatsAppChatUrl(order.customer_phone);
  const phoneLabel = formatPhoneShort(order.customer_phone);

  return (
    <article
      className={`rounded-2xl border border-border bg-card p-3.5 shadow-sm space-y-2.5 transition-all hover:shadow-md hover:border-border-strong ${prioAccent} ring-1 ${
        dragging ? "ring-2 ring-primary/40 shadow-lg scale-[1.02]" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-semibold text-foreground tabular-nums tracking-tight">
          {order.code}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {prioIcon}
          {order.driver_id && <Bike className="size-3.5 text-primary" />}
          {order.channel && (
            <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {order.channel}
            </span>
          )}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-foreground leading-snug truncate">{order.customer_name}</p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">{order.address}</p>
      </div>

      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground pt-2 border-t border-border/60">
        <span className="inline-flex items-center gap-1">
          <Package className="size-3.5 opacity-70" />
          {order.items_count}
        </span>
        {waUrl ? (
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Abrir conversa no WhatsApp"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 tabular-nums text-[#25d366] hover:text-[#20bd5a] hover:underline underline-offset-2"
          >
            <Phone className="size-3.5 opacity-90" />
            {phoneLabel}
          </a>
        ) : (
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Phone className="size-3.5 opacity-70" />
            {phoneLabel}
          </span>
        )}
        <span className="text-sm font-semibold text-foreground tabular-nums">
          R$ {Number(order.total_amount).toFixed(2)}
        </span>
      </div>

      <div className="rounded-xl bg-muted/50 p-2.5 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span
            className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg ${
              isDelayed
                ? "text-danger bg-danger/10"
                : remaining < 15
                  ? "text-warning bg-warning/10"
                  : "text-success bg-success/10"
            }`}
          >
            <Clock className="size-3 shrink-0" />
            {isDelayed ? `Atraso ${Math.abs(remaining)} min` : `${remaining} min restantes`}
          </span>
          <span
            className={`text-xs font-medium tabular-nums ${
              slaPct >= 90 ? "text-danger" : slaPct >= 60 ? "text-warning" : "text-muted-foreground"
            }`}
          >
            {Math.round(slaPct)}%
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-border/80 overflow-hidden">
          <div className={`h-full rounded-full ${slaBar} transition-all duration-500`} style={{ width: `${slaPct}%` }} />
        </div>
      </div>
    </article>
  );
}