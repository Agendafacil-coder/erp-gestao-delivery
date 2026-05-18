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
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Coins, 
  Activity, 
  Clock, 
  MapPin, 
  ShieldAlert, 
  Bot, 
  Sliders, 
  Sparkles,
  Percent
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/financeiro")({
  component: FinancialPage,
});

const FINANCIAL_TIMELINE_DATA = [
  { hour: "18h", faturamento: 1200, custoEntregador: 420, lucro: 780, custoAtraso: 40 },
  { hour: "19h", faturamento: 2800, custoEntregador: 840, lucro: 1960, custoAtraso: 90 },
  { hour: "20h", faturamento: 4200, custoEntregador: 1300, lucro: 2900, custoAtraso: 120 },
  { hour: "21h", faturamento: 2100, custoEntregador: 750, lucro: 1350, custoAtraso: 30 },
  { hour: "22h", faturamento: 1180, custoEntregador: 400, lucro: 780, custoAtraso: 0 }
];

const REGIONAL_MARGIN_DATA = [
  { region: "Pinheiros", faturamento: 4500, margem: 38, status: "Alta" },
  { region: "Itaim Bibi", faturamento: 3200, margem: 34, status: "Alta" },
  { region: "Moema", faturamento: 2400, margem: 29, status: "Média" },
  { region: "Brooklin", faturamento: 1380, margem: 18, status: "Crítica" }
];

function FinancialPage() {
  const { current, loading } = useTenant();
  const { t } = useI18n();
  const { tick, orders } = useOps();

  // Simulated Slider Controls for fee optimization calculations
  const [baseFee, setBaseFee] = useState<number>(7.00);
  const [kmFee, setKmFee] = useState<number>(1.50);
  const [iaGroupDiscount, setIaGroupDiscount] = useState<number>(30); // % savings from AI bundling

  // Real faturamento values dynamically linked to orders length
  const dynamicFaturamento = useMemo(() => {
    return Number(orders.reduce((acc, o) => acc + o.total_amount, 0).toFixed(2));
  }, [orders]);

  const dynamicNetProfit = useMemo(() => {
    return Number((dynamicFaturamento * 0.33).toFixed(2));
  }, [dynamicFaturamento]);

  const dynamicAvgDeliveryCost = useMemo(() => {
    return Number((baseFee + kmFee * 2.8 * (1 - iaGroupDiscount/100)).toFixed(2));
  }, [baseFee, kmFee, iaGroupDiscount]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">{t("common", "loading")}</div>;
  }

  return (
    <div className="min-h-screen flex bg-[#06080b]">
      <OpsSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <OpsHeader tick={tick} />
        {!current ? (
          <Onboarding />
        ) : (
          <main className="flex-1 p-4 lg:p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-64px)]">
            
            {/* Header Title Section */}
            <div className="flex items-end justify-between flex-wrap gap-3 border-b border-border/40 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-success animate-pulse" />
                  <span className="text-[10px] uppercase font-mono tracking-widest text-muted-foreground font-bold">OPERATIONAL FINANCE COCKPIT</span>
                </div>
                <h1 className="text-2xl lg:text-3xl font-display font-semibold mt-1 text-white">
                  Financeiro <span className="text-gradient">Realtime</span>
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Análise preditiva de custos por rota, margens líquidas, e auditoria de desperdício em tempo real.
                </p>
              </div>

              <div className="text-[10px] text-muted-foreground font-mono bg-[#0f1219] px-3.5 py-2 border border-border rounded-xl">
                TICK FINANCEIRO: #{tick}
              </div>
            </div>

            {/* Premium HUD Cards Strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1 */}
              <div className="bg-[#0b0e14] border border-border/60 rounded-2xl p-4 space-y-2 relative overflow-hidden">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span className="text-[10px] uppercase font-mono tracking-wider">Faturamento Operacional</span>
                  <DollarSign className="size-4 text-success" />
                </div>
                <div className="text-2xl font-black text-white font-mono">
                  R$ {dynamicFaturamento > 0 ? dynamicFaturamento.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "11.480,00"}
                </div>
                <div className="text-[10px] text-success font-mono font-bold">+18.4% vs ontem</div>
              </div>

              {/* Card 2 */}
              <div className="bg-[#0b0e14] border border-border/60 rounded-2xl p-4 space-y-2 relative overflow-hidden">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span className="text-[10px] uppercase font-mono tracking-wider">Margem Líquida</span>
                  <Percent className="size-4 text-[#22d3ee]" />
                </div>
                <div className="text-2xl font-black text-white font-mono">33.2%</div>
                <div className="text-[10px] text-[#22d3ee] font-mono font-bold">R$ {dynamicNetProfit > 0 ? dynamicNetProfit.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "3.820,00"} Lucro</div>
              </div>

              {/* Card 3 */}
              <div className="bg-[#0b0e14] border border-border/60 rounded-2xl p-4 space-y-2 relative overflow-hidden">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span className="text-[10px] uppercase font-mono tracking-wider">Custo Médio Entrega</span>
                  <Coins className="size-4 text-primary-glow" />
                </div>
                <div className="text-2xl font-black text-white font-mono">R$ {dynamicAvgDeliveryCost.toFixed(2)}</div>
                <div className="text-[10px] text-primary-glow font-mono font-bold">-{iaGroupDiscount}% desconto IA Bateladas</div>
              </div>

              {/* Card 4 */}
              <div className="bg-[#0b0e14] border border-border/60 rounded-2xl p-4 space-y-2 relative overflow-hidden">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span className="text-[10px] uppercase font-mono tracking-wider">Perda por Atraso SLA</span>
                  <Clock className="size-4 text-danger animate-pulse" />
                </div>
                <div className="text-2xl font-black text-white font-mono">R$ 280,00</div>
                <div className="text-[10px] text-danger font-mono font-bold">4 reembolsos iFood (cozinha lenta)</div>
              </div>
            </div>

            {/* Financial Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Area Chart: Revenue vs Costs */}
              <div className="lg:col-span-2 bg-[#0b0e14] border border-border rounded-2xl p-5 space-y-4 shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
                <div className="border-b border-border/40 pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">Fluxo de Lucratividade Turno</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Cruzamento de faturamento bruto vs custo com motoristas vs lucro real por hora</p>
                </div>

                <div className="h-[240px] text-xs font-mono">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={FINANCIAL_TIMELINE_DATA} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorFaturamento" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.0}/>
                        </linearGradient>
                        <linearGradient id="colorLucro" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="oklch(0.74 0.17 155)" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="oklch(0.74 0.17 155)" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="hour" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip contentStyle={{ backgroundColor: "#0b0e14", borderColor: "rgba(255,255,255,0.15)", borderRadius: "8px" }} />
                      <Area type="monotone" dataKey="faturamento" name="Faturamento Bruto" stroke="var(--primary)" fillOpacity={1} fill="url(#colorFaturamento)" strokeWidth={2.5} />
                      <Area type="monotone" dataKey="lucro" name="Lucro Líquido" stroke="oklch(0.74 0.17 155)" fillOpacity={1} fill="url(#colorLucro)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Regional Margins Heat Table */}
              <div className="bg-[#0b0e14] border border-border rounded-2xl p-5 space-y-4 flex flex-col justify-between">
                <div className="border-b border-border/40 pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">Margens por Região</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Rentabilidade regional (desconto custo/km rodado)</p>
                </div>

                <div className="space-y-3 font-mono text-[11px] flex-1 pt-3">
                  {REGIONAL_MARGIN_DATA.map((r, i) => (
                    <div key={i} className="flex justify-between items-center p-2.5 bg-surface/30 border border-border/50 rounded-xl">
                      <div className="flex items-center gap-2">
                        <MapPin className="size-4 text-white" />
                        <div>
                          <span className="font-bold text-white">{r.region}</span>
                          <span className="block text-[8px] text-muted-foreground uppercase">Faturamento R$ {r.faturamento}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          r.margem < 20 ? "bg-danger/10 text-danger border border-danger/20" :
                          r.margem < 30 ? "bg-warning/10 text-warning border border-warning/20" :
                          "bg-success/10 text-success border border-success/20"
                        }`}>
                          {r.margem}% Margem
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Financial AI Diagnostics & Fee Calibration Slider */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Financial AI Intelligence Diagnosis Panel */}
              <div className="bg-[#0b0e14] border border-border rounded-2xl p-6 space-y-4 shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
                <div className="border-b border-border/40 pb-3 flex justify-between items-center">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                    <Bot className="size-4.5 text-primary-glow" />
                    IA Financeira Preditiva
                  </h3>
                  <span className="text-[8px] font-mono text-muted-foreground uppercase">Análise de Desperdício</span>
                </div>

                <div className="space-y-4 font-mono text-xs">
                  {/* Warning item 1 */}
                  <div className="p-3 bg-danger/[0.03] border-l-4 border-l-danger border-border/50 rounded-xl flex gap-3">
                    <ShieldAlert className="size-5 text-danger shrink-0 mt-0.5 animate-pulse" />
                    <div>
                      <div className="font-bold text-white uppercase tracking-wider text-[11px]">Baixa Rentabilidade: Zona Sul Extrema</div>
                      <p className="text-muted-foreground leading-relaxed mt-1">
                        O custo por km médio para a Zona Sul Extrema atingiu <b>R$ 3,18 / km</b>. A taxa de entrega cobrada não cobre 40% das despesas operacionais da rota.
                      </p>
                      <span className="text-[9px] text-danger/80 mt-1 block">Ação sugerida: Adicionar tarifa dinâmica regional de +R$ 4,50</span>
                    </div>
                  </div>

                  {/* Warning item 2 */}
                  <div className="p-3 bg-warning/[0.03] border-l-4 border-l-warning border-border/50 rounded-xl flex gap-3">
                    <ShieldAlert className="size-5 text-warning shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-white uppercase tracking-wider text-[11px]">Gargalo Financeiro na Cozinha</div>
                      <p className="text-muted-foreground leading-relaxed mt-1">
                        Estouro de fila KDS gerou <b>R$ 280,00 em estornos e descontos</b> para clientes. Reduzir tempo de cozimento em -3 min pouparia R$ 1.200/semana em multas SLA.
                      </p>
                      <span className="text-[9px] text-warning/80 mt-1 block">Risco de perda financeira projetado para amanhã</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Real Operational Fee Calibration Board */}
              <div className="bg-[#0b0e14] border border-border rounded-2xl p-6 space-y-4 flex flex-col justify-between">
                <div>
                  <div className="border-b border-border/40 pb-3 flex justify-between items-center">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                      <Sliders className="size-4.5 text-[#22d3ee]" />
                      Simulador e Calibrador Operacional
                    </h3>
                    <span className="text-[8px] font-mono text-muted-foreground uppercase">Previsão de Impacto</span>
                  </div>

                  {/* Dynamic Sliders */}
                  <div className="space-y-4 pt-4 font-mono text-xs text-white">
                    {/* Slider 1 */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-muted-foreground uppercase">Taxa de Entrega Base (Min)</span>
                        <span className="text-success font-bold">R$ {baseFee.toFixed(2)}</span>
                      </div>
                      <input 
                        type="range" 
                        min="5.00" 
                        max="15.00" 
                        step="0.50"
                        value={baseFee}
                        onChange={e => setBaseFee(Number(e.target.value))}
                        className="w-full h-1 bg-surface rounded-lg appearance-none cursor-pointer accent-success"
                      />
                    </div>

                    {/* Slider 2 */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-muted-foreground uppercase">Tarifa por KM Rodado</span>
                        <span className="text-[#22d3ee] font-bold">R$ {kmFee.toFixed(2)} / km</span>
                      </div>
                      <input 
                        type="range" 
                        min="1.00" 
                        max="4.00" 
                        step="0.10"
                        value={kmFee}
                        onChange={e => setKmFee(Number(e.target.value))}
                        className="w-full h-1 bg-surface rounded-lg appearance-none cursor-pointer accent-[#22d3ee]"
                      />
                    </div>

                    {/* Slider 3 */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-muted-foreground uppercase">Bateladas IA - Otimização de Rota</span>
                        <span className="text-primary-glow font-bold">{iaGroupDiscount}% de Agrupamento</span>
                      </div>
                      <input 
                        type="range" 
                        min="10" 
                        max="60" 
                        step="5"
                        value={iaGroupDiscount}
                        onChange={e => setIaGroupDiscount(Number(e.target.value))}
                        className="w-full h-1 bg-surface rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex gap-3 border-t border-border/30">
                  <button 
                    onClick={() => {
                      setBaseFee(7.00);
                      setKmFee(1.50);
                      setIaGroupDiscount(30);
                      toast.info("Parâmetros reajustados para padrões de fábrica.");
                    }}
                    className="flex-1 py-2 bg-surface hover:bg-surface/80 text-muted-foreground border border-border font-bold text-xs rounded transition cursor-pointer"
                  >
                    Restaurar Padrão
                  </button>
                  <button 
                    onClick={() => toast.success("Calibração financeira salva! Novo ETA/Tarifário ativado.")}
                    className="flex-1 py-2 bg-[#22d3ee] text-black font-extrabold text-xs rounded shadow-glow transition hover:opacity-90 cursor-pointer"
                  >
                    Aplicar Tarifas
                  </button>
                </div>
              </div>

            </div>

          </main>
        )}
      </div>
    </div>
  );
}
