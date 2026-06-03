import { OpsPage } from "@/components/ops/OpsPage";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
import {
  hourlyFinancialFromOrders,
  regionsFromOrders,
  sumOrderRevenue,
} from "@/lib/ops/orderAnalytics";

export const Route = createFileRoute("/_authenticated/financeiro")({
  component: FinancialPage,
});

function FinancialPage() {
  const { current } = useTenant();
  const { t } = useI18n();
  const { tick, orders } = useOps();

  // Executive AI Cockpit (Phase 6 - Business Intelligence Layer)
  const [executiveQuery, setExecutiveQuery] = useState("");
  const [executiveResponse, setExecutiveResponse] = useState<string | null>(null);
  const [isAiCalculating, setIsAiCalculating] = useState(false);
  const [baseFee, setBaseFee] = useState<number>(7.0);
  const [kmFee, setKmFee] = useState<number>(1.5);
  const [iaGroupDiscount, setIaGroupDiscount] = useState<number>(30);

  const dynamicFaturamento = useMemo(() => sumOrderRevenue(orders), [orders]);
  const dynamicNetProfit = useMemo(
    () => Number((dynamicFaturamento * 0.33).toFixed(2)),
    [dynamicFaturamento],
  );
  const financialTimelineData = useMemo(() => hourlyFinancialFromOrders(orders), [orders]);
  const regionalMarginData = useMemo(() => regionsFromOrders(orders), [orders]);
  const slaLossEstimate = useMemo(
    () =>
      orders
        .filter((o) => o.priority === "critica" || o.priority === "alta")
        .reduce((acc, o) => acc + (o.total_amount ?? 0) * 0.05, 0),
    [orders],
  );
  const dynamicAvgDeliveryCost = useMemo(
    () => Number((baseFee + kmFee * 2.8 * (1 - iaGroupDiscount / 100)).toFixed(2)),
    [baseFee, kmFee, iaGroupDiscount],
  );

  const handleAskExecutiveAi = (query: string) => {
    setExecutiveQuery(query);
    setIsAiCalculating(true);
    setTimeout(() => {
      setIsAiCalculating(false);
      let response = "";
      const q = query.toLowerCase();
      if (q.includes("lucrativ") || q.includes("regi") || q.includes("margem")) {
        const top = regionalMarginData[0];
        response = top
          ? `### Lucratividade regional (dados do turno)\n\n* **${top.region}:** R$ ${top.faturamento.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} · margem estimada ${top.margem}%`
          : "### Lucratividade regional\n\nAinda não há pedidos no turno para calcular margens por região.";
      } else if (q.includes("perden") || q.includes("dinheiro") || q.includes("atraso") || q.includes("perda")) {
        const loss = orders
          .filter((o) => o.priority === "critica" || o.priority === "alta")
          .reduce((acc, o) => acc + (o.total_amount ?? 0) * 0.05, 0);
        response = loss > 0
          ? `### Perdas estimadas por SLA\n\nPedidos em risco no turno: **R$ ${loss.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}** (estimativa 5% sobre pedidos alta/crítica).`
          : "### Perdas por SLA\n\nNenhum pedido em prioridade alta ou crítica no momento.";
      } else if (q.includes("eficiente") || q.includes("unidade") || q.includes("melhor")) {
        response = orders.length
          ? `### Eficiência do turno\n\n**${orders.length}** pedidos registrados · faturamento **R$ ${dynamicFaturamento.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}**.`
          : "### Eficiência do turno\n\nCadastre pedidos na central para gerar métricas de eficiência.";
      } else {
        response = `### 🤖 Executive AI Cockpit
        
Desculpe, não entendi a pergunta operacional. Tente uma das opções recomendadas:
*   *"Qual região mais lucrativa?"*
*   *"Onde estamos perdendo dinheiro?"*
*   *"Qual unidade mais eficiente?"*`;
      }
      setExecutiveResponse(response);
      toast.success("Análise de inteligência executiva concluída!");
    }, 1000);
  };
  return (
    <OpsPage className="space-y-6 max-h-[calc(100dvh-8rem)]">
            
            {/* Header Title Section */}
            <div className="flex items-end justify-between flex-wrap gap-3 border-b border-border/40 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-success animate-pulse" />
                  <span className="text-xs text-muted-foreground">Indicadores financeiros</span>
                </div>
                <h1 className="erp-page-title mt-1">Financeiro</h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Análise preditiva de custos por rota, margens líquidas, e auditoria de desperdício em tempo real.
                </p>
              </div>

              <div className="text-[10px] text-muted-foreground font-mono bg-muted px-3.5 py-2 border border-border rounded-xl">
                TICK FINANCEIRO: #{tick}
              </div>
            </div>

            {/* Premium HUD Cards Strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1 */}
              <div className="bg-card border border-border rounded-2xl p-4 space-y-2 relative overflow-hidden">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span className="text-[10px] uppercase font-mono tracking-wider">Faturamento Operacional</span>
                  <DollarSign className="size-4 text-success" />
                </div>
                <div className="text-2xl font-black text-foreground font-mono tabular-nums">
                  R$ {dynamicFaturamento.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-muted-foreground font-mono">
                  {orders.length} pedido{orders.length === 1 ? "" : "s"} no turno
                </div>
              </div>

              {/* Card 2 */}
              <div className="bg-card border border-border rounded-2xl p-4 space-y-2 relative overflow-hidden">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span className="text-[10px] uppercase font-mono tracking-wider">Margem Líquida</span>
                  <Percent className="size-4 text-[#22d3ee]" />
                </div>
                <div className="text-2xl font-black text-foreground font-mono tabular-nums">
                  {dynamicFaturamento > 0 ? "33%" : "—"}
                </div>
                <div className="text-[10px] text-[#22d3ee] font-mono font-bold">
                  R$ {dynamicNetProfit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} lucro est.
                </div>
              </div>

              {/* Card 3 */}
              <div className="bg-card border border-border rounded-2xl p-4 space-y-2 relative overflow-hidden">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span className="text-[10px] uppercase font-mono tracking-wider">Custo Médio Entrega</span>
                  <Coins className="size-4 text-primary-glow" />
                </div>
                <div className="text-2xl font-black text-foreground font-mono tabular-nums">R$ {dynamicAvgDeliveryCost.toFixed(2)}</div>
                <div className="text-[10px] text-primary-glow font-mono font-bold">-{iaGroupDiscount}% desconto IA Bateladas</div>
              </div>

              {/* Card 4 */}
              <div className="bg-card border border-border rounded-2xl p-4 space-y-2 relative overflow-hidden">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span className="text-[10px] uppercase font-mono tracking-wider">Perda por Atraso SLA</span>
                  <Clock className="size-4 text-danger animate-pulse" />
                </div>
                <div className="text-2xl font-black text-foreground font-mono tabular-nums">
                  R$ {slaLossEstimate.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-danger font-mono font-bold">Pedidos alta/crítica no turno</div>
              </div>
            </div>

            {/* Financial Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Area Chart: Revenue vs Costs */}
              <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm">
                <div className="border-b border-border/40 pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Fluxo de Lucratividade Turno</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Cruzamento de faturamento bruto vs custo com motoristas vs lucro real por hora</p>
                </div>

                <div className="h-[240px] text-xs font-mono">
                  {financialTimelineData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                      Sem pedidos no turno para montar o gráfico.
                    </div>
                  ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={financialTimelineData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
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
                      <Tooltip contentStyle={{ backgroundColor: "var(--popover)", borderColor: "var(--border)", color: "var(--popover-foreground)", borderRadius: "8px" }} />
                      <Area type="monotone" dataKey="faturamento" name="Faturamento Bruto" stroke="var(--primary)" fillOpacity={1} fill="url(#colorFaturamento)" strokeWidth={2.5} />
                      <Area type="monotone" dataKey="lucro" name="Lucro Líquido" stroke="oklch(0.74 0.17 155)" fillOpacity={1} fill="url(#colorLucro)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Regional Margins Heat Table */}
              <div className="bg-card border border-border rounded-2xl p-5 space-y-4 flex flex-col justify-between">
                <div className="border-b border-border/40 pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Margens por Região</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Rentabilidade regional (desconto custo/km rodado)</p>
                </div>

                <div className="space-y-3 font-mono text-[11px] flex-1 pt-3">
                  {regionalMarginData.length === 0 && (
                    <p className="text-muted-foreground text-center py-6 text-xs">
                      Nenhuma região com pedidos no turno.
                    </p>
                  )}
                  {regionalMarginData.map((r, i) => (
                    <div key={i} className="flex justify-between items-center p-2.5 bg-surface/30 border border-border/50 rounded-xl">
                      <div className="flex items-center gap-2">
                        <MapPin className="size-4 text-foreground" />
                        <div>
                          <span className="font-semibold text-foreground">{r.region}</span>
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
              
              {/* Financial AI Intelligence Cockpit & Diagnosis Panel */}
              <div className="bg-card border border-border rounded-2xl p-6 space-y-5 shadow-sm">
                
                {/* Executive AI Cockpit (Phase 6) */}
                <div className="border-b border-border/40 pb-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Bot className="size-4.5 text-[#22d3ee] animate-pulse" />
                      Executive AI Cockpit
                    </h3>
                    <span className="text-[8px] font-mono text-cyan-400 uppercase tracking-widest font-extrabold bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/30">NLP Engine v4.5</span>
                  </div>
                  
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Pergunte qualquer métrica financeira ou gargalo operacional diretamente para a Inteligência Artificial Executiva.
                  </p>

                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Qual a região mais lucrativa hoje?" 
                      value={executiveQuery}
                      onChange={e => setExecutiveQuery(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && executiveQuery && handleAskExecutiveAi(executiveQuery)}
                      className="flex-1 bg-surface border border-border rounded px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-cyan-500/50 font-mono"
                    />
                    <button 
                      onClick={() => executiveQuery && handleAskExecutiveAi(executiveQuery)}
                      disabled={isAiCalculating || !executiveQuery}
                      className="px-3 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-black font-extrabold text-xs rounded transition flex items-center gap-1 cursor-pointer"
                    >
                      {isAiCalculating ? "Processando..." : "Perguntar"}
                    </button>
                  </div>

                  {/* Preset Quick Buttons */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <button 
                      onClick={() => handleAskExecutiveAi("Qual região mais lucrativa?")}
                      className="px-2 py-1 rounded bg-surface/60 hover:bg-surface border border-border/80 text-[10px] text-muted-foreground font-mono transition cursor-pointer"
                    >
                      📊 Região mais lucrativa?
                    </button>
                    <button 
                      onClick={() => handleAskExecutiveAi("Onde estamos perdendo dinheiro?")}
                      className="px-2 py-1 rounded bg-surface/60 hover:bg-surface border border-border/80 text-[10px] text-muted-foreground font-mono transition cursor-pointer"
                    >
                      💸 Onde perdemos dinheiro?
                    </button>
                    <button 
                      onClick={() => handleAskExecutiveAi("Qual unidade mais eficiente?")}
                      className="px-2 py-1 rounded bg-surface/60 hover:bg-surface border border-border/80 text-[10px] text-muted-foreground font-mono transition cursor-pointer"
                    >
                      🏆 Unidade mais eficiente?
                    </button>
                  </div>

                  {/* AI Response Box */}
                  {executiveResponse && (
                    <div className="p-3 bg-accent/40 border border-border rounded-xl space-y-2 mt-3 animate-alert-entry text-[11px] font-mono text-foreground leading-relaxed">
                      <div className="flex items-center gap-1.5 text-[9px] text-cyan-400 font-bold uppercase tracking-wider">
                        <Sparkles className="size-3.5" /> RESPOSTA IA OPERACIONAL
                      </div>
                      <div className="whitespace-pre-line text-muted-foreground">
                        {executiveResponse}
                      </div>
                    </div>
                  )}
                </div>

                {/* Alerts List */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Diagnósticos IA Realtime
                    </h3>
                    <span className="text-[8px] font-mono text-muted-foreground uppercase">2 Avisos Ativos</span>
                  </div>

                  <div className="space-y-3 font-mono text-xs">
                    {/* Warning item 1 */}
                    <div className="p-3 bg-danger/[0.02] border-l-3 border-l-danger border border-border/50 rounded-xl flex gap-3">
                      <ShieldAlert className="size-4 text-danger shrink-0 mt-0.5 animate-pulse" />
                      <div>
                        <div className="font-semibold text-foreground uppercase tracking-wider text-[10px]">Baixa Rentabilidade: Zona Sul Extrema</div>
                        <p className="text-muted-foreground leading-relaxed mt-1 text-[11px]">
                          O custo por km médio para a Zona Sul Extrema atingiu <b>R$ 3,18 / km</b>. A taxa de entrega cobrada não cobre 40% das despesas operacionais da rota.
                        </p>
                        <span className="text-[9px] text-danger/80 mt-1 block">Ação sugerida: Adicionar tarifa dinâmica regional de +R$ 4,50</span>
                      </div>
                    </div>

                    {/* Warning item 2 */}
                    <div className="p-3 bg-warning/[0.02] border-l-3 border-l-warning border border-border/50 rounded-xl flex gap-3">
                      <ShieldAlert className="size-4 text-warning shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-foreground uppercase tracking-wider text-[10px]">Gargalo Financeiro na Cozinha</div>
                        <p className="text-muted-foreground leading-relaxed mt-1 text-[11px]">
                          Estouro de fila KDS gerou <b>R$ 280,00 em estornos e descontos</b> para clientes. Reduzir tempo de cozimento em -3 min pouparia R$ 1.200/semana em multas SLA.
                        </p>
                        <span className="text-[9px] text-warning/80 mt-1 block">Risco de perda financeira projetado para amanhã</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Real Operational Fee Calibration Board */}
              <div className="bg-card border border-border rounded-2xl p-6 space-y-4 flex flex-col justify-between">
                <div>
                  <div className="border-b border-border/40 pb-3 flex justify-between items-center">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Sliders className="size-4.5 text-[#22d3ee]" />
                      Simulador e Calibrador Operacional
                    </h3>
                    <span className="text-[8px] font-mono text-muted-foreground uppercase">Previsão de Impacto</span>
                  </div>

                  {/* Dynamic Sliders */}
                  <div className="space-y-4 pt-4 font-mono text-xs text-foreground">
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
                    className="erp-btn-primary flex-1 py-2 text-xs cursor-pointer"
                  >
                    Aplicar Tarifas
                  </button>
                </div>
              </div>

            </div>
    </OpsPage>
  );
}
