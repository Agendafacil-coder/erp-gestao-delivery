import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  DndContext, DragOverlay, PointerSensor, useDraggable, useDroppable,
  useSensor, useSensors, type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { OpsSidebar } from "@/components/ops/Sidebar";
import { OpsHeader } from "@/components/ops/Header";
import { Onboarding } from "@/components/ops/Onboarding";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle, Bike, Clock, Flame, Package, Phone } from "lucide-react";

export const Route = createFileRoute("/_authenticated/kanban")({
  component: KanbanPage,
});

type OrderStatus =
  | "novo" | "em_preparo" | "pronto" | "aguardando_entregador"
  | "em_rota_coleta" | "retirado" | "em_rota_entrega" | "entregue" | "cancelado";

type Order = {
  id: string; code: string; status: OrderStatus; priority: "baixa"|"normal"|"alta"|"critica";
  customer_name: string; customer_phone: string | null; address: string;
  items_count: number; total_amount: number; channel: string | null;
  sla_minutes: number; placed_at: string; driver_id: string | null;
};

const COLUMNS: { id: OrderStatus; title: string; tone: string }[] = [
  { id: "novo", title: "Novo", tone: "from-primary/30 to-primary/5" },
  { id: "em_preparo", title: "Em preparo", tone: "from-warning/30 to-warning/5" },
  { id: "pronto", title: "Pronto", tone: "from-info/30 to-info/5" },
  { id: "aguardando_entregador", title: "Aguardando entregador", tone: "from-accent/30 to-accent/5" },
  { id: "em_rota_coleta", title: "Rota coleta", tone: "from-accent/40 to-accent/5" },
  { id: "retirado", title: "Retirado", tone: "from-primary/30 to-primary/5" },
  { id: "em_rota_entrega", title: "Rota entrega", tone: "from-primary-glow/30 to-primary/5" },
  { id: "entregue", title: "Entregue", tone: "from-success/30 to-success/5" },
  { id: "cancelado", title: "Cancelado", tone: "from-danger/30 to-danger/5" },
];

function KanbanPage() {
  const { current, loading } = useTenant();
  const [orders, setOrders] = useState<Order[]>([]);
  const [tick, setTick] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => { const id = setInterval(() => setTick(t => t + 1), 30_000); return () => clearInterval(id); }, []);

  // Initial load + realtime subscription
  useEffect(() => {
    if (!current) return;
    let mounted = true;
    const load = async () => {
      const { data, error } = await supabase
        .from("orders").select("*")
        .eq("tenant_id", current.id)
        .order("placed_at", { ascending: false }).limit(500);
      if (error) return toast.error(error.message);
      if (mounted) setOrders(data as Order[]);
    };
    load();
    const ch = supabase
      .channel(`orders:${current.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `tenant_id=eq.${current.id}` }, (p) => {
        setOrders((prev) => {
          if (p.eventType === "INSERT") return [p.new as Order, ...prev];
          if (p.eventType === "DELETE") return prev.filter(o => o.id !== (p.old as Order).id);
          return prev.map(o => o.id === (p.new as Order).id ? (p.new as Order) : o);
        });
      })
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(ch); };
  }, [current?.id]);

  const grouped = useMemo(() => {
    const map: Record<OrderStatus, Order[]> = {
      novo: [], em_preparo: [], pronto: [], aguardando_entregador: [],
      em_rota_coleta: [], retirado: [], em_rota_entrega: [], entregue: [], cancelado: [],
    };
    for (const o of orders) map[o.status]?.push(o);
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
    const prev = order.status;
    setOrders(curr => curr.map(o => o.id === id ? { ...o, status: to } : o));
    const { error } = await supabase.from("orders").update({ status: to }).eq("id", id);
    if (error) {
      setOrders(curr => curr.map(o => o.id === id ? { ...o, status: prev } : o));
      toast.error(error.message);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">Carregando…</div>;

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
                <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Pipeline operacional</div>
                <h1 className="text-2xl lg:text-3xl font-display font-semibold mt-1">
                  Kanban <span className="text-gradient">de pedidos</span>
                </h1>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Badge>{orders.length} pedidos</Badge>
                <Badge tone="warning">{grouped.em_preparo.length} em preparo</Badge>
                <Badge tone="primary">{grouped.em_rota_entrega.length} em rota</Badge>
                <Badge tone="success">{grouped.entregue.length} entregues</Badge>
              </div>
            </div>

            <DndContext sensors={sensors} onDragStart={(e: DragStartEvent) => setActiveId(e.active.id as string)} onDragEnd={onDragEnd}>
              <div className="flex-1 overflow-x-auto -mx-4 lg:-mx-6 px-4 lg:px-6">
                <div className="flex gap-3 min-w-max pb-4">
                  {COLUMNS.map((col) => (
                    <Column key={col.id} col={col} orders={grouped[col.id]} />
                  ))}
                </div>
              </div>
              <DragOverlay>
                {activeId ? <Card order={orders.find(o => o.id === activeId)!} dragging /> : null}
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

function Column({ col, orders }: { col: { id: OrderStatus; title: string; tone: string }; orders: Order[] }) {
  const { isOver, setNodeRef } = useDroppable({ id: col.id });
  return (
    <div className="w-[280px] flex-shrink-0 flex flex-col">
      <div className={`rounded-t-xl px-3 py-2.5 bg-gradient-to-b ${col.tone} border border-border border-b-0`}>
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-semibold uppercase tracking-wider">{col.title}</div>
          <span className="text-[10px] text-muted-foreground font-mono">{orders.length}</span>
        </div>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 min-h-[200px] p-2 rounded-b-xl border border-border bg-surface/30 space-y-2 transition ${isOver ? "ring-2 ring-primary/50 bg-primary/5" : ""}`}
      >
        {orders.length === 0 && (
          <div className="text-[10px] text-muted-foreground/60 text-center py-6 uppercase tracking-widest">vazio</div>
        )}
        {orders.map((o) => <DraggableCard key={o.id} order={o} />)}
      </div>
    </div>
  );
}

function DraggableCard({ order }: { order: Order }) {
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

function Card({ order, dragging = false }: { order: Order; dragging?: boolean }) {
  const placed = new Date(order.placed_at).getTime();
  const elapsed = Math.max(0, Math.floor((Date.now() - placed) / 60000));
  const slaPct = Math.min(100, (elapsed / order.sla_minutes) * 100);
  const slaTone =
    slaPct < 60 ? "bg-success" : slaPct < 90 ? "bg-warning" : "bg-danger";
  const prio = order.priority;
  const prioIcon =
    prio === "critica" ? <Flame className="size-3 text-danger" /> :
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
          <span className="flex items-center gap-1 text-muted-foreground"><Clock className="size-2.5" /> {elapsed}min / {order.sla_minutes}min</span>
          <span className={`font-mono ${slaPct >= 90 ? "text-danger" : slaPct >= 60 ? "text-warning" : "text-success"}`}>{Math.round(slaPct)}%</span>
        </div>
        <div className="h-1 rounded-full bg-muted overflow-hidden">
          <div className={`h-full ${slaTone} transition-all`} style={{ width: `${slaPct}%` }} />
        </div>
      </div>
    </div>
  );
}