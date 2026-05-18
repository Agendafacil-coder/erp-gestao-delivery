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

export const Route = createFileRoute("/_authenticated/kanban")({
  component: KanbanPage,
});

type LocalOrder = {
  id: string; code: string; status: OrderStatus; priority: "baixa"|"normal"|"alta"|"critica";
  customer_name: string; customer_phone: string | null; address: string;
  items_count: number; total_amount: number; channel: string | null;
  sla_minutes: number; placed_at: string; driver_id: string | null;
};

const COLUMNS: { id: OrderStatus; tone: string }[] = [
  { id: "novo", tone: "from-primary/30 to-primary/5" },
  { id: "em_preparo", tone: "from-warning/30 to-warning/5" },
  { id: "pronto", tone: "from-info/30 to-info/5" },
  { id: "aguardando_entregador", tone: "from-accent/30 to-accent/5" },
  { id: "em_rota_coleta", tone: "from-accent/40 to-accent/5" },
  { id: "retirado", tone: "from-primary/30 to-primary/5" },
  { id: "em_rota_entrega", tone: "from-primary-glow/30 to-primary/5" },
  { id: "entregue", tone: "from-success/30 to-success/5" },
  { id: "cancelado", tone: "from-danger/30 to-danger/5" },
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
          <main className="flex-1 p-4 lg:p-6 space-y-4 overflow-hidden flex flex-col">
            <div className="flex items-end justify-between flex-wrap gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{t("kanban", "subtitle")}</div>
                <h1 className="text-2xl lg:text-3xl font-display font-semibold mt-1">
                  {t("kanban", "title")} <span className="text-gradient">{t("kanban", "highlight")}</span>
                </h1>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Badge>{orders.length} {t("kanban", "itemsCount")}</Badge>
                <Badge tone="warning">{grouped.em_preparo.length} {t("kanban", "columns")["em_preparo"].toLowerCase()}</Badge>
                <Badge tone="primary">{grouped.em_rota_entrega.length} {t("kanban", "columns")["em_rota_entrega"].toLowerCase()}</Badge>
                <Badge tone="success">{grouped.entregue.length} {t("kanban", "columns")["entregue"].toLowerCase()}</Badge>
              </div>
            </div>

            <DndContext sensors={sensors} onDragStart={(e: DragStartEvent) => setActiveId(e.active.id as string)} onDragEnd={onDragEnd}>
              <div className="flex-1 overflow-x-auto -mx-4 lg:-mx-6 px-4 lg:px-6">
                <div className="flex gap-3 min-w-max pb-4 h-[calc(100vh-210px)]">
                  {COLUMNS.map((col) => (
                    <Column key={col.id} col={{ ...col, title: t("kanban", "columns")[col.id] }} orders={grouped[col.id]} />
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

function Badge({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted"|"warning"|"primary"|"success" }) {
  const tones: Record<string,string> = {
    muted: "border-border text-muted-foreground",
    warning: "border-warning/40 text-warning bg-warning/10",
    primary: "border-primary/40 text-primary-glow bg-primary/10",
    success: "border-success/40 text-success bg-success/10",
  };
  return <span className={`px-2.5 py-1 rounded-md border text-[11px] font-medium ${tones[tone]}`}>{children}</span>;
}

function Column({ col, orders }: { col: { id: OrderStatus; title: string; tone: string }; orders: LocalOrder[] }) {
  const { isOver, setNodeRef } = useDroppable({ id: col.id });
  const { t } = useI18n();

  return (
    <div className="w-[280px] flex-shrink-0 flex flex-col h-full">
      <div className={`rounded-t-xl px-3 py-2.5 bg-gradient-to-b ${col.tone} border border-border border-b-0 shrink-0`}>
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-semibold uppercase tracking-wider">{col.title}</div>
          <span className="text-[10px] text-muted-foreground font-mono">{orders.length}</span>
        </div>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 overflow-y-auto p-2 rounded-b-xl border border-border bg-surface/30 space-y-2 transition ${isOver ? "ring-2 ring-primary/50 bg-primary/5" : ""}`}
      >
        {orders.length === 0 && (
          <div className="text-[10px] text-muted-foreground/60 text-center py-6 uppercase tracking-widest">{t("kanban", "empty")}</div>
        )}
        {orders.map((o) => <DraggableCard key={o.id} order={o} />)}
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
      className={`cursor-grab active:cursor-grabbing ${isDragging ? "opacity-30" : ""}`}
    >
      <Card order={order} />
    </div>
  );
}

function Card({ order, dragging = false }: { order: LocalOrder; dragging?: boolean }) {
  const { t } = useI18n();
  const placed = new Date(order.placed_at).getTime();
  const elapsed = Math.max(0, Math.floor((Date.now() - placed) / 60000));
  const slaPct = Math.min(100, (elapsed / order.sla_minutes) * 100);
  const slaTone =
    slaPct < 60 ? "bg-success" : slaPct < 90 ? "bg-warning" : "bg-danger";
  const prio = order.priority;
  const prioIcon =
    prio === "critica" ? <Flame className="size-3 text-danger pulse-dot" /> :
    prio === "alta" ? <AlertTriangle className="size-3 text-warning" /> :
    null;

  return (
    <div className={`group rounded-lg border border-border bg-surface/80 backdrop-blur p-3 space-y-2 hover:border-border-strong transition ${dragging ? "ring-2 ring-primary shadow-2xl" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs font-semibold">{order.code}</span>
        <div className="flex items-center gap-1.5">
          {prioIcon}
          {order.driver_id && <Bike className="size-3 text-primary-glow" />}
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{order.channel}</span>
        </div>
      </div>
      <div className="text-sm font-medium truncate">{order.customer_name}</div>
      <div className="text-[11px] text-muted-foreground line-clamp-1">{order.address}</div>
      <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1"><Package className="size-3" /> {order.items_count}</span>
        <span className="flex items-center gap-1"><Phone className="size-3" /> {order.customer_phone?.slice(-9) ?? "—"}</span>
        <span className="font-mono text-foreground/80">R$ {Number(order.total_amount).toFixed(2)}</span>
      </div>
      <div>
        <div className="flex items-center justify-between text-[10px] mb-1">
          <span className="flex items-center gap-1 text-muted-foreground"><Clock className="size-2.5" /> {elapsed}m / {order.sla_minutes}m</span>
          <span className={`font-mono ${slaPct >= 90 ? "text-danger" : slaPct >= 60 ? "text-warning" : "text-success"}`}>{Math.round(slaPct)}%</span>
        </div>
        <div className="h-1 rounded-full bg-muted overflow-hidden">
          <div className={`h-full ${slaTone} transition-all`} style={{ width: `${slaPct}%` }} />
        </div>
      </div>
    </div>
  );
}