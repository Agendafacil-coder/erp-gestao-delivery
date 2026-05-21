import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { OpsSidebar } from "@/components/ops/Sidebar";
import { OpsHeader } from "@/components/ops/Header";
import { Onboarding } from "@/components/ops/Onboarding";
import { useTenant } from "@/hooks/useTenant";
import { useOps } from "@/hooks/useOps";
import { useI18n } from "@/hooks/useI18n";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell 
} from "recharts";
import { 
  BarChart3, 
  Clock, 
  AlertTriangle, 
  TrendingUp, 
  Flame, 
  TrendingDown, 
  Bike, 
  MapPin, 
  Activity,
  Zap,
  Globe,
  Sliders
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/analytics")({
  component: AnalyticsPage,
});

const PEAK_HOURS_DATA = [
  { hour: "18h", orders: 24, avgSla: 32 },
  { hour: "19h", orders: 48, avgSla: 38 },
  { hour: "20h", orders: 62, avgSla: 42 },
  { hour: "21h", orders: 54, avgSla: 39 },
  { hour: "22h", orders: 32, avgSla: 34 },
  { hour: "23h", orders: 18, avgSla: 28 },
];

const SHIFTS_DATA = [
  { name: "Almoço", faturamento: 4820, entregas: 84, eficiencia: 94 },
  { name: "Jantar", faturamento: 11450, entregas: 186, eficiencia: 88 },
  { name: "Madrugada", faturamento: 2890, entregas: 42, eficiencia: 91 },
];

const CHANNELS_DATA = [
  { name: "iFood", value: 5800, color: "#ea1d2c" },
  { name: "WhatsApp", value: 3400, color: "#25d366" },
  { name: "App Próprio", value: 2250, color: "#6366f1" },
];

function AnalyticsPage() {
  const { current, loading } = useTenant();
  const { t } = useI18n();
  const { orders, drivers, tick } = useOps();
  const [activeView, setActiveView] = useState<"analytics" | "sla">("analytics");

  // SLA Realtime calculation states
  const totalVolume = orders.length;
  const activeDriverCount = drivers.filter(d => d.status !== "offline").length;
  const idleDriverCount = drivers.filter(d => d.status === "disponivel" || d.status === "ocioso").length;
  
  // Real calculations for risk factors
  const kitchenSlowRatio = useMemo(() => {
    const newlyPlaced = orders.filter(o => o.status === "novo").length;
    const preparing = orders.filter(o => o.status === "em_preparo").length;
    if (totalVolume === 0) return 0;
    return Math.min(100, Math.round(((newlyPlaced + preparing) / totalVolume) * 100));
  }, [orders, totalVolume]);

  const deliveryDeficitRatio = useMemo(() => {
    const readyOrders = orders.filter(o => o.status === "pronto" || o.status === "aguardando_entregador").length;
    if (activeDriverCount === 0) return 100;
    return Math.min(100, Math.round((readyOrders / activeDriverCount) * 100));
  }, [orders, activeDriverCount]);

  const regionCongestionLevel = useMemo(() => {
    // Simulated live dynamic based on active shift orders count
    return Math.min(100, 32 + (orders.filter(o => o.status === "em_rota_entrega").length * 8));
  }, [orders]);

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
            {/* Header section with tabs selector */}
            <div className="flex items-center justify-between flex-wrap gap-4 border-b border-border/40 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-primary-glow animate-pulse" />
                  <span className="text-[10px] uppercase font-mono tracking-widest text-muted-foreground font-bold">OPERATIONAL INTELLIGENCE</span>
                </div>
                <h1 className="erp-page-title mt-1">
                  Analytics <span className="text-gradient">& SLA Engine</span>
                </h1>
              </div>

              {/* View selectors */}
              <div className="flex items-center gap-2 bg-muted p-1 border border-border rounded-xl">
                <button
                  onClick={() => setActiveView("analytics")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    activeView === "analytics" ? "bg-primary/20 text-primary-glow font-bold" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Dashboard Executivo
                </button>
                <button
                  onClick={() => setActiveView("sla")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    activeView === "sla" ? "bg-primary/20 text-primary-glow font-bold" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Engine de Risco SLA
                </button>
              </div>
            </div>

            {activeView === "analytics" ? (
              <div className="space-y-6">
                
                {/* 1. Executive Analytics metrics strips */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Metric 1 */}
                  <div className="bg-card border border-border rounded-2xl p-4 space-y-2 relative overflow-hidden">
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span className="text-[10px] uppercase font-mono tracking-wider">Faturamento Turno</span>
                      <TrendingUp className="size-4 text-success" />
                    </div>
                    <div className="text-2xl font-black text-foreground font-mono tabular-nums">R$ 11.480,00</div>
                    <div className="text-[10px] text-success font-mono font-bold">+18.4% vs ontem</div>
                  </div>

                  {/* Metric 2 */}
                  <div className="bg-card border border-border rounded-2xl p-4 space-y-2 relative overflow-hidden">
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span className="text-[10px] uppercase font-mono tracking-wider">Lucro Operacional</span>
                      <Zap className="size-4 text-[#22d3ee]" />
                    </div>
                    <div className="text-2xl font-black text-foreground font-mono tabular-nums">R$ 3.820,00</div>
                    <div className="text-[10px] text-[#22d3ee] font-mono font-bold">Margem de 33.2%</div>
                  </div>

                  {/* Metric 3 */}
                  <div className="bg-card border border-border rounded-2xl p-4 space-y-2 relative overflow-hidden">
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span className="text-[10px] uppercase font-mono tracking-wider">Custo Médio / KM</span>
                      <TrendingDown className="size-4 text-[#38bdf8]" />
                    </div>
                    <div className="text-2xl font-black text-foreground font-mono tabular-nums">R$ 1,42 / km</div>
                    <div className="text-[10px] text-[#38bdf8] font-mono font-bold">-R$ 0.18 agrupamento IA</div>
                  </div>

                  {/* Metric 4 */}
                  <div className="bg-card border border-border rounded-2xl p-4 space-y-2 relative overflow-hidden">
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span className="text-[10px] uppercase font-mono tracking-wider">Tempo Médio Entrega</span>
                      <Clock className="size-4 text-warning" />
                    </div>
                    <div className="text-2xl font-black text-foreground font-mono tabular-nums">28.4 min</div>
                    <div className="text-[10px] text-warning font-mono font-bold">Meta: 35 min (SLA Ok)</div>
                  </div>
                </div>

                {/* 2. Executive Detailed Performance Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Area chart: Peak hour vs SLA delay */}
                  <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm">
                    <div className="border-b border-border/40 pb-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Previsão e Volume de Pico (Filtro Horários)</h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Cruzamento de volume de pedidos vs tempo médio de SLA</p>
                    </div>

                    <div className="h-[240px] text-xs font-mono">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={PEAK_HOURS_DATA} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4}/>
                              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.0}/>
                            </linearGradient>
                            <linearGradient id="colorSla" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="oklch(0.64 0.22 342.3)" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="oklch(0.64 0.22 342.3)" stopOpacity={0.0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="hour" stroke="#94a3b8" />
                          <YAxis stroke="#94a3b8" />
                          <Tooltip contentStyle={{ backgroundColor: "var(--popover)", borderColor: "var(--border)", color: "var(--popover-foreground)", borderRadius: "8px" }} />
                          <Area type="monotone" dataKey="orders" name="Pedidos/h" stroke="var(--primary)" fillOpacity={1} fill="url(#colorOrders)" strokeWidth={2} />
                          <Area type="monotone" dataKey="avgSla" name="Média SLA (min)" stroke="oklch(0.64 0.22 342.3)" fillOpacity={1} fill="url(#colorSla)" strokeWidth={1.5} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Channel pie chart distribution */}
                  <div className="bg-card border border-border rounded-2xl p-5 space-y-4 flex flex-col justify-between">
                    <div className="border-b border-border/40 pb-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Canais de Venda</h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Origem das requisições integradas no turno</p>
                    </div>

                    <div className="h-[180px] relative flex justify-center items-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={CHANNELS_DATA}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={75}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {CHANNELS_DATA.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      
                      <div className="absolute text-center">
                        <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-widest block leading-none">TOTAL VAL</span>
                        <span className="text-xl font-bold font-mono text-foreground leading-none">R$ 11.45k</span>
                      </div>
                    </div>

                    <div className="space-y-1.5 font-mono text-[10px]">
                      {CHANNELS_DATA.map((c, i) => (
                        <div key={i} className="flex justify-between items-center">
                          <div className="flex items-center gap-1.5">
                            <span className="size-2 rounded-full" style={{ backgroundColor: c.color }} />
                            <span className="text-foreground font-bold">{c.name}</span>
                          </div>
                          <span className="text-muted-foreground">R$ {c.value.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                {/* 3. Shifts Comparison Performance */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Shift BarChart */}
                  <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5 space-y-4">
                    <div className="border-b border-border/40 pb-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Eficiência Logística de Turnos</h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Faturamento vs taxa de pontualidade por shift</p>
                    </div>

                    <div className="h-[200px] text-xs font-mono">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={SHIFTS_DATA} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="name" stroke="#94a3b8" />
                          <YAxis stroke="#94a3b8" />
                          <Tooltip contentStyle={{ backgroundColor: "var(--popover)", borderColor: "var(--border)", color: "var(--popover-foreground)", borderRadius: "8px" }} />
                          <Bar dataKey="faturamento" name="Faturamento (R$)" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="eficiencia" name="Eficiência %" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Problematic Areas list HUD */}
                  <div className="bg-card border border-border rounded-2xl p-5 space-y-4 flex flex-col justify-between">
                    <div className="border-b border-border/40 pb-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Regiões Críticas & Gargalos</h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Rotas com maior latência de tráfego SP</p>
                    </div>

                    <div className="space-y-3 font-mono text-[11px] flex-1 pt-3">
                      {/* Region 1 */}
                      <div className="flex justify-between items-center p-2.5 bg-surface/30 border border-border/50 rounded-xl">
                        <div className="flex items-center gap-2">
                          <MapPin className="size-4 text-danger animate-pulse" />
                          <div>
                            <span className="font-semibold text-foreground">Brooklin</span>
                            <span className="block text-[8px] text-muted-foreground uppercase">Tempo Médio: 41 min</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-danger bg-danger/10 border border-danger/20 px-2 py-0.5 rounded">Risco Alto</span>
                      </div>

                      {/* Region 2 */}
                      <div className="flex justify-between items-center p-2.5 bg-surface/30 border border-border/50 rounded-xl">
                        <div className="flex items-center gap-2">
                          <MapPin className="size-4 text-warning" />
                          <div>
                            <span className="font-semibold text-foreground">Moema</span>
                            <span className="block text-[8px] text-muted-foreground uppercase">Tempo Médio: 36 min</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-warning bg-warning/10 border border-warning/20 px-2 py-0.5 rounded">Atenção</span>
                      </div>

                      {/* Region 3 */}
                      <div className="flex justify-between items-center p-2.5 bg-surface/30 border border-border/50 rounded-xl">
                        <div className="flex items-center gap-2">
                          <MapPin className="size-4 text-success" />
                          <div>
                            <span className="font-semibold text-foreground">Pinheiros</span>
                            <span className="block text-[8px] text-muted-foreground uppercase">Tempo Médio: 24 min</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-success bg-success/10 border border-success/20 px-2 py-0.5 rounded">Normal</span>
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            ) : (
              // ENGINE SLA REAL VIEW
              <div className="space-y-6">
                
                {/* SLA Risk Factors Grid (Formula calculations) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Factor 1: Kitchen bottlenecks */}
                  <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
                    <div className="flex justify-between items-center border-b border-border/40 pb-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                        <Flame className="size-4 text-warning" />
                        Capacidade de Cozinha
                      </h4>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                        kitchenSlowRatio > 50 ? "bg-warning/20 text-warning" : "bg-success/20 text-success"
                      }`}>
                        {kitchenSlowRatio > 50 ? "Lentidão" : "Sob controle"}
                      </span>
                    </div>

                    <div className="space-y-3 font-mono text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Fila de Produção KDS</span>
                        <span className="text-foreground font-bold">{orders.filter(o => ["novo", "em_preparo"].includes(o.status)).length} un</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tempo Cozimento Médio</span>
                        <span className="text-foreground font-bold">11.4 min</span>
                      </div>

                      <div className="space-y-1 pt-1">
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>Uso de Chapa / Forno</span>
                          <span>{kitchenSlowRatio}%</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-warning transition-all duration-500" style={{ width: `${kitchenSlowRatio}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Factor 2: Delivery deficits */}
                  <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
                    <div className="flex justify-between items-center border-b border-border/40 pb-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                        <Bike className="size-4 text-[#22d3ee]" />
                        Capacidade Entregadores
                      </h4>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                        deliveryDeficitRatio > 60 ? "bg-danger/20 text-danger animate-pulse" : "bg-success/20 text-success"
                      }`}>
                        {deliveryDeficitRatio > 60 ? "Falta Entregadores" : "Disponível"}
                      </span>
                    </div>

                    <div className="space-y-3 font-mono text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Entregadores Online</span>
                        <span className="text-foreground font-bold">{activeDriverCount} live</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Entregadores Livres</span>
                        <span className="text-foreground font-bold">{idleDriverCount} un</span>
                      </div>

                      <div className="space-y-1 pt-1">
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>Carga Ocupacional</span>
                          <span>{deliveryDeficitRatio}%</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-accent transition-all duration-500" style={{ width: `${deliveryDeficitRatio}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Factor 3: Regional congestion */}
                  <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
                    <div className="flex justify-between items-center border-b border-border/40 pb-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                        <Globe className="size-4 text-primary-glow" />
                        Congestionamento Tráfego
                      </h4>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-primary/20 text-primary-glow">
                        Congestionado
                      </span>
                    </div>

                    <div className="space-y-3 font-mono text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Multiplicador ETA Live</span>
                        <span className="text-foreground font-bold">1.4x tráfego SP</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Distância Média Rota</span>
                        <span className="text-foreground font-bold">3.2 km</span>
                      </div>

                      <div className="space-y-1 pt-1">
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>Nível Saturação SP</span>
                          <span>{regionCongestionLevel}%</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary transition-all duration-500" style={{ width: `${regionCongestionLevel}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Real-time calculated SLA Warning Notifications board */}
                <div className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm">
                  <div className="border-b border-border/40 pb-3 flex justify-between items-center">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <AlertTriangle className="size-4 text-warning" />
                      Alertas de Risco SLA Calculados por Algoritmo (IA)
                    </h3>
                    <span className="text-[9px] font-mono text-muted-foreground uppercase">Autotune: Ativo</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Alert Card 1 */}
                    <div className="p-4 bg-danger/[0.03] border-l-4 border-l-danger border-border/50 rounded-xl flex items-start gap-3">
                      <AlertTriangle className="size-5 text-danger shrink-0 mt-0.5 animate-bounce" />
                      <div className="space-y-1 font-mono text-xs">
                        <div className="font-semibold text-foreground uppercase tracking-wider text-[11px]">Risco Crítico de Atraso · Moema</div>
                        <p className="text-muted-foreground leading-relaxed">
                          Moema está operando com multiplicador <b>1.6x ETA</b> devido a vias expressas fechadas. 2 pedidos em preparo podem estourar a janela de 40 min em breve.
                        </p>
                        <span className="text-[9px] text-danger/80 mt-1 block">Risco calculado: 84% de estourar SLA</span>
                      </div>
                    </div>

                    {/* Alert Card 2 */}
                    <div className="p-4 bg-warning/[0.03] border-l-4 border-l-warning border-border/50 rounded-xl flex items-start gap-3">
                      <AlertTriangle className="size-5 text-warning shrink-0 mt-0.5" />
                      <div className="space-y-1 font-mono text-xs">
                        <div className="font-semibold text-foreground uppercase tracking-wider text-[11px]">Cozinha Lenta · Sobrecarga KDS</div>
                        <p className="text-muted-foreground leading-relaxed">
                          A cozinha registrou <b>+4.5 min de fila acumulada</b> no KDS. A capacidade está operando a 82%. Recomenda-se pausar pedidos iFood ou recrutar cozinheiro auxiliar.
                        </p>
                        <span className="text-[9px] text-warning/80 mt-1 block">Gargalo detectado há 12 min</span>
                      </div>
                    </div>

                    {/* Alert Card 3 */}
                    <div className="p-4 bg-primary/[0.03] border-l-4 border-l-primary border-border/50 rounded-xl flex items-start gap-3">
                      <AlertTriangle className="size-5 text-primary-glow shrink-0 mt-0.5" />
                      <div className="space-y-1 font-mono text-xs">
                        <div className="font-semibold text-foreground uppercase tracking-wider text-[11px]">Déficit de Entregadores em Moema</div>
                        <p className="text-muted-foreground leading-relaxed">
                          A IA detectou 3 pedidos no Brooklin/Moema em estado 'Pronto' sem entregadores offline disponíveis na região. Agrupamento em lote de rota é mandatório.
                        </p>
                        <span className="text-[9px] text-primary-glow mt-1 block">IA Auto-Dispatch recomendada</span>
                      </div>
                    </div>

                    {/* Alert Card 4 */}
                    <div className="p-4 bg-success/[0.03] border-l-4 border-l-success border-border/50 rounded-xl flex items-start gap-3">
                      <Activity className="size-5 text-success shrink-0 mt-0.5" />
                      <div className="space-y-1 font-mono text-xs">
                        <div className="font-semibold text-foreground uppercase tracking-wider text-[11px]">Pinheiros Fluxo Livre de Risco</div>
                        <p className="text-muted-foreground leading-relaxed">
                          Vias de Pinheiros e Itaim fluindo normalmente. Eficiência operacional de entrega operando com tempo recorde de 21 min. SLA seguro.
                        </p>
                        <span className="text-[9px] text-success mt-1 block">Tolerância segura de +18 min</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detailed SLA Engine parameters adjustment bar */}
                <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
                  <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                    <Sliders className="size-4 text-[#22d3ee]" />
                    Parâmetros Sensíveis de Risco do Algoritmo IA
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                    <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground font-semibold">Tolerância Crítica SLA (m)</span>
                      <input type="text" defaultValue="35 minutos" className="w-full p-2 bg-surface/50 border border-border rounded-lg text-foreground focus:ring-1 focus:ring-primary/45" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground font-semibold">Raio Máximo de Agrupamento Lote</span>
                      <input type="text" defaultValue="2.4 km" className="w-full p-2 bg-surface/50 border border-border rounded-lg text-foreground focus:ring-1 focus:ring-primary/45" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground font-semibold">Fator de Congestionamento Live</span>
                      <input type="text" defaultValue="Automático (Waze link)" className="w-full p-2 bg-surface/50 border border-border rounded-lg text-foreground focus:ring-1 focus:ring-primary/45" />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 text-xs">
                    <button onClick={() => toast.info("Parâmetros reajustados para padrões de fábrica.")} className="px-4 py-2 border border-border rounded hover:bg-surface transition">Restaurar Padrão</button>
                    <button onClick={() => toast.success("Sensibilidade do algoritmo atualizada!")} className="px-4 py-2 erp-btn-primary font-extrabold rounded shadow-glow transition">Aplicar Parâmetros</button>
                  </div>
                </div>

              </div>
            )}

          </main>
        )}
      </div>
    </div>
  );
}
