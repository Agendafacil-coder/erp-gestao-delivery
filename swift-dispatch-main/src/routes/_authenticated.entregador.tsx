import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { PersonaShell } from "@/components/ops/PersonaShell";
import { Onboarding } from "@/components/ops/Onboarding";
import { useTenant } from "@/hooks/useTenant";
import { useOps } from "@/hooks/useOps";
import { useI18n } from "@/hooks/useI18n";
import { driverRepository } from "@/lib/repositories";
import { getMyDriverFn } from "@/functions/drivers";
import { useDriverGps } from "@/hooks/useDriverGps";
import { toast } from "sonner";
import { 
  Bike, 
  MapPin, 
  Package, 
  CheckCircle2, 
  AlertCircle, 
  DollarSign, 
  History, 
  User, 
  Power, 
  Camera, 
  Map, 
  Check, 
  ShieldCheck, 
  Sparkles,
  ArrowRight,
  TrendingUp,
  Award,
  Zap,
  Flame,
  Star,
  Activity,
  Percent
} from "lucide-react";
import { soundService } from "@/lib/services/SoundService";

export const Route = createFileRoute("/_authenticated/entregador")({
  component: DriverPwaPage,
});

type DriverBadge = {
  id: string;
  name: string;
  desc: string;
  icon: any;
  color: string;
};

function DriverPwaPage() {
  const { current, loading } = useTenant();
  const { t } = useI18n();
  const { orders, drivers, tick, updateOrderStatus, updateOrderDriver, fetchData } = useOps();
  
  // Driver PWA local states
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [gpsActive, setGpsActive] = useState(false);
  const [activeTab, setActiveTab] = useState<"corrida" | "ganhos" | "gamification" | "historico">("corrida");
  const [showCamera, setShowCamera] = useState<boolean>(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  // Active driver profile details
  const activeDriver = useMemo(() => {
    return drivers.find(d => d.id === selectedDriverId);
  }, [drivers, selectedDriverId]);

  // Simulated telemetry scores per driver (gamification database)
  const driverTelemetry = useMemo(() => {
    const defaultTelemetry = {
      level: 4,
      xp: 2800,
      maxXp: 4000,
      streak: 12,
      slaPontualidade: 98,
      taxaAceitacao: 95,
      velocidadeMedia: 26, // km/h
      satisfacao: 4.9,
      efficiencyScore: 98.4
    };

    const telemetryMap: Record<string, typeof defaultTelemetry> = {
      "d-0": { level: 5, xp: 3400, maxXp: 5000, streak: 15, slaPontualidade: 99, taxaAceitacao: 98, velocidadeMedia: 28, satisfacao: 5.0, efficiencyScore: 99.2 },
      "d-1": { level: 3, xp: 1800, maxXp: 3000, streak: 8, slaPontualidade: 95, taxaAceitacao: 92, velocidadeMedia: 22, satisfacao: 4.7, efficiencyScore: 94.8 },
      "d-2": { level: 4, xp: 2200, maxXp: 4000, streak: 11, slaPontualidade: 97, taxaAceitacao: 94, velocidadeMedia: 25, satisfacao: 4.8, efficiencyScore: 97.1 }
    };

    return telemetryMap[selectedDriverId] || defaultTelemetry;
  }, [selectedDriverId]);

  // Gamification badges/achievements
  const badges: DriverBadge[] = [
    { id: "b1", name: "SLA Champion", desc: "Manteve SLA acima de 95% em 50 corridas consecutivas", icon: Award, color: "#d97706" },
    { id: "b2", name: "Chuva Master", desc: "Concluiu 10 entregas sob chuva torrencial sem atrasar", icon: Flame, color: "#06b6d4" },
    { id: "b3", name: "Agrupador Elite", desc: "Realizou batelada quádrupla otimizada com 100% de pontualidade", icon: Zap, color: "#a855f7" },
    { id: "b4", name: "Coleta Sônica", desc: "Tempo de coleta no HQ menor que 90 segundos em 5 corridas", icon: Sparkles, color: "#e11d48" }
  ];

  // Orders currently assigned to this driver
  const assignedOrders = useMemo(() => {
    return orders.filter(o => o.driver_id === selectedDriverId && !["entregue", "cancelado"].includes(o.status));
  }, [orders, selectedDriverId]);

  // Completed orders for history
  const completedOrders = useMemo(() => {
    return orders.filter(o => o.driver_id === selectedDriverId && o.status === "entregue");
  }, [orders, selectedDriverId]);

  // Open delivery offer if driver is online and has no active orders, and there's a ready order
  const pendingDispatchOrder = useMemo(() => {
    if (!isOnline || assignedOrders.length > 0) return null;
    return orders.find(o => ["pronto", "aguardando_entregador"].includes(o.status));
  }, [orders, isOnline, assignedOrders]);

  // Vincular entregador logado (ou primeiro da lista em demo)
  useEffect(() => {
    if (!current?.id || drivers.length === 0) return;

    void getMyDriverFn({ data: { tenantId: current.id } }).then((mine) => {
      if (mine) {
        setSelectedDriverId(mine.id);
      } else if (!selectedDriverId && drivers[0]) {
        setSelectedDriverId(drivers[0].id);
      }
    });
  }, [current?.id, drivers]);

  useDriverGps({
    driverId: selectedDriverId || null,
    enabled: isOnline && gpsActive && !!selectedDriverId,
    intervalMs: 15000,
  });

  // Sync isOnline state when driver profile changes
  useEffect(() => {
    if (activeDriver) {
      setIsOnline(activeDriver.status !== "offline");
    }
  }, [selectedDriverId, activeDriver]);

  // Handle Online/Offline toggle
  const toggleOnline = async (val: boolean) => {
    if (!selectedDriverId) {
      toast.error("Nenhum entregador selecionado");
      return;
    }
    setIsOnline(val);
    setGpsActive(val);
    try {
      await driverRepository.updateDriverStatus(selectedDriverId, val ? "disponivel" : "offline");
      fetchData();
      toast.success(
        val
          ? "Online — GPS ativo. Sua posição será enviada a cada 15s."
          : "Offline — GPS pausado.",
        { icon: val ? "🟢" : "🔴" },
      );
    } catch (err: any) {
      toast.error(`Erro ao atualizar status: ${err.message}`);
    }
  };

  // Accept Order Dispatch Offer
  const handleAcceptOffer = async (orderId: string) => {
    try {
      await updateOrderDriver(orderId, selectedDriverId, "em_rota_coleta");
      await driverRepository.updateDriverStatus(selectedDriverId, "em_rota");
      soundService.playNewOrder();
      toast.success("Corrida aceita! Desloque-se ao restaurante para coleta.", {
        icon: "🏍️"
      });
      fetchData();
    } catch (err: any) {
      toast.error(`Erro ao aceitar corrida: ${err.message}`);
    }
  };

  // Decline Order Dispatch Offer
  const handleDeclineOffer = () => {
    toast.info("Oferta recusada. A IA irá redirecionar para outro entregador.");
  };

  // Confirm pickup
  const handleConfirmPickup = async (orderId: string) => {
    try {
      await updateOrderStatus(orderId, "retirado");
      // Advance to transit
      setTimeout(async () => {
        await updateOrderStatus(orderId, "em_rota_entrega");
        fetchData();
      }, 500);
      toast.success("Coleta confirmada! Pedido em trânsito para o cliente.", {
        icon: "📦"
      });
      fetchData();
    } catch (err: any) {
      toast.error(`Erro ao confirmar coleta: ${err.message}`);
    }
  };

  // Confirm delivery with simulated photo capture
  const handleStartDeliveryCompletion = () => {
    setShowCamera(true);
  };

  const handleCapturePhoto = async (orderId: string) => {
    setCapturedPhoto("simulated_delivery_receipt.jpg");
    setTimeout(async () => {
      try {
        await updateOrderStatus(orderId, "entregue");
        await driverRepository.updateDriverStatus(selectedDriverId, "disponivel");
        
        soundService.playDeliveryCompleted();
        toast.success("Entrega finalizada com sucesso! Comprovante enviado à central.", {
          icon: "🏁"
        });
        
        setShowCamera(false);
        setCapturedPhoto(null);
        fetchData();
      } catch (err: any) {
        toast.error(`Erro ao finalizar entrega: ${err.message}`);
      }
    }, 1200);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">{t("common", "loading")}</div>;
  }

  return (
    <PersonaShell title="Entregador" subtitle="PWA · rotas e entregas" accent="driver">
        {!current ? (
          <div className="p-6"><Onboarding /></div>
        ) : (
          <main className="flex-1 p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto bg-[#06080b]">
            
            {/* Left Column: Driver Selector & Performance Radar Dashboard */}
            <div className="lg:col-span-4 space-y-6 h-full overflow-y-auto pr-1">
              
              {/* Profile selector */}
              <div className="bg-[#0b0e14] border border-border rounded-2xl p-5 space-y-4">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <User className="size-4 text-primary-glow" />
                  Seletor de Entregador
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Para simular a operação real mobile de "uma mão", escolha qualquer entregador abaixo cadastrado no banco:
                </p>

                <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                  {drivers.map(d => (
                    <button
                      key={d.id}
                      onClick={() => setSelectedDriverId(d.id)}
                      className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                        selectedDriverId === d.id 
                          ? "bg-primary/10 border-primary/40 shadow-glow" 
                          : "bg-surface/30 border-border/50 hover:bg-surface/50 text-muted-foreground hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="size-8 rounded-lg bg-surface flex items-center justify-center font-bold text-xs text-white">
                          {d.name.slice(5, 7)}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">{d.name}</div>
                          <div className="text-[9px] font-mono text-muted-foreground uppercase">{d.vehicle} · Rating {d.rating}</div>
                        </div>
                      </div>

                      <span className={`size-2 rounded-full ${
                        d.status === "em_rota" ? "bg-accent" :
                        d.status === "offline" ? "bg-muted-foreground/40" : "bg-success"
                      }`} />
                    </button>
                  ))}
                </div>
              </div>

              {/* F1 Telemetry & Performance Radar Chart */}
              <div className="bg-[#0b0e14] border border-border rounded-2xl p-5 space-y-4 shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
                <div className="border-b border-border/40 pb-2 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider font-bold flex items-center gap-1.5">
                    <Activity className="size-3.5 text-accent animate-pulse" />
                    Radar de Performance do Entregador
                  </span>
                </div>

                {/* SVG Tactical Radar Chart */}
                <div className="flex justify-center py-2 relative">
                  <svg width="180" height="180" viewBox="0 0 100 100" className="opacity-90">
                    {/* Concentric pentagons for grid lines */}
                    {[20, 40, 60, 80, 100].map((r, idx) => {
                      const points = [];
                      for (let i = 0; i < 5; i++) {
                        const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
                        const x = 50 + (r / 2) * Math.cos(angle);
                        const y = 50 + (r / 2) * Math.sin(angle);
                        points.push(`${x},${y}`);
                      }
                      return (
                        <polygon
                          key={idx}
                          points={points.join(" ")}
                          fill="none"
                          stroke="rgba(255,255,255,0.06)"
                          strokeWidth="0.5"
                        />
                      );
                    })}

                    {/* Outer axis labels */}
                    {["SLA", "Aceitação", "Velocidade", "Rating", "Sucesso"].map((lbl, idx) => {
                      const angle = (idx * 2 * Math.PI) / 5 - Math.PI / 2;
                      const x = 50 + 56 * Math.cos(angle);
                      const y = 50 + 56 * Math.sin(angle);
                      return (
                        <text
                          key={lbl}
                          x={x}
                          y={y + 2}
                          fill="#94a3b8"
                          fontSize="5"
                          fontWeight="bold"
                          fontFamily="monospace"
                          textAnchor="middle"
                        >
                          {lbl}
                        </text>
                      );
                    })}

                    {/* Draw actual driver score shape */}
                    {(() => {
                      // Map stats: SLA(%), Aceitacao(%), Velocidade(28km/h -> %), Rating(5.0 -> %), Sucesso(%)
                      const valMap = [
                        driverTelemetry.slaPontualidade / 100,
                        driverTelemetry.taxaAceitacao / 100,
                        Math.min(1.0, driverTelemetry.velocidadeMedia / 30),
                        driverTelemetry.satisfacao / 5.0,
                        driverTelemetry.efficiencyScore / 100
                      ];

                      const points = [];
                      for (let i = 0; i < 5; i++) {
                        const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
                        const r = valMap[i] * 42;
                        const x = 50 + r * Math.cos(angle);
                        const y = 50 + r * Math.sin(angle);
                        points.push(`${x},${y}`);
                      }
                      return (
                        <g>
                          <polygon
                            points={points.join(" ")}
                            fill="rgba(34,211,238,0.25)"
                            stroke="#22d3ee"
                            strokeWidth="1.2"
                          />
                          {/* Point indicators */}
                          {points.map((p, i) => {
                            const [x, y] = p.split(",");
                            return <circle key={i} cx={x} cy={y} r="1.5" fill="#ffffff" />;
                          })}
                        </g>
                      );
                    })()}
                  </svg>
                </div>

                {/* Telemetry stats grid */}
                <div className="grid grid-cols-2 gap-3 text-[10px] font-mono text-white/95">
                  <div className="p-2 bg-surface/30 border border-border/50 rounded-xl">
                    <span className="text-[8px] text-muted-foreground uppercase">SLA Pontualidade</span>
                    <div className="font-bold text-success text-xs mt-0.5">{driverTelemetry.slaPontualidade}%</div>
                  </div>
                  <div className="p-2 bg-surface/30 border border-border/50 rounded-xl">
                    <span className="text-[8px] text-muted-foreground uppercase">Taxa Aceitação</span>
                    <div className="font-bold text-[#22d3ee] text-xs mt-0.5">{driverTelemetry.taxaAceitacao}%</div>
                  </div>
                  <div className="p-2 bg-surface/30 border border-border/50 rounded-xl">
                    <span className="text-[8px] text-muted-foreground uppercase">Velocidade Média</span>
                    <div className="font-bold text-white text-xs mt-0.5">{driverTelemetry.velocidadeMedia} km/h</div>
                  </div>
                  <div className="p-2 bg-surface/30 border border-border/50 rounded-xl">
                    <span className="text-[8px] text-muted-foreground uppercase">Eficiência Geral</span>
                    <div className="font-bold text-accent text-xs mt-0.5">{driverTelemetry.efficiencyScore}%</div>
                  </div>
                </div>
              </div>

            </div>

            {/* Right: Gorgeous Mobile Phone Bezels mockup for PWA */}
            <div className="lg:col-span-8 flex justify-center h-full">
              <div className="w-full max-w-[375px] h-[700px] rounded-[48px] border-[12px] border-[#1d222e] bg-[#07090d] shadow-[0_25px_60px_rgba(0,0,0,0.8)] relative overflow-hidden flex flex-col justify-between">
                
                {/* Phone Speaker notch bar */}
                <div className="absolute top-0 inset-x-0 h-6 flex justify-between px-6 items-center text-[10px] font-semibold text-white/90 z-20">
                  <span>16:18</span>
                  <div className="w-[110px] h-4 bg-[#1d222e] rounded-b-xl absolute left-1/2 -translate-x-1/2 top-0" />
                  <div className="flex items-center gap-1 font-mono">
                    <span>5G</span>
                    <span className="size-2 bg-success rounded-full" />
                  </div>
                </div>

                {/* Mobile PWA Header */}
                <div className="bg-[#0b0e14] border-b border-border/40 px-5 pt-7 pb-3 shrink-0">
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-2">
                      <div className="size-7 rounded-lg bg-primary/10 border border-primary/25 flex items-center justify-center font-bold text-xs text-primary-glow">
                        {activeDriver?.name.slice(5, 7) || "01"}
                      </div>
                      <div>
                        <div className="text-[11px] font-bold text-white">{activeDriver?.name || "Entregador"}</div>
                        <div className="text-[9px] text-success font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                          <span className="size-1 rounded-full bg-success animate-pulse" />
                          {gpsActive ? "GPS ativo" : "Online no Hub"}
                        </div>
                      </div>
                    </div>

                    {/* Online Toggle power button */}
                    <button
                      onClick={() => toggleOnline(!isOnline)}
                      className={`p-2 rounded-xl transition cursor-pointer flex items-center justify-center ${
                        isOnline 
                          ? "bg-success/15 text-success border border-success/30 shadow-[0_0_12px_rgba(34,197,94,0.15)]" 
                          : "bg-surface border border-border text-muted-foreground"
                      }`}
                    >
                      <Power className="size-4" />
                    </button>
                  </div>
                </div>

                {/* Mobile Main Body area */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 relative bg-[#07090d]">
                  
                  {/* Offers overlay modal alert */}
                  {pendingDispatchOrder && (
                    <div className="bg-gradient-to-b from-indigo-950/80 to-slate-900 border-2 border-primary-glow/60 rounded-2xl p-4 text-center space-y-3 shadow-[0_8px_30px_rgba(99,102,241,0.25)] animate-in fade-in duration-300">
                      <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center mx-auto text-primary-glow animate-bounce">
                        <Bike className="size-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black uppercase text-indigo-300 font-mono tracking-widest">NOVA CORRIDA DISPONÍVEL!</h4>
                        <div className="text-2xl font-black text-white font-mono mt-1">R$ {Number(pendingDispatchOrder.total_amount * 0.15 + 4).toFixed(2)}</div>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Bairro: <b>{pendingDispatchOrder.address.split(",")[0]}</b> <br/>
                          Distância estimada: 2.8 km
                        </p>
                      </div>

                      <div className="flex gap-2 pt-1.5">
                        <button
                          onClick={handleDeclineOffer}
                          className="flex-1 py-2 rounded-xl border border-border hover:bg-surface text-muted-foreground text-xs font-bold transition"
                        >
                          Recusar
                        </button>
                        <button
                          onClick={() => handleAcceptOffer(pendingDispatchOrder.id)}
                          className="flex-1 py-2 rounded-xl bg-gradient-to-r from-primary to-indigo-500 text-black text-xs font-extrabold transition shadow-glow"
                        >
                          ACEITAR
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Tabs container */}
                  {activeTab === "corrida" && (
                    <div className="space-y-4">
                      {assignedOrders.length === 0 ? (
                        <div className="bg-[#0b0e14]/40 border border-border/40 rounded-2xl py-12 px-4 text-center space-y-3">
                          <Bike className="size-10 mx-auto text-muted-foreground/30 animate-pulse" />
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Aguardando corridas</h4>
                          <p className="text-[11px] text-muted-foreground leading-relaxed max-w-[220px] mx-auto">
                            Tudo calmo por aqui. Quando a IA ou operador alocar uma entrega para você, apitará na tela!
                          </p>
                        </div>
                      ) : (
                        assignedOrders.map(order => (
                          <div key={order.id} className="bg-[#0b0e14] border border-border rounded-2xl p-4 space-y-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="font-mono text-sm font-extrabold text-white">{order.code}</span>
                                <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono mt-0.5">COLETA EM RESTAURANTE</div>
                              </div>

                              <span className="text-[10px] font-mono font-bold bg-[#151c2c] text-[#22d3ee] px-2 py-0.5 rounded border border-[#22d3ee]/20">
                                {order.status === "em_rota_coleta" ? "Navegar Coleta" : "Navegar Cliente"}
                              </span>
                            </div>

                            <div className="border-t border-border/40 pt-3 space-y-2.5">
                              {/* Restaurant pin */}
                              <div className="flex items-start gap-2.5 text-[11px]">
                                <div className="size-4.5 rounded-full bg-danger/10 border border-danger/35 flex items-center justify-center text-danger text-[9px] font-extrabold shrink-0 mt-0.5">HQ</div>
                                <div>
                                  <span className="font-bold text-white">Delivery OS HQ</span>
                                  <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">Rua das Palmeiras, Pinheiros</p>
                                </div>
                              </div>

                              {/* Customer pin */}
                              <div className="flex items-start gap-2.5 text-[11px]">
                                <div className="size-4.5 rounded-full bg-success/10 border border-success/35 flex items-center justify-center text-success text-[9px] shrink-0 mt-0.5">
                                  <MapPin className="size-2.5" />
                                </div>
                                <div>
                                  <span className="font-bold text-white">{order.customer_name}</span>
                                  <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">{order.address}</p>
                                </div>
                              </div>
                            </div>

                            {/* Action Button: One-hand optimized */}
                            <div className="pt-2">
                              {order.status === "em_rota_coleta" ? (
                                <button
                                  onClick={() => handleConfirmPickup(order.id)}
                                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-warning to-amber-500 hover:from-warning/90 hover:to-amber-500/90 text-black font-black text-xs tracking-wider transition uppercase shadow-glow"
                                >
                                  CONFIRMAR RETIRADA (HQ)
                                </button>
                              ) : (
                                <button
                                  onClick={handleStartDeliveryCompletion}
                                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-success to-emerald-500 hover:from-success/90 hover:to-emerald-500/90 text-black font-black text-xs tracking-wider transition uppercase shadow-glow"
                                >
                                  FINALIZAR ENTREGA (FOTO)
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {activeTab === "ganhos" && (
                    <div className="space-y-4">
                      {/* Premium Earnings Hud */}
                      <div className="bg-[#0b0e14] border border-border rounded-2xl p-4 text-center space-y-3">
                        <div className="size-9 rounded-full bg-success/10 flex items-center justify-center mx-auto text-success">
                          <DollarSign className="size-5" />
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">Ganhos Acumulados</span>
                          <div className="text-3xl font-black text-white font-mono mt-0.5">R$ {(completedOrders.length * 9.50 + 60.00).toFixed(2)}</div>
                        </div>

                        <div className="border-t border-border/40 pt-3 grid grid-cols-2 text-left font-mono text-[10px]">
                          <div>
                            <span className="text-muted-foreground">Repasses Efetuados</span>
                            <div className="font-bold text-white text-xs mt-0.5">R$ 142,50</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Kms Rodados</span>
                            <div className="font-bold text-white text-xs mt-0.5">{(completedOrders.length * 3.1 + 12).toFixed(1)} km</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "gamification" && (
                    <div className="space-y-4 font-mono text-xs">
                      {/* Elite Badge progress bar */}
                      <div className="bg-[#0b0e14] border border-border rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Award className="size-5 text-[#22d3ee]" />
                            <div>
                              <div className="font-bold text-white text-xs">Nível {driverTelemetry.level} Elite</div>
                              <span className="text-[8px] text-muted-foreground uppercase">Streak: {driverTelemetry.streak} Comandas</span>
                            </div>
                          </div>
                          
                          <span className="text-[9px] text-[#22d3ee] font-bold">XP {driverTelemetry.xp} / {driverTelemetry.maxXp}</span>
                        </div>

                        {/* XP progress bar */}
                        <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-primary to-indigo-500"
                            style={{ width: `${(driverTelemetry.xp / driverTelemetry.maxXp) * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* Achievement list */}
                      <div className="space-y-2">
                        <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold">Badges do Motorista</span>
                        <div className="space-y-2">
                          {badges.map(b => (
                            <div key={b.id} className="p-2.5 bg-surface/30 border border-border/50 rounded-xl flex gap-2.5 items-center">
                              <div 
                                style={{ backgroundColor: `${b.color}15`, border: `1px solid ${b.color}35`, color: b.color }}
                                className="size-8 rounded-lg flex items-center justify-center shrink-0"
                              >
                                <b.icon className="size-4" />
                              </div>

                              <div className="overflow-hidden">
                                <h4 className="font-bold text-[10px] text-white leading-none">{b.name}</h4>
                                <p className="text-[8px] text-muted-foreground mt-1 leading-snug">{b.desc}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "historico" && (
                    <div className="space-y-3">
                      <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider font-bold">Histórico de Concluídos</span>
                      {completedOrders.length === 0 ? (
                        <div className="bg-[#0b0e14]/40 border border-border/40 rounded-2xl py-12 text-center text-muted-foreground text-xs font-mono uppercase">
                          Nenhuma comanda efetuada no turno.
                        </div>
                      ) : (
                        completedOrders.map(order => (
                          <div key={order.id} className="p-3 bg-[#0b0e14] border border-border rounded-xl flex items-center justify-between text-xs font-mono">
                            <div>
                              <div className="font-bold text-white">{order.code}</div>
                              <span className="text-[9px] text-muted-foreground">{order.customer_name}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-success font-bold font-mono">Sucesso ✓</span>
                              <span className="block text-[8px] text-muted-foreground mt-0.5">R$ {Number(order.total_amount).toFixed(2)}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Simulated Camera viewfinder view overlay */}
                  {showCamera && assignedOrders.length > 0 && (
                    <div className="absolute inset-0 bg-black/95 z-35 p-5 flex flex-col justify-between items-center text-center">
                      <div className="space-y-2 mt-4">
                        <Camera className="size-8 text-primary-glow mx-auto animate-pulse" />
                        <h4 className="text-sm font-extrabold text-white">Comprovante de Entrega</h4>
                        <p className="text-[10px] text-muted-foreground">Tire uma foto do pacote no local para finalizar a comanda.</p>
                      </div>

                      {/* Mock viewfinder frame box */}
                      <div className="w-full aspect-[4/3] rounded-xl border border-white/20 bg-[#12151d] relative overflow-hidden flex items-center justify-center">
                        <div className="absolute inset-4 border border-dashed border-white/10" />
                        {capturedPhoto ? (
                          <div className="text-success text-xs font-mono font-bold flex flex-col items-center gap-1.5 animate-pulse">
                            <ShieldCheck className="size-8" />
                            FOTO CAPTURADA ✓
                          </div>
                        ) : (
                          <div className="text-muted-foreground text-[10px] font-mono">[ ENQUADRAR ETIQUETA DO PACOTE ]</div>
                        )}
                      </div>

                      {/* Viewfinder Actions */}
                      <div className="w-full space-y-2 mb-2">
                        {!capturedPhoto ? (
                          <button
                            onClick={() => handleCapturePhoto(assignedOrders[0].id)}
                            className="w-full py-3.5 rounded-xl bg-white text-black font-extrabold text-xs transition uppercase flex items-center justify-center gap-2"
                          >
                            <Camera className="size-4" />
                            Capturar Comprovante
                          </button>
                        ) : (
                          <div className="text-xs text-white/90 animate-pulse">Processando imagem e encerrando SLA...</div>
                        )}

                        <button
                          onClick={() => setShowCamera(false)}
                          className="w-full py-2.5 rounded-xl border border-border text-muted-foreground text-xs font-bold transition hover:text-white"
                        >
                          Voltar
                        </button>
                      </div>
                    </div>
                  )}

                </div>

                {/* Mobile Bottom Tab navigation bar */}
                <div className="bg-[#0b0e14] border-t border-border/40 h-14 shrink-0 flex items-center justify-around text-muted-foreground z-10">
                  <button
                    onClick={() => setActiveTab("corrida")}
                    className={`flex flex-col items-center gap-0.5 text-[8px] font-bold tracking-wider cursor-pointer ${
                      activeTab === "corrida" ? "text-[#22d3ee]" : "hover:text-white"
                    }`}
                  >
                    <Bike className="size-4" />
                    CORRIDA
                  </button>
                  
                  <button
                    onClick={() => setActiveTab("ganhos")}
                    className={`flex flex-col items-center gap-0.5 text-[8px] font-bold tracking-wider cursor-pointer ${
                      activeTab === "ganhos" ? "text-[#22d3ee]" : "hover:text-white"
                    }`}
                  >
                    <DollarSign className="size-4" />
                    GANHOS
                  </button>

                  <button
                    onClick={() => setActiveTab("gamification")}
                    className={`flex flex-col items-center gap-0.5 text-[8px] font-bold tracking-wider cursor-pointer ${
                      activeTab === "gamification" ? "text-[#22d3ee]" : "hover:text-white"
                    }`}
                  >
                    <Award className="size-4" />
                    CONQUISTAS
                  </button>

                  <button
                    onClick={() => setActiveTab("historico")}
                    className={`flex flex-col items-center gap-0.5 text-[8px] font-bold tracking-wider cursor-pointer ${
                      activeTab === "historico" ? "text-[#22d3ee]" : "hover:text-white"
                    }`}
                  >
                    <History className="size-4" />
                    HISTÓRICO
                  </button>
                </div>

              </div>
            </div>

          </main>
        )}
    </PersonaShell>
  );
}
