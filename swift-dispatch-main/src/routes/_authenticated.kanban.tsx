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
import { ACTIVE_KANBAN_COLUMNS, canTransition, normalizeOrderStatus, type OrderStatus } from "@/lib/ops/orderWorkflow";
import { OrderDetailPanel } from "@/components/ops/OrderDetailPanel";
import { formatPhoneShort, whatsAppChatUrl } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/menu/format";

export const Route = createFileRoute("/_authenticated/kanban")({
  component: KanbanPage,
});

type LocalOrder = {
  id: string; code: string; status: OrderStatus; priority: "baixa"|"normal"|"alta"|"critica";
  customer_name: string; customer_phone: string | null; address: string;
  items_count: number; total_amount: number; channel: string | null;
  sla_minutes: number; placed_at: string; driver_id: string | null;
};

type LocalDriver = { id: string; name: string };

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

const COLUMN_BORDER: Record<OrderStatus, string> = {
  novo: "border-t-primary",
  confirmado: "border-t-primary/80",
  em_preparo: "border-t-warning",
  pronto: "border-t-muted-foreground/50",
  aguardando_entregador: "border-t-primary/70",
  em_rota_entrega: "border-t-primary",
  entregue: "border-t-success",
  cancelado: "border-t-danger",
};

const COLUMNS: { id: OrderStatus }[] = ACTIVE_KANBAN_COLUMNS.map((id) => ({ id }));

function KanbanPage() {
  const { current } = useTenant();
  const { t } = useI18n();
  const { orders, drivers, updateOrderStatus } = useOps();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragFromStatus, setDragFromStatus] = useState<OrderStatus | null>(null);
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);

  const columnLabels = t("kanban", "columns") as Record<OrderStatus, string>;
  const columnLabelsShort = t("kanban", "columnsShort") as Record<OrderStatus, string>;

  const grouped = useMemo(() => {
    const map = Object.fromEntries(ACTIVE_KANBAN_COLUMNS.map((s) => [s, [] as LocalOrder[]])) as Record<
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
    setDragFromStatus(null);
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
      toast.success(`Pedido ${order.code} → ${columnLabels[to]}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <OpsPage
      flush
      className="flex flex-col flex-1 min-h-0 overflow-hidden !p-2 sm:!p-3 md:!p-4 !space-y-2 sm:!space-y-3"
    >
      <OpsPageHeader
        className="shrink-0 !gap-2 sm:!gap-3 pb-0"
        subtitle={t("kanban", "subtitle")}
        title={t("kanban", "title")}
        highlight={t("kanban", "highlight")}
        actions={
          <div className="flex flex-wrap items-center gap-1.5">
            <KanbanPill>{orders.length} {t("kanban", "itemsCount")}</KanbanPill>
            <KanbanPill tone="warning">{grouped.em_preparo.length} em preparo</KanbanPill>
            <KanbanPill tone="primary">{grouped.em_rota_entrega.length} em rota</KanbanPill>
            <KanbanPill tone="success">
              {grouped.entregue.length} finalizados
            </KanbanPill>
          </div>
        }
      />

      <DndContext
        sensors={sensors}
        onDragStart={(e: DragStartEvent) => {
          const id = e.active.id as string;
          setActiveId(id);
          const order = orders.find((o) => o.id === id);
          setDragFromStatus(order ? normalizeOrderStatus(order.status) : null);
        }}
        onDragEnd={onDragEnd}
        onDragCancel={() => {
          setActiveId(null);
          setDragFromStatus(null);
        }}
      >
        <div className="flex-1 min-h-0 overflow-x-auto overscroll-x-contain">
          <div
            className={cn(
              "grid h-full min-h-0 gap-1.5 sm:gap-2 pb-1",
              "w-full min-w-0",
              "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
              "md:min-w-full",
              "max-lg:min-w-[68rem]",
            )}
          >
            {COLUMNS.map((col) => (
              <Column
                key={col.id}
                col={{
                  id: col.id,
                  title: columnLabels[col.id],
                  titleShort: columnLabelsShort[col.id],
                  accent: COLUMN_ACCENT[col.id],
                  borderTop: COLUMN_BORDER[col.id],
                }}
                acceptsDrop={dragFromStatus ? canTransition(dragFromStatus, col.id) : true}
                orders={grouped[col.id]}
                drivers={drivers}
                onOpenOrder={setDetailOrderId}
              />
            ))}
          </div>
        </div>
        <DragOverlay>
          {activeId ? (
            <Card
              order={orders.find((o) => o.id === activeId) as LocalOrder}
              drivers={drivers}
              dragging
            />
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
    <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-medium", tones[tone])}>
      {children}
    </span>
  );
}

function Column({
  col,
  orders,
  drivers,
  onOpenOrder,
  acceptsDrop = true,
}: {
  col: { id: OrderStatus; title: string; titleShort: string; accent: string; borderTop: string };
  orders: LocalOrder[];
  drivers: LocalDriver[];
  onOpenOrder: (id: string) => void;
  acceptsDrop?: boolean;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: col.id,
    disabled: !acceptsDrop,
  });
  const { t } = useI18n();

  return (
    <div className="min-w-0 flex flex-col h-full min-h-[12rem] select-none">
      <div className="kanban-column rounded-xl border border-border bg-muted/30 flex flex-col h-full overflow-hidden shadow-sm">
        <div
          className={cn(
            "flex items-start gap-1.5 px-2 py-2 border-b border-border shrink-0",
            "bg-card border-t-2",
            col.borderTop,
          )}
          title={col.title}
        >
          <span className={cn("size-2 rounded-full shrink-0 mt-0.5", col.accent)} aria-hidden />
          <span className="text-[11px] font-semibold text-foreground flex-1 leading-tight line-clamp-2">
            {col.titleShort}
          </span>
          <span className="text-[10px] font-semibold tabular-nums text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md min-w-[1.25rem] text-center shrink-0">
            {orders.length}
          </span>
        </div>
        <div
          ref={setNodeRef}
          className={cn(
            "flex-1 min-h-0 overflow-y-auto overscroll-y-contain p-1.5 space-y-1.5 transition-colors",
            isOver && acceptsDrop
              ? "bg-primary/5 ring-2 ring-inset ring-primary/25"
              : isOver && !acceptsDrop
                ? "bg-danger/5 ring-2 ring-inset ring-danger/30"
                : !acceptsDrop
                  ? "bg-muted/10 opacity-60"
                  : "bg-muted/20",
          )}
        >
          {orders.length === 0 && (
            <p className="text-[10px] text-muted-foreground text-center py-4">{t("kanban", "empty")}</p>
          )}
          {orders.map((o) => (
            <DraggableCard key={o.id} order={o} drivers={drivers} onOpen={() => onOpenOrder(o.id)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function DraggableCard({
  order,
  drivers,
  onOpen,
}: {
  order: LocalOrder;
  drivers: LocalDriver[];
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: order.id });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "cursor-grab active:cursor-grabbing transition-transform",
        isDragging && "opacity-35 scale-95",
      )}
    >
      <Card order={order} drivers={drivers} onOpen={onOpen} />
    </div>
  );
}

function Card({
  order,
  drivers,
  dragging = false,
  onOpen,
}: {
  order: LocalOrder;
  drivers: LocalDriver[];
  dragging?: boolean;
  onOpen?: () => void;
}) {
  const { t } = useI18n();
  const placed = new Date(order.placed_at).getTime();
  const elapsedSec = Math.max(0, Math.floor((Date.now() - placed) / 1000));
  const elapsed = Math.floor(elapsedSec / 60);
  const timerMm = String(Math.floor(elapsedSec / 60)).padStart(2, "0");
  const timerSs = String(elapsedSec % 60).padStart(2, "0");
  const remaining = order.sla_minutes - elapsed;
  const isDelayed = remaining < 0;
  const borderAccent = isDelayed
    ? "border-l-danger"
    : remaining < 15
      ? "border-l-warning"
      : "border-l-success/70";

  const slaPct = Math.min(100, (elapsed / order.sla_minutes) * 100);
  const slaBar =
    slaPct < 60 ? "bg-success" : slaPct < 90 ? "bg-warning" : "bg-danger";

  const prio = order.priority;
  const prioRing =
    prio === "critica"
      ? "ring-danger/35"
      : prio === "alta"
        ? "ring-warning/30"
        : "ring-border/50";

  const prioIcon =
    prio === "critica" ? (
      <Flame className="size-3 text-danger shrink-0" />
    ) : prio === "alta" ? (
      <AlertTriangle className="size-3 text-warning shrink-0" />
    ) : null;

  const driverName = order.driver_id
    ? drivers.find((d) => d.id === order.driver_id)?.name
    : null;

  const waUrl = whatsAppChatUrl(order.customer_phone);
  const phoneLabel = formatPhoneShort(order.customer_phone);

  const slaLabel = isDelayed
    ? `-${Math.abs(remaining)}m`
    : `${remaining}m`;

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
      title={[order.code, order.customer_name, order.address].filter(Boolean).join(" · ")}
      className={cn(
        "kanban-card rounded-lg border border-border border-l-[3px] bg-card p-2 shadow-sm space-y-1 transition-all",
        borderAccent,
        "hover:shadow-md hover:border-border-strong ring-1",
        prioRing,
        isDelayed && "kanban-card--late",
        dragging && "ring-2 ring-primary/40 shadow-lg scale-[1.02]",
        onOpen && "cursor-pointer",
      )}
    >
      <div className="flex items-start justify-between gap-1 min-w-0">
        <div className="min-w-0">
          <span className="text-xs font-bold text-foreground tabular-nums tracking-tight truncate block">
            {order.code}
          </span>
          <div className="flex items-center gap-0.5 mt-0.5">
            {prioIcon}
            {order.channel && (
              <span className="text-[9px] font-medium text-muted-foreground bg-muted px-1 py-px rounded max-w-[3.5rem] truncate">
                {order.channel}
              </span>
            )}
          </div>
        </div>
        <span
          className={cn(
            "font-mono text-sm font-bold tabular-nums leading-none shrink-0",
            isDelayed ? "text-danger" : "text-foreground",
          )}
        >
          {timerMm}:{timerSs}
        </span>
      </div>

      <p className="text-[11px] font-medium text-foreground leading-tight truncate">
        {order.customer_name}
      </p>
      <p className="text-[10px] text-muted-foreground leading-snug line-clamp-2" title={order.address}>
        {order.address}
      </p>

      {driverName && (
        <p className="text-[10px] text-primary flex items-center gap-0.5 min-w-0 truncate" title={driverName}>
          <Bike className="size-2.5 shrink-0" />
          <span className="truncate">{driverName}</span>
        </p>
      )}

      <div className="flex items-center justify-between gap-1 text-[10px] text-muted-foreground pt-0.5 border-t border-border/50">
        <span className="inline-flex items-center gap-0.5 shrink-0">
          <Package className="size-2.5 opacity-70" />
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
            className="inline-flex items-center gap-0.5 tabular-nums text-[#25d366] hover:underline truncate min-w-0"
          >
            <Phone className="size-2.5 shrink-0" />
            <span className="truncate">{phoneLabel}</span>
          </a>
        ) : (
          <span className="inline-flex items-center gap-0.5 tabular-nums truncate min-w-0">
            <Phone className="size-2.5 shrink-0 opacity-70" />
            <span className="truncate">{phoneLabel}</span>
          </span>
        )}
        <span className="text-[11px] font-semibold text-primary tabular-nums shrink-0">
          {formatBRL(order.total_amount)}
        </span>
      </div>

      <div className="flex items-center gap-1.5 pt-0.5">
        <span
          className={cn(
            "inline-flex items-center gap-0.5 text-[9px] font-semibold px-1 py-px rounded shrink-0",
            isDelayed
              ? "text-danger bg-danger/10"
              : remaining < 15
                ? "text-warning bg-warning/10"
                : "text-success bg-success/10",
          )}
        >
          <Clock className="size-2.5 shrink-0" />
          {slaLabel}
        </span>
        <span className="text-[9px] text-muted-foreground tabular-nums shrink-0">
          {elapsed}m {t("kanban", "elapsed")}
        </span>
        <div className="flex-1 h-1 rounded-full bg-border/80 overflow-hidden min-w-0">
          <div
            className={cn("h-full rounded-full transition-all duration-500", slaBar)}
            style={{ width: `${slaPct}%` }}
          />
        </div>
        <span
          className={cn(
            "text-[9px] font-medium tabular-nums shrink-0",
            slaPct >= 90 ? "text-danger" : slaPct >= 60 ? "text-warning" : "text-muted-foreground",
          )}
        >
          {Math.round(slaPct)}%
        </span>
      </div>
    </article>
  );
}
