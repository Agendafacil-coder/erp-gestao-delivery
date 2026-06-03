import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  DndContext, DragOverlay, PointerSensor, useDraggable, useDroppable,
  useSensor, useSensors, type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { OpsPage } from "@/components/ops/OpsPage";
import { OpsPageHeader } from "@/components/ops/OpsPageHeader";
import { useTenant } from "@/hooks/useTenant";
import { useOps } from "@/hooks/useOps";
import { useI18n } from "@/hooks/useI18n";
import { toast } from "sonner";
import { AlertTriangle, Bike, Clock, Flame, Package, Phone } from "lucide-react";
import { KANBAN_COLUMNS, canTransition, normalizeOrderStatus, type OrderStatus } from "@/lib/ops/orderWorkflow";
import { OrderDetailPanel } from "@/components/ops/OrderDetailPanel";
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
  confirmado: "bg-primary/80",
  em_preparo: "bg-warning",
  pronto: "bg-muted-foreground/40",
  aguardando_entregador: "bg-primary/70",
  em_rota_entrega: "bg-primary",
  entregue: "bg-success",
  cancelado: "bg-danger",
};

const COLUMNS: { id: OrderStatus }[] = KANBAN_COLUMNS.map((id) => ({ id }));

function KanbanPage() {
  const { current } = useTenant();
  const { t } = useI18n();
  const { orders, drivers, tick, updateOrderStatus } = useOps();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map = Object.fromEntries(KANBAN_COLUMNS.map((s) => [s, [] as LocalOrder[]])) as Record<
      OrderStatus,
      LocalOrder[]
    >;
    for (const o of orders) {
      const st = normalizeOrderStatus(o.status);
      if (map[st]) map[st].push(o as LocalOrder);
    }
    return map;
  }, [orders]);

  const detailOrder = detailOrderId ? orders.find((o) => o.id === detailOrderId) : null;
  const detailDriverName = detailOrder?.driver_id
    ? drivers.find((d) => d.id === detailOrder.driver_id)?.name
    : null;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const onDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    const id = e.active.id as string;
    const to = e.over?.id as OrderStatus | undefined;
    if (!to) return;
    
    const order = orders.find((o) => o.id === id);
    if (!order) return;
    const from = normalizeOrderStatus(order.status);
    if (from === to) return;

    if (!canTransition(from, to)) {
      toast.error(`Transição inválida: use as ações do pedido para este fluxo.`);
      return;
    }
    if (to === "em_rota_entrega" && !order.driver_id) {
      toast.error("Atribua um entregador antes de sair para entrega.");
      return;
    }

    try {
      await updateOrderStatus(id, to);
      toast.success(`Pedido ${order.code} → ${t("kanban", "columns")[to]}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <OpsPage flush className="flex flex-col overflow-hidden !p-4 md:!p-5 lg:!p-6 !space-y-5">
      <OpsPageHeader
        subtitle={t("kanban", "subtitle")}
        title={t("kanban", "title")}
        highlight={t("kanban", "highlight")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <KanbanPill>{orders.length} {t("kanban", "itemsCount")}</KanbanPill>
            <KanbanPill tone="warning">{grouped.em_preparo.length} em preparo</KanbanPill>
            <KanbanPill tone="primary">{grouped.em_rota_entrega.length} em rota</KanbanPill>
            <KanbanPill tone="success">{grouped.entregue.length} entregues</KanbanPill>
          </div>
        }
      />

      <DndContext
        sensors={sensors}
        onDragStart={(e: DragStartEvent) => setActiveId(e.active.id as string)}
        onDragEnd={onDragEnd}
      >
        <div className="flex-1 min-h-0 overflow-x-auto -mx-1 px-1">
          <div className="flex gap-3 min-w-max pb-4 min-h-[calc(100dvh-12rem)] md:min-h-[calc(100dvh-11rem)]">
            {COLUMNS.map((col) => (
              <Column
                key={col.id}
                col={{
                  id: col.id,
                  title: t("kanban", "columns")[col.id],
                  accent: COLUMN_ACCENT[col.id],
                }}
                orders={grouped[col.id]}
                onOpenOrder={setDetailOrderId}
              />
            ))}
          </div>
        </div>
        <DragOverlay>
          {activeId ? (
            <Card order={orders.find((o) => o.id === activeId) as LocalOrder} dragging />
          ) : null}
        </DragOverlay>
      </DndContext>

      {detailOrder && current && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/40"
            aria-label="Fechar painel"
            onClick={() => setDetailOrderId(null)}
          />
          <OrderDetailPanel
            order={detailOrder}
            drivers={drivers}
            driverName={detailDriverName}
            tenantId={current.id}
            onClose={() => setDetailOrderId(null)}
          />
        </>
      )}
    </OpsPage>
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
  onOpenOrder,
}: {
  col: { id: OrderStatus; title: string; accent: string };
  orders: LocalOrder[];
  onOpenOrder: (id: string) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: col.id });
  const { t } = useI18n();

  return (
    <div className="w-[min(85vw,18rem)] sm:w-[292px] flex-shrink-0 flex flex-col h-full select-none">
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
            <DraggableCard key={o.id} order={o} onOpen={() => onOpenOrder(o.id)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function DraggableCard({ order, onOpen }: { order: LocalOrder; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: order.id });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`cursor-grab active:cursor-grabbing transition-transform ${isDragging ? "opacity-35 scale-95" : ""}`}
    >
      <Card order={order} onOpen={onOpen} />
    </div>
  );
}

function Card({
  order,
  dragging = false,
  onOpen,
}: {
  order: LocalOrder;
  dragging?: boolean;
  onOpen?: () => void;
}) {
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
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (onOpen && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onOpen();
        }
      }}
      className={`rounded-2xl border border-border bg-card p-3.5 shadow-sm space-y-2.5 transition-all hover:shadow-md hover:border-border-strong ${prioAccent} ring-1 ${
        dragging ? "ring-2 ring-primary/40 shadow-lg scale-[1.02]" : ""
      } ${onOpen ? "cursor-pointer" : ""}`}
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