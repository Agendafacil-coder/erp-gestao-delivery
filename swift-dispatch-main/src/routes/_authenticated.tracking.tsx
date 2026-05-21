import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef, useMemo } from "react";
import { OpsSidebar } from "@/components/ops/Sidebar";
import { OpsHeader } from "@/components/ops/Header";
import { Onboarding } from "@/components/ops/Onboarding";
import { useTenant } from "@/hooks/useTenant";
import { useOps } from "@/hooks/useOps";
import { useI18n } from "@/hooks/useI18n";
import { 
  Package, 
  MapPin, 
  Bike, 
  CheckCircle2, 
  Compass, 
  Clock, 
  Phone, 
  Search, 
  Sparkles,
  ArrowRight,
  MessageSquare,
  Star
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tracking")({
  component: CustomerTrackingPage,
});

function CustomerTrackingPage() {
  const { current, loading } = useTenant();
  const { t } = useI18n();
  const { orders, drivers, tick } = useOps();
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Animation coordinates
  const animationRef = useRef<number | null>(null);
  const [progress, setProgress] = useState(0);

  // Filter orders that are active or recently delivered
  const activeOrders = useMemo(() => {
    return orders.filter(o => o.status !== "cancelado");
  }, [orders]);

  // Set initial selected order if none selected
  useEffect(() => {
    if (activeOrders.length > 0 && !selectedOrderId) {
      setSelectedOrderId(activeOrders[0].id);
    }
  }, [activeOrders, selectedOrderId]);

  // Find currently selected order and its assigned driver
  const currentOrder = useMemo(() => {
    return activeOrders.find(o => o.id === selectedOrderId);
  }, [activeOrders, selectedOrderId]);

  const assignedDriver = useMemo(() => {
    if (!currentOrder || !currentOrder.driver_id) return null;
    return drivers.find(d => d.id === currentOrder.driver_id);
  }, [currentOrder, drivers]);

  // Determine stage (0 to 4) for timeline
  const stage = useMemo(() => {
    if (!currentOrder) return 0;
    const status = currentOrder.status;
    if (status === "novo") return 0;
    if (status === "em_preparo") return 1;
    if (["pronto", "aguardando_entregador", "em_rota_coleta"].includes(status)) return 2;
    if (["retirado", "em_rota_entrega"].includes(status)) return 3;
    if (status === "entregue") return 4;
    return 0;
  }, [currentOrder]);

  // Calculate elapsed time in minutes
  const elapsed = useMemo(() => {
    if (!currentOrder) return 0;
    const placedTime = new Date(currentOrder.placed_at).getTime();
    return Math.max(0, Math.floor((Date.now() - placedTime) / 60000));
  }, [currentOrder]);

  // Simulate ETA based on status
  const currentETA = useMemo(() => {
    if (!currentOrder) return 0;
    const rawETA = Math.max(2, currentOrder.sla_minutes - elapsed);
    
    if (currentOrder.status === "entregue") return 0;
    if (currentOrder.status === "em_rota_entrega") return Math.min(8, rawETA);
    if (currentOrder.status === "retirado") return Math.min(12, rawETA);
    if (currentOrder.status === "em_preparo") return Math.min(22, rawETA);
    return rawETA;
  }, [currentOrder, elapsed]);

  // Premium Canvas real-time route rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let localProgress = progress;
    let dir = 1;

    // Reset animation progress if status changes
    if (currentOrder?.status === "entregue") {
      localProgress = 1.0;
    } else if (stage === 3) {
      // Driver is moving! Let progress advance slowly
      localProgress = (Date.now() % 16000) / 16000;
    } else {
      localProgress = 0.35;
    }

    const render = () => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const w = canvas.width;
      const h = canvas.height;

      // 1. Draw Grid Background (Cyberpunk premium style)
      ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
      ctx.lineWidth = 1.5;
      const gridSpacing = 30;
      for (let x = 0; x < w; x += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Coordinates for Restaurant, Driver and Customer
      const restX = w * 0.25;
      const restY = h * 0.65;
      
      const custX = w * 0.75;
      const custY = h * 0.3;

      // 2. Draw curved route route path (Neon Glowing line)
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = 4;
      ctx.setLineDash([4, 4]);
      
      // Draw path line
      ctx.beginPath();
      ctx.moveTo(restX, restY);
      ctx.quadraticCurveTo(w * 0.45, h * 0.25, custX, custY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw neon overlay route line depending on stage
      if (stage >= 2) {
        ctx.shadowBlur = 8;
        ctx.shadowColor = "rgba(99, 102, 241, 0.6)"; // Neon Indigo
        ctx.strokeStyle = "rgba(99, 102, 241, 0.85)";
        ctx.lineWidth = 4.5;
        
        ctx.beginPath();
        ctx.moveTo(restX, restY);
        
        // Quadratic bezier details
        const curveX = w * 0.45;
        const curveY = h * 0.25;
        
        // Calculate dynamic driver coordinates along bezier path
        // B = (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
        const t = currentOrder?.status === "entregue" ? 1.0 : stage === 3 ? localProgress : 0.0;
        const driverX = (1 - t) * (1 - t) * restX + 2 * (1 - t) * t * curveX + t * t * custX;
        const driverY = (1 - t) * (1 - t) * restY + 2 * (1 - t) * t * curveY + t * t * custY;

        ctx.quadraticCurveTo(curveX, curveY, custX, custY);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // 3. Draw active Driver pulsating node (Neon cyan/green)
        ctx.shadowBlur = 15;
        ctx.shadowColor = "rgba(34, 211, 238, 0.8)";
        ctx.fillStyle = "#22d3ee";
        
        const pulseRadius = 7.5 + Math.sin(Date.now() / 200) * 2;
        ctx.beginPath();
        ctx.arc(driverX, driverY, pulseRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Draw driver small halo
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(driverX, driverY, 6, 0, Math.PI * 2);
        ctx.stroke();

        // Small text badge above driver
        ctx.fillStyle = "rgba(10, 12, 18, 0.85)";
        ctx.strokeStyle = "rgba(34, 211, 238, 0.4)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(driverX - 42, driverY - 26, 84, 16, 4);
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = "#22d3ee";
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "center";
        ctx.fillText(currentOrder?.status === "entregue" ? "ENTREGUE" : "ENTREGADOR", driverX, driverY - 15);
      }

      // 4. Draw Restaurant Pin (Glowing Pink/Coral)
      ctx.shadowBlur = 10;
      ctx.shadowColor = "rgba(244, 63, 94, 0.5)";
      ctx.fillStyle = "#f43f5e";
      ctx.beginPath();
      ctx.arc(restX, restY, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 9px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("HQ", restX, restY + 3);

      // Label below Restaurant
      ctx.fillStyle = "#94a3b8";
      ctx.font = "10px system-ui";
      ctx.fillText("Delivery OS Pinheiros", restX, restY + 20);

      // 5. Draw Customer Destination Pin (Glowing Emerald)
      ctx.shadowBlur = stage === 4 ? 20 : 10;
      ctx.shadowColor = stage === 4 ? "rgba(16, 185, 129, 0.8)" : "rgba(16, 185, 129, 0.5)";
      ctx.fillStyle = stage === 4 ? "#10b981" : "#10b981";
      
      const destPulse = stage === 4 ? (11 + Math.sin(Date.now() / 150) * 1.5) : 8;
      ctx.beginPath();
      ctx.arc(custX, custY, destPulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(custX, custY, 4, 0, Math.PI * 2);
      ctx.stroke();

      // Label below Customer
      ctx.fillStyle = "#94a3b8";
      ctx.font = "10px system-ui";
      ctx.fillText("Seu Endereço", custX, custY + 20);
    };

    const animate = () => {
      if (stage === 3) {
        localProgress = (Date.now() % 12000) / 12000;
      }
      render();
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [stage, currentOrder, progress]);

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
          <main className="flex-1 p-4 lg:p-6 space-y-6 overflow-y-auto">
            {/* Header tracking page */}
            <div className="flex items-center justify-between flex-wrap gap-4 border-b border-border/40 pb-4">
              <div>
                <div className="text-[10px] uppercase font-mono tracking-widest text-primary-glow font-bold">CLIENT PORTAL Realtime</div>
                <h1 className="erp-page-title mt-1">
                  Acompanhar <span className="text-gradient">Pedido Live</span>
                </h1>
              </div>

              {/* Order selector HUD */}
              <div className="flex items-center gap-2 bg-muted border border-border p-1.5 rounded-lg">
                <Search className="size-4 text-muted-foreground ml-2" />
                <select
                  value={selectedOrderId}
                  onChange={(e) => setSelectedOrderId(e.target.value)}
                  className="bg-transparent border-0 text-xs text-foreground font-mono font-bold focus:ring-0 pr-8 cursor-pointer"
                >
                  {activeOrders.map(o => (
                    <option key={o.id} value={o.id} className="bg-muted text-foreground">
                      {o.code} · {o.customer_name}
                    </option>
                  ))}
                  {activeOrders.length === 0 && (
                    <option value="" className="bg-muted text-muted-foreground">Nenhum pedido ativo</option>
                  )}
                </select>
              </div>
            </div>

            {currentOrder ? (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                
                {/* Column 1 & 2: Tracking map and detailed timelines */}
                <div className="xl:col-span-2 space-y-6">
                  {/* Premium Canvas Map container */}
                  <div className="bg-card border border-border rounded-2xl overflow-hidden relative shadow-sm">
                    {/* Floating HUD info */}
                    <div className="absolute top-4 left-4 z-10 glass-strong border border-white/10 rounded-xl p-3 flex items-center gap-3">
                      <div className="size-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-primary-glow">
                        <Compass className="size-4 animate-spin-slow" />
                      </div>
                      <div>
                        <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">Status Conexão</div>
                        <div className="flex items-center gap-1">
                          <span className="size-1.5 rounded-full bg-success animate-ping" />
                          <span className="text-xs font-mono font-bold text-success">REALTIME FEED LINKED</span>
                        </div>
                      </div>
                    </div>

                    <div className="absolute top-4 right-4 z-10 glass-strong border border-white/10 rounded-xl px-3 py-1 text-[10px] font-mono text-muted-foreground uppercase">
                      Telesync: SP-PINHEIROS
                    </div>

                    <canvas 
                      ref={canvasRef} 
                      width={700} 
                      height={340} 
                      className="w-full bg-muted border-b border-border/40"
                    />

                    {/* Timeline slider steps */}
                    <div className="p-5 bg-card flex items-center justify-between border-t border-border/30 gap-2 flex-wrap">
                      <div className="flex items-center gap-2.5">
                        <Package className="size-5 text-primary-glow" />
                        <div>
                          <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Código de rastreamento</h4>
                          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{currentOrder.id.toUpperCase()}</p>
                        </div>
                      </div>

                      <div className="flex gap-4 items-center">
                        <div className="text-right">
                          <span className="text-[10px] uppercase text-muted-foreground font-mono">Endereço de Entrega</span>
                          <p className="text-xs font-semibold text-foreground/90 truncate max-w-[240px] mt-0.5">{currentOrder.address}</p>
                        </div>
                        <div className="size-8 rounded-lg bg-surface/50 border border-border flex items-center justify-center text-muted-foreground">
                          <MapPin className="size-4 text-primary-glow" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Operational Timeline - Uber Eats premium vibe */}
                  <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
                    <h3 className="text-sm font-semibold text-foreground border-b border-border/40 pb-3 flex items-center gap-2">
                      <Sparkles className="size-4 text-primary-glow" />
                      Linha do tempo operacional realtime
                    </h3>

                    <div className="relative pl-8 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-border/60">
                      
                      {/* Step 1: Confirmed */}
                      <div className="relative">
                        <span className={`absolute left-[-29px] top-0.5 size-6 rounded-full border-2 flex items-center justify-center transition-all ${
                          stage >= 0 ? "bg-success border-success text-black" : "bg-card border border-border rounded-2xl border-border text-muted-foreground"
                        }`}>
                          <CheckCircle2 className="size-4 stroke-[3]" />
                        </span>
                        <div>
                          <h4 className={`text-sm font-extrabold ${stage >= 0 ? "text-foreground" : "text-muted-foreground"}`}>Pedido Confirmado</h4>
                          <p className="text-xs text-muted-foreground mt-0.5">Nossa cozinha aceitou e registrou o seu pedido na central.</p>
                          <span className="text-[9px] font-mono text-success/80 mt-1 block">Confirmado há {Math.max(1, Math.floor(elapsed * 0.9))}m</span>
                        </div>
                      </div>

                      {/* Step 2: Preparing */}
                      <div className="relative">
                        <span className={`absolute left-[-29px] top-0.5 size-6 rounded-full border-2 flex items-center justify-center transition-all ${
                          stage >= 1 ? "bg-success border-success text-black" : "bg-card border border-border rounded-2xl border-border text-muted-foreground"
                        }`}>
                          <CheckCircle2 className="size-4 stroke-[3]" />
                        </span>
                        <div>
                          <h4 className={`text-sm font-extrabold ${stage >= 1 ? "text-foreground" : "text-muted-foreground"}`}>Em Preparo na Cozinha</h4>
                          <p className="text-xs text-muted-foreground mt-0.5">Os chefes estão cozinhando o hamburguer artesanal sob medida.</p>
                          {currentOrder.status === "em_preparo" && (
                            <span className="text-[9px] font-mono text-warning/90 mt-1 block animate-pulse">🔥 Sendo preparado agora na chapa</span>
                          )}
                        </div>
                      </div>

                      {/* Step 3: Dispatch queue */}
                      <div className="relative">
                        <span className={`absolute left-[-29px] top-0.5 size-6 rounded-full border-2 flex items-center justify-center transition-all ${
                          stage >= 2 ? "bg-success border-success text-black" : "bg-card border border-border rounded-2xl border-border text-muted-foreground"
                        }`}>
                          <CheckCircle2 className="size-4 stroke-[3]" />
                        </span>
                        <div>
                          <h4 className={`text-sm font-extrabold ${stage >= 2 ? "text-foreground" : "text-muted-foreground"}`}>Pronto & Despachado</h4>
                          <p className="text-xs text-muted-foreground mt-0.5">Embalagem selada e colocada na fila de despacho express.</p>
                          {currentOrder.status === "pronto" && (
                            <span className="text-[9px] font-mono text-primary-glow mt-1 block animate-pulse">✦ IA alocando melhor motoboy para sua rota...</span>
                          )}
                        </div>
                      </div>

                      {/* Step 4: Out for delivery */}
                      <div className="relative">
                        <span className={`absolute left-[-29px] top-0.5 size-6 rounded-full border-2 flex items-center justify-center transition-all ${
                          stage >= 3 ? "bg-success border-success text-black" : "bg-card border border-border rounded-2xl border-border text-muted-foreground"
                        }`}>
                          <CheckCircle2 className="size-4 stroke-[3]" />
                        </span>
                        <div>
                          <h4 className={`text-sm font-extrabold ${stage >= 3 ? "text-foreground" : "text-muted-foreground"}`}>Saiu para Entrega / A Caminho</h4>
                          <p className="text-xs text-muted-foreground mt-0.5">O entregador está se deslocando para o seu endereço em alta velocidade.</p>
                          {stage === 3 && (
                            <span className="text-[9px] font-mono text-[#22d3ee] mt-1 block animate-pulse">⚡ Entregador navegando via geolocalização live</span>
                          )}
                        </div>
                      </div>

                      {/* Step 5: Completed */}
                      <div className="relative">
                        <span className={`absolute left-[-29px] top-0.5 size-6 rounded-full border-2 flex items-center justify-center transition-all ${
                          stage >= 4 ? "bg-success border-success text-black" : "bg-card border border-border rounded-2xl border-border text-muted-foreground"
                        }`}>
                          <CheckCircle2 className="size-4 stroke-[3]" />
                        </span>
                        <div>
                          <h4 className={`text-sm font-extrabold ${stage >= 4 ? "text-foreground" : "text-muted-foreground"}`}>Entrega Concluída</h4>
                          <p className="text-xs text-muted-foreground mt-0.5">Seu hamburguer foi entregue com sucesso! Bom apetite!</p>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>

                {/* Column 3: Live ETA Card & Driver Profile Details */}
                <div className="space-y-6">
                  {/* Neon Glow ETA HUD */}
                  <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900 border border-indigo-500/20 rounded-3xl p-6 text-center space-y-4 shadow-[0_8px_30px_rgba(99,102,241,0.1)] relative overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-primary-glow to-transparent" />
                    
                    <div className="size-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/35 flex items-center justify-center mx-auto text-primary-glow animate-pulse">
                      <Clock className="size-6" />
                    </div>

                    <div>
                      <h4 className="text-[10px] uppercase font-mono tracking-widest text-indigo-300 font-bold">Tempo Estimado de Entrega</h4>
                      {currentOrder.status === "entregue" ? (
                        <div className="text-4xl font-extrabold text-success font-mono tracking-tight mt-1.5 uppercase">Entregue</div>
                      ) : (
                        <div className="text-5xl font-black text-foreground font-mono tabular-nums tracking-tight mt-1.5">
                          {currentETA} <span className="text-lg font-bold text-indigo-300 font-sans">min</span>
                        </div>
                      )}
                      <p className="text-[11px] text-muted-foreground mt-2">
                        {currentOrder.status === "entregue" 
                          ? "Sua comida foi entregue com sucesso!"
                          : "Atualizando em tempo real com base no trânsito."}
                      </p>
                    </div>

                    <div className="border-t border-white/5 pt-4 flex justify-between text-xs text-muted-foreground font-mono">
                      <div>
                        <span>CANAL</span>
                        <div className="font-semibold text-foreground mt-0.5">{currentOrder.channel}</div>
                      </div>
                      <div className="border-r border-white/5" />
                      <div>
                        <span>TOTAL</span>
                        <div className="font-semibold text-foreground mt-0.5">R$ {Number(currentOrder.total_amount).toFixed(2)}</div>
                      </div>
                      <div className="border-r border-white/5" />
                      <div>
                        <span>ITENS</span>
                        <div className="font-semibold text-foreground mt-0.5">{currentOrder.items_count} un</div>
                      </div>
                    </div>
                  </div>

                  {/* Driver details */}
                  {assignedDriver ? (
                    <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="size-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center font-display font-extrabold text-lg text-primary-glow">
                            {assignedDriver.name.slice(5, 7)}
                          </div>
                          <span className="absolute bottom-0 right-0 size-3 rounded-full bg-success border-2 border-[#0b0e14]" />
                        </div>
                        
                        <div>
                          <h4 className="text-sm font-semibold text-foreground">{assignedDriver.name}</h4>
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5 font-mono">
                            <Bike className="size-3 text-primary-glow" />
                            <span>{assignedDriver.vehicle.toUpperCase()} · CLASSE PREMIUM</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-muted border border-border/40 rounded-xl p-3.5 flex justify-between items-center text-xs font-mono">
                        <div>
                          <span className="text-[9px] text-muted-foreground block uppercase">Avaliação</span>
                          <div className="flex items-center gap-1 font-bold text-warning mt-0.5">
                            <Star className="size-3 fill-warning text-warning" />
                            <span>{assignedDriver.rating}</span>
                          </div>
                        </div>
                        <div className="h-6 border-r border-white/5" />
                        <div>
                          <span className="text-[9px] text-muted-foreground block uppercase">Corridas Hoje</span>
                          <div className="font-semibold text-foreground mt-0.5">{assignedDriver.active_orders + 4} entregas</div>
                        </div>
                        <div className="h-6 border-r border-white/5" />
                        <div>
                          <span className="text-[9px] text-muted-foreground block uppercase">Velocidade IA</span>
                          <div className="font-bold text-[#22d3ee] mt-0.5">38 km/h</div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <a 
                          href={`tel:${currentOrder.customer_phone}`}
                          className="flex-1 py-2.5 rounded-lg border border-border bg-muted text-foreground hover:bg-surface text-center font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Phone className="size-3.5 text-muted-foreground" />
                          Telefonar
                        </a>
                        <button
                          onClick={() => toast.success("Chat privado com entregador aberto em canal secundário.")}
                          className="flex-1 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-center font-extrabold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <MessageSquare className="size-3.5 fill-black" />
                          Chat Live
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-card border border-border rounded-2xl/50 border border-border/60 rounded-2xl p-6 text-center space-y-3">
                      <Bike className="size-8 mx-auto text-muted-foreground/30 animate-bounce" />
                      <h4 className="text-sm font-semibold text-foreground">Buscando Entregador...</h4>
                      <p className="text-xs text-muted-foreground">
                        Sua comanda está em produção na chapa. Assim que concluída, a IA selecionará o motoboy mais próximo para despacho imediato!
                      </p>
                    </div>
                  )}

                  {/* Premium Brand Banner */}
                  <div className="bg-gradient-to-br from-primary/10 via-transparent to-accent/5 border border-border/50 rounded-2xl p-5 space-y-3 relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-primary/25 border-b border-l border-primary/40 rounded-bl px-2.5 py-0.5 text-[8px] font-mono font-bold tracking-wider text-primary-glow uppercase">
                      IA POWERED
                    </div>
                    <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="size-3.5 text-primary-glow" />
                      Tecnologia de Rastreamento
                    </h4>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      O Delivery OS opera via satélite de geolocalização e modelagem de congestionamento avançado para garantir precisão absoluta na sua entrega.
                    </p>
                  </div>
                </div>

              </div>
            ) : (
              <div className="bg-card border border-border rounded-2xl/40 border border-border/40 rounded-2xl p-16 text-center space-y-4">
                <Compass className="size-12 mx-auto text-muted-foreground/30" />
                <h3 className="text-lg font-semibold text-foreground">Nenhum Pedido Ativo Encontrado</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Crie pedidos na Central ou marque-os prontos no KDS para acompanhar o rastreio aqui.
                </p>
              </div>
            )}
          </main>
        )}
      </div>
    </div>
  );
}
