import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { OpsSidebar } from "@/components/ops/Sidebar";
import { OpsHeader } from "@/components/ops/Header";
import { Onboarding } from "@/components/ops/Onboarding";
import { useTenant } from "@/hooks/useTenant";
import { useOps } from "@/hooks/useOps";
import { useI18n } from "@/hooks/useI18n";
import { 
  History, 
  Terminal, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  MessageSquare, 
  Route as RouteIcon, 
  ShieldAlert, 
  CloudLightning,
  ChevronRight,
  Database,
  RefreshCw,
  Server,
  Key
} from "lucide-react";
import { toast } from "sonner";

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

function AuditPage() {
  const { current, loading } = useTenant();
  const { t } = useI18n();
  const { tick } = useOps();

  // Selected Log event for inspector panel
  const [selectedEventId, setSelectedEventId] = useState<string>("e-1");
  const [isMigrationActive, setIsMigrationActive] = useState<boolean>(false);
  const [migrationLogs, setMigrationLogs] = useState<string[]>([]);
  const [migrationStep, setMigrationStep] = useState<number>(0);

  const [events, setEvents] = useState<AuditEvent[]>([
    {
      id: "e-1",
      timestamp: "16:25:01",
      type: "success",
      category: "pedido",
      title: "Pedido Recebido via WhatsApp Hub",
      detail: "Código: #4820 · Cliente: Ana Silva · Bairro: Pinheiros · R$ 74,50",
      payload: JSON.stringify({
        orderId: "o-0",
        channel: "WhatsApp Hub",
        customer: { name: "Ana Silva", phone: "+5511987654321" },
        address: "Pinheiros, R. das Palmeiras, 120",
        itemsCount: 2,
        total: 74.50,
        gateway: "WhatsApp API Gateway v2.4",
        ip: "187.42.12.8"
      }, null, 2)
    },
    {
      id: "e-2",
      timestamp: "16:25:12",
      type: "info",
      category: "cozinha",
      title: "Produção Iniciada KDS",
      detail: "Pedido #4820 enviado para chapa principal · Fila Cozinha: 4 un",
      payload: JSON.stringify({
        kdsId: "kds-pinheiros-01",
        cookStation: "Grill Station A",
        chefName: "Roberto Carlos",
        queueCount: 4,
        slaAllottedMinutes: 15,
        startedAt: new Date().toISOString()
      }, null, 2)
    },
    {
      id: "e-3",
      timestamp: "16:25:40",
      type: "warning",
      category: "sla",
      title: "IA Alerta: Gargalo Previsto na Cozinha",
      detail: "Tempo médio de preparação subiu +25% · Zona Sul com pico de demanda",
      payload: JSON.stringify({
        alertType: "KITCHEN_BOTTLENECK_PREDICTION",
        riskScore: "82%",
        delayFactor: "1.25x",
        activeOrdersInPrep: 5,
        estimatedOverloadTimeMinutes: 18,
        affectedRegions: ["Moema", "Brooklin"]
      }, null, 2)
    },
    {
      id: "e-4",
      timestamp: "16:26:02",
      type: "ai",
      category: "supabase",
      title: "IA Interveio: Otimização de Rota & Agrupamento",
      detail: "Rotas recalculadas pelo dispatch inteligente · Economia de R$ 11,00",
      payload: JSON.stringify({
        algorithm: "Swift Smart Cluster v4.2",
        allocatedDriver: "d-2 (Caio)",
        clusteredOrders: ["#4820", "#4821"],
        routeDistanceKm: 4.8,
        allocatedRegion: "Pinheiros",
        savingsBrl: 11.00,
        timeOptimizedMinutes: 24
      }, null, 2)
    },
    {
      id: "e-5",
      timestamp: "16:26:08",
      type: "success",
      category: "driver",
      title: "Entregador Aceitou Rota Batelada",
      detail: "#E-02 Caio aceitou entrega agrupada de 2 pedidos no painel mobile",
      payload: JSON.stringify({
        driverId: "d-2",
        driverName: "Caio Silva",
        vehicle: "moto",
        lat: -23.5489,
        lng: -46.6388,
        acceptedVia: "PWA Driver App v3.0",
        batteryPercentage: 92,
        networkSignal: "5G Excellent"
      }, null, 2)
    },
    {
      id: "e-6",
      timestamp: "16:26:15",
      type: "success",
      category: "whatsapp",
      title: "Notificação Enviada ao Cliente",
      detail: "Cliente alertado pelo WhatsApp Hub: 'Entregador em rota de coleta'",
      payload: JSON.stringify({
        phone: "+5511987654321",
        templateName: "order_transit_notification",
        status: "DELIVERED_SUCCESSFULLY",
        gatewayId: "msg-gw-48192-whatsapp",
        attemptsCount: 1,
        messageBody: "Olá Ana, seu pedido #4820 já está a caminho! Entregador Caio está retirando no restaurante."
      }, null, 2)
    }
  ]);

  // Handle active simulation ticks adding real-time audit logs!
  useEffect(() => {
    if (tick === 0) return;

    const categories: Array<AuditEvent["category"]> = ["pedido", "cozinha", "driver", "sla", "whatsapp"];
    const randCat = categories[Math.floor(Math.random() * categories.length)];

    let newEvent: AuditEvent;
    const timeStr = new Date().toLocaleTimeString();

    if (randCat === "pedido") {
      const code = 4920 + Math.floor(Math.random() * 200);
      newEvent = {
        id: `e-spawn-${tick}`,
        timestamp: timeStr,
        type: "success",
        category: "pedido",
        title: "Novo Pedido Integrado",
        detail: `Pedido #${code} recebido com sucesso via iFood API gateway`,
        payload: JSON.stringify({
          orderId: `o-spawn-${tick}`,
          code: `#${code}`,
          channel: "iFood",
          customerName: "Juliana Santos",
          total: 58.90,
          region: "Moema",
          items: 3,
          integratedAt: new Date().toISOString()
        }, null, 2)
      };
    } else if (randCat === "cozinha") {
      newEvent = {
        id: `e-spawn-${tick}`,
        timestamp: timeStr,
        type: "info",
        category: "cozinha",
        title: "KDS: Prato Finalizado",
        detail: "Pedido #4820 foi sinalizado como PRONTO e aguarda escoamento",
        payload: JSON.stringify({
          kdsStation: "CookStation B",
          orderCode: "#4820",
          chefName: "Marisa Lins",
          prepTimeMinutes: 12.4,
          kitchenLoadFactor: "72%"
        }, null, 2)
      };
    } else if (randCat === "driver") {
      newEvent = {
        id: `e-spawn-${tick}`,
        timestamp: timeStr,
        type: "success",
        category: "driver",
        title: "Coleta Efetuada por Entregador",
        detail: "Entregador #E-08 Tito retirou o pedido #4822 na sede Pinheiros",
        payload: JSON.stringify({
          driverId: "d-8",
          driverName: "Tito",
          orderId: "o-spawn-42",
          coords: { lat: -23.5492, lng: -46.6381 },
          collectedAt: new Date().toISOString(),
          pwaVersion: "PWA Driver v3.0"
        }, null, 2)
      };
    } else if (randCat === "sla") {
      newEvent = {
        id: `e-spawn-${tick}`,
        timestamp: timeStr,
        type: "warning",
        category: "sla",
        title: "Alerta SLA: Estouro de Tolerância",
        detail: "Moema · Pedido #4826 excedeu 85% do tempo contratual",
        payload: JSON.stringify({
          orderCode: "#4826",
          placedAt: new Date(Date.now() - 34 * 60000).toISOString(),
          elapsedMinutes: 34,
          slaAllottedMinutes: 40,
          escalationStatus: "ESCALATED_TO_CRITICAL"
        }, null, 2)
      };
    } else {
      newEvent = {
        id: `e-spawn-${tick}`,
        timestamp: timeStr,
        type: "info",
        category: "whatsapp",
        title: "WhatsApp: Confirmação de Entrega",
        detail: "Mensagem enviada com comprovante fotográfico integrado",
        payload: JSON.stringify({
          clientPhone: "+5511993821034",
          templateName: "order_delivered_confirmation",
          payloadBytes: 10420,
          deliveredStatus: "SENT_OK"
        }, null, 2)
      };
    }

    setEvents(prev => [newEvent, ...prev].slice(0, 20));
  }, [tick]);

  const selectedEvent = useMemo(() => {
    return events.find(e => e.id === selectedEventId) || events[0];
  }, [events, selectedEventId]);

  // Run simulated Supabase Production Migration Sync!
  const runMigrationSimulation = () => {
    if (isMigrationActive) return;

    setIsMigrationActive(true);
    setMigrationStep(0);
    setMigrationLogs(["[16:26:00] 🟢 MIGRATION GATEWAY INITIALIZED..."]);

    const steps = [
      { text: "[16:26:01] 🔐 Executando Supabase Auth handshake... JWT Token obtido.", next: 1 },
      { text: "[16:26:03] 🌐 Conectando aos WebSockets Supabase Realtime Channels...", next: 2 },
      { text: "[16:26:05] 📡 Canal operacional 'realtime:drivers_location' ativado com sucesso.", next: 3 },
      { text: "[16:26:07] ⚡ Executando Edge Function 'dispatch-auto-optimize' (warmup)...", next: 4 },
      { text: "[16:26:08] 🗄️ Mapeando Tabelas PostgreSQL: tenants, profiles, orders, drivers, alerts.", next: 5 },
      { text: "[16:26:10] 🔄 Sincronizando registros offline (Local Storage -> Supabase DB Sync)...", next: 6 },
      { text: "[16:26:12] 🧬 Sincronização completa! Optimistic updates ativos (Latência residual: 4ms).", next: 7 }
    ];

    steps.forEach((step, idx) => {
      setTimeout(() => {
        setMigrationLogs(prev => [...prev, step.text]);
        setMigrationStep(step.next);
        if (step.next === 7) {
          setIsMigrationActive(false);
          toast.success("Migração de produção Supabase configurada com sucesso!");
        }
      }, (idx + 1) * 1500);
    });
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">{t("common", "loading")}</div>;
  }

  return (
    <div className="min-h-screen flex bg-background">
      <OpsSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <OpsHeader tick={tick} />
        {!current ? (
          <Onboarding />
        ) : (
          <main className="flex-1 p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden max-h-[calc(100vh-64px)]">
            
            {/* Left Timeline Panel: Military log layout */}
            <div className="lg:col-span-4 flex flex-col space-y-4 h-full overflow-hidden">
              <div>
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-primary-glow animate-pulse" />
                  <span className="text-[10px] uppercase font-mono tracking-widest text-muted-foreground font-bold">MILITARY LOGGING HUB</span>
                </div>
                <h1 className="erp-page-title mt-1">
                  Auditoria <span className="text-gradient">Operacional</span>
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Timeline viva de toda atividade, alertas IA e rastreio de micro-operações.
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
                  {/* Vertical timeline line */}
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

            {/* Right: Inspector and Supabase Migration Layer Panel */}
            <div className="lg:col-span-8 flex flex-col space-y-4 h-full overflow-hidden">
              
              {/* Event Inspector Panel */}
              <div className="bg-card border border-border rounded-2xl p-5 flex-1 flex flex-col overflow-hidden">
                <div className="border-b border-border/40 pb-3 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <Terminal className="size-4 text-primary-glow" />
                    <div>
                      <h3 className="text-xs font-semibold text-foreground uppercase font-mono">Inspecionar Metadados Operacionais</h3>
                      <p className="text-[9px] text-muted-foreground leading-none">ANALISADOR DE PAYLOAD REALTIME</p>
                    </div>
                  </div>
                  
                  <span className="text-[9px] font-mono text-muted-foreground uppercase font-bold border border-border/80 px-2 py-0.5 rounded">
                    EVENT_ID: {selectedEvent.id}
                  </span>
                </div>

                {/* Selected Event Payload details */}
                <div className="flex-1 overflow-auto mt-4 pr-1 font-mono text-[10px] text-slate-300 leading-relaxed bg-black/60 p-4 rounded-xl border border-border/60">
                  <span className="text-[10px] text-primary-glow font-bold uppercase tracking-wider font-mono block border-b border-white/[0.05] pb-1.5 mb-2">
                    HEADER & CONTEXT PROTOCOL
                  </span>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[9px] text-muted-foreground mb-4">
                    <div>TIMESTAMP: <b className="text-foreground">{selectedEvent.timestamp}</b></div>
                    <div>CATEGORIA: <b className="text-foreground uppercase">{selectedEvent.category}</b></div>
                    <div>SEVERIDADE: <b className="text-foreground uppercase">{selectedEvent.type}</b></div>
                    <div>PROTOCOLO: <b className="text-foreground">AMQP operational v1.0</b></div>
                  </div>

                  <span className="text-[10px] text-[#22d3ee] font-bold uppercase tracking-wider font-mono block border-b border-white/[0.05] pb-1.5 mb-2 mt-4">
                    METADATA PAYLOAD BODY
                  </span>
                  <pre className="whitespace-pre">{selectedEvent.payload}</pre>
                </div>
              </div>

              {/* Supabase Sync Database Migration Layer Panel */}
              <div className="bg-card border border-border rounded-2xl p-5 shrink-0 space-y-4">
                <div className="border-b border-border/40 pb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CloudLightning className="size-4 text-accent" />
                    <div>
                      <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Supabase Production Migration Gate</h3>
                      <p className="text-[9px] text-muted-foreground leading-none">AUTH · REALTIME WEBSOCKETS · EDGE FUNCTIONS · PERSISTENCE LAYER</p>
                    </div>
                  </div>

                  <button 
                    onClick={runMigrationSimulation}
                    disabled={isMigrationActive || migrationStep === 7}
                    className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-accent to-indigo-500 hover:opacity-95 text-black font-extrabold text-xs transition disabled:opacity-60 cursor-pointer flex items-center gap-1 shadow-glow"
                  >
                    <RefreshCw className={`size-3.5 ${isMigrationActive ? "animate-spin" : ""}`} />
                    {migrationStep === 7 ? "MIGRAÇÃO PRONTA ✓" : isMigrationActive ? "Sincronizando..." : "Executar Migração"}
                  </button>
                </div>

                {/* Progress Indicators */}
                <div className="grid grid-cols-4 gap-2 text-center text-[9px] font-mono">
                  <div className={`p-2 rounded border ${migrationStep >= 1 ? "bg-success/5 border-success/35 text-success" : "bg-surface/20 border-border text-muted-foreground"}`}>
                    <Key className="size-3 mx-auto mb-1" /> Auth real
                  </div>
                  <div className={`p-2 rounded border ${migrationStep >= 3 ? "bg-success/5 border-success/35 text-success" : "bg-surface/20 border-border text-muted-foreground"}`}>
                    <Database className="size-3 mx-auto mb-1" /> WebSockets Live
                  </div>
                  <div className={`p-2 rounded border ${migrationStep >= 4 ? "bg-success/5 border-success/35 text-success" : "bg-surface/20 border-border text-muted-foreground"}`}>
                    <Server className="size-3 mx-auto mb-1" /> Edge Functions
                  </div>
                  <div className={`p-2 rounded border ${migrationStep >= 6 ? "bg-success/5 border-success/35 text-success" : "bg-surface/20 border-border text-muted-foreground"}`}>
                    <CloudLightning className="size-3 mx-auto mb-1" /> Sync Layer
                  </div>
                </div>

                {/* Console logs */}
                <div className="bg-black/85 p-3 rounded-lg border border-border/50 font-mono text-[8px] text-[#22d3ee] max-h-[85px] overflow-y-auto space-y-1">
                  {migrationLogs.length === 0 ? (
                    <div className="text-muted-foreground text-center py-2 uppercase">
                      Clique em "Executar Migração" para preparar o banco de produção Supabase.
                    </div>
                  ) : (
                    migrationLogs.map((l, i) => <div key={i}>{l}</div>)
                  )}
                </div>
              </div>

            </div>

          </main>
        )}
      </div>
    </div>
  );
}
