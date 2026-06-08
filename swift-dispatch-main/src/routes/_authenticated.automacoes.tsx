import { OpsPage } from "@/components/ops/OpsPage";
import { OpsPageHeader } from "@/components/ops/OpsPageHeader";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTenant } from "@/hooks/useTenant";
import { useOps } from "@/hooks/useOps";
import { useI18n } from "@/hooks/useI18n";
import { 
  Zap, 
  Play, 
  Pause, 
  Plus, 
  Trash2, 
  Settings, 
  Activity, 
  Bot, 
  Sliders, 
  CheckCircle,
  MessageCircle,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  GitBranch,
  Network
} from "lucide-react";
import { toast } from "sonner";
import { IfoodIntegrationPanel } from "@/components/ops/IfoodIntegrationPanel";

export const Route = createFileRoute("/_authenticated/automacoes")({
  component: AutomationsPage,
});

type RuleNode = {
  id: string;
  type: "trigger" | "condition" | "action";
  label: string;
  detail: string;
  icon: any;
  color: string;
  x: number;
  y: number;
};

type RuleConnection = {
  from: string;
  to: string;
};

type Rule = {
  id: string;
  name: string;
  active: boolean;
  nodes: RuleNode[];
  connections: RuleConnection[];
  triggerCount: number;
};

function AutomationsPage() {
  const { current } = useTenant();
  const { t } = useI18n();
  const { tick, orders } = useOps();

  const [rules, setRules] = useState<Rule[]>([
    {
      id: "rule-1",
      name: "SLA Crítico - Mitigação de Caos",
      active: true,
      triggerCount: 14,
      nodes: [
        { id: "n1", type: "trigger", label: "SLA > 45min", detail: "Tempo limite de pedido estourado", icon: AlertTriangle, color: "oklch(0.65 0.24 25)", x: 50, y: 150 },
        { id: "n2", type: "condition", label: "IA Analisa Frota", detail: "Existe entregador ocioso?", icon: Bot, color: "oklch(0.72 0.22 280)", x: 260, y: 150 },
        { id: "n3", type: "action", label: "Aumentar Prioridade", detail: "Status: CRÍTICO", icon: Zap, color: "oklch(0.82 0.16 80)", x: 480, y: 50 },
        { id: "n4", type: "action", label: "Enviar WhatsApp", detail: "Cliente notificado", icon: MessageCircle, color: "oklch(0.74 0.17 155)", x: 480, y: 250 },
      ],
      connections: [
        { from: "n1", to: "n2" },
        { from: "n2", to: "n3" },
        { from: "n2", to: "n4" },
      ]
    },
    {
      id: "rule-2",
      name: "Zonas Congestionadas - Ajuste ETA",
      active: true,
      triggerCount: 8,
      nodes: [
        { id: "r2-n1", type: "trigger", label: "Tráfego > 70%", detail: "Saturação de tráfego detectada", icon: Activity, color: "oklch(0.65 0.24 25)", x: 50, y: 150 },
        { id: "r2-n2", type: "condition", label: "Região Crítica?", detail: "Moema ou Brooklin", icon: GitBranch, color: "oklch(0.72 0.22 280)", x: 260, y: 150 },
        { id: "r2-n3", type: "action", label: "Aumentar ETA +15m", detail: "Prazos ajustados automaticamente", icon: Sliders, color: "oklch(0.82 0.16 80)", x: 480, y: 50 },
        { id: "r2-n4", type: "action", label: "Pausar Bateladas", detail: "Bloquear agrupamentos na área", icon: Pause, color: "oklch(0.65 0.24 25)", x: 480, y: 250 },
      ],
      connections: [
        { from: "r2-n1", to: "r2-n2" },
        { from: "r2-n2", to: "r2-n3" },
        { from: "r2-n2", to: "r2-n4" },
      ]
    },
    {
      id: "rule-3",
      name: "Alerta de Entregador Ocioso",
      active: false,
      triggerCount: 0,
      nodes: [
        { id: "r3-n1", type: "trigger", label: "Ocioso > 10m", detail: "Entregador parado na rua", icon: AlertTriangle, color: "oklch(0.82 0.16 80)", x: 50, y: 150 },
        { id: "r3-n2", type: "action", label: "Sugerir Realocação", detail: "Redistribuir para zona quente", icon: Bot, color: "oklch(0.72 0.22 280)", x: 280, y: 150 },
        { id: "r3-n3", type: "action", label: "Notificar Manager", detail: "Push para a central militar", icon: Activity, color: "oklch(0.65 0.24 25)", x: 500, y: 150 },
      ],
      connections: [
        { from: "r3-n1", to: "r3-n2" },
        { from: "r3-n2", to: "r3-n3" },
      ]
    }
  ]);

  const [selectedRuleId, setSelectedRuleId] = useState<string>("rule-1");
  const [executionLogs, setExecutionLogs] = useState<string[]>([]);
  const [selectedNode, setSelectedNode] = useState<RuleNode | null>(null);
  const [pageTab, setPageTab] = useState<"regras" | "ifood">("regras");

  const selectedRule = rules.find(r => r.id === selectedRuleId) || rules[0];

  const handleToggleRule = (id: string) => {
    setRules(prev => prev.map(r => {
      if (r.id === id) {
        const nextState = !r.active;
        toast.success(`Automação '${r.name}' ${nextState ? "ATIVADA" : "DESATIVADA"}`);
        return { ...r, active: nextState };
      }
      return r;
    }));
  };

  const handleAddRule = () => {
    const newId = `rule-${Date.now()}`;
    const newRule: Rule = {
      id: newId,
      name: "Nova Automação Customizada",
      active: true,
      triggerCount: 0,
      nodes: [
        { id: "n1", type: "trigger", label: "Quando Pedido Atrasar", detail: "SLA estourado", icon: AlertTriangle, color: "oklch(0.65 0.24 25)", x: 50, y: 150 },
        { id: "n2", type: "action", label: "Alertar Central", detail: "Notificar painel", icon: Activity, color: "oklch(0.72 0.22 280)", x: 300, y: 150 }
      ],
      connections: [
        { from: "n1", to: "n2" }
      ]
    };
    setRules(prev => [...prev, newRule]);
    setSelectedRuleId(newId);
    toast.success("Nova regra de automação criada!");
  };

  const handleDeleteRule = (id: string) => {
    if (rules.length <= 1) {
      toast.error("Você deve manter pelo menos uma automação!");
      return;
    }
    setRules(prev => prev.filter(r => r.id !== id));
    setSelectedRuleId(rules[0].id);
    toast.success("Automação excluída com sucesso.");
  };
  return (
    <OpsPage className="ops-split-page !space-y-0">
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="segmented-control w-full sm:w-auto">
                <button
                  type="button"
                  data-active={pageTab === "regras"}
                  onClick={() => setPageTab("regras")}
                  className="segmented-item text-xs"
                >
                  Regras logísticas
                </button>
                <button
                  type="button"
                  data-active={pageTab === "ifood"}
                  onClick={() => setPageTab("ifood")}
                  className="segmented-item text-xs"
                >
                  Integração iFood
                </button>
              </div>
            </div>

            {pageTab === "ifood" && current?.id ? (
              <IfoodIntegrationPanel tenantId={current.id} />
            ) : null}

            {pageTab === "regras" ? (
              <>
            <div className="mb-4 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
              <strong>Modo demonstração:</strong> as regras abaixo são exemplos locais. Integrações
              reais (WhatsApp, iFood) estão na aba <strong>Integração iFood</strong> e no hub WhatsApp.
            </div>

            {/* Left Column: List of rules & live console logs */}
            <div className="lg:col-span-4 flex flex-col space-y-4 min-h-0 lg:h-full overflow-y-auto pr-0 lg:pr-1">
              
              <OpsPageHeader
                subtitle="Regras logísticas"
                title="Motor de"
                highlight="Automações"
                description="SE (condição logística) ENTÃO (ações inteligentes em tempo real)."
                className="pb-0 shrink-0"
              />

              {/* Automations list */}
              <div className="erp-card p-4 space-y-3">
                <div className="flex justify-between items-center border-b border-border/40 pb-2">
                  <span className="erp-section-label font-semibold text-foreground">
                    Automações ativas ({rules.length})
                  </span>
                  <button 
                    onClick={handleAddRule}
                    className="p-1 rounded bg-primary/20 text-primary-glow hover:bg-primary/30 transition text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="size-3" /> Criar
                  </button>
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {rules.map(r => (
                    <div 
                      key={r.id} 
                      onClick={() => setSelectedRuleId(r.id)}
                      className={`p-3 rounded-xl border flex flex-col justify-between transition cursor-pointer relative ${
                        selectedRuleId === r.id 
                          ? "bg-primary/10 border-primary/45 shadow-glow" 
                          : "bg-surface/30 border-border/40 hover:bg-surface/50 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-xs font-semibold text-foreground leading-snug">{r.name}</h4>
                          <span className="erp-meta mt-1 block">
                            {r.nodes.length} nós · {r.triggerCount} ativações
                          </span>
                        </div>
                        
                        {/* Slide Toggle Switch */}
                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => handleToggleRule(r.id)}
                            className={`w-8 h-4.5 rounded-full p-0.5 transition duration-300 focus:outline-none ${
                              r.active ? "bg-success" : "bg-muted"
                            }`}
                          >
                            <div className={`size-3.5 bg-black rounded-full shadow transition duration-300 transform ${
                              r.active ? "translate-x-3.5" : "translate-x-0"
                            }`} />
                          </button>
                          
                          <button 
                            onClick={() => handleDeleteRule(r.id)}
                            className="text-muted-foreground hover:text-danger transition p-1"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Execution Realtime Console Logs */}
              <div className="erp-card p-4 flex-1 flex flex-col min-h-[220px]">
                <div className="border-b border-border/40 pb-2 flex items-center justify-between shrink-0">
                  <span className="erp-section-label font-semibold text-foreground flex items-center gap-1.5">
                    <Activity className="size-3 text-accent animate-pulse" />
                    Console de Execução Live
                  </span>
                  <span className="erp-meta">Autopilot: Ativo</span>
                </div>
                
                <div className="flex-1 overflow-y-auto font-mono text-[9px] text-[#22c55e]/90 space-y-2 mt-3 pr-1 bg-black/60 p-3 rounded-lg border border-border/40">
                  {executionLogs.length === 0 ? (
                    <div className="text-muted-foreground text-center py-10 uppercase">
                      Nenhuma execução registrada. As regras ativas dispararão logs quando integradas.
                    </div>
                  ) : (
                    executionLogs.map((log, idx) => (
                      <div key={idx} className="leading-relaxed border-b border-white/[0.03] pb-1 animate-in fade-in duration-200">
                        {log}
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* Right Column: Visual Editor Canvas Workspace & Config */}
            <div className="lg:col-span-8 flex flex-col space-y-4 min-h-[280px] lg:min-h-0 lg:h-full overflow-hidden">
              
              {/* Canvas Board panel wrapper */}
              <div className="erp-card flex-1 relative overflow-hidden flex flex-col">
                <div className="bg-muted px-4 py-3 border-b border-border/60 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <Network className="size-4 text-primary-glow" />
                    <div>
                      <h3 className="text-xs font-semibold text-foreground uppercase font-mono">{selectedRule.name}</h3>
                      <p className="text-[9px] text-muted-foreground leading-none">BUILDER INTERATIVO DE FLUXO PREDITIVO</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="flex h-2 w-2 relative">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${selectedRule.active ? "bg-success" : "bg-muted"}`}></span>
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${selectedRule.active ? "bg-success" : "bg-muted"}`}></span>
                    </span>
                    <span className="font-mono text-muted-foreground">{selectedRule.active ? "CONECTADO LIVE" : "PAUSADO"}</span>
                  </div>
                </div>

                {/* SVG Connections & Visual Nodes Canvas */}
                <div className="flex-1 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-950 via-[#07090d] to-[#07090d] relative overflow-auto p-8 select-none">
                  {/* Grid background mesh overlay */}
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,_transparent_1px),_linear-gradient(90deg,_rgba(255,255,255,0.02)_1px,_transparent_1px)] bg-[size:20px_20px] pointer-events-none" />

                  {/* Draw beautiful glow svg lines between connected nodes */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                    <defs>
                      <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.8" />
                      </linearGradient>
                      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                    </defs>

                    {selectedRule.connections.map((c, i) => {
                      const fromNode = selectedRule.nodes.find(n => n.id === c.from);
                      const toNode = selectedRule.nodes.find(n => n.id === c.to);
                      if (!fromNode || !toNode) return null;

                      // Calculate connection points (middle right of 'from' to middle left of 'to')
                      const x1 = fromNode.x + 180;
                      const y1 = fromNode.y + 40;
                      const x2 = toNode.x;
                      const y2 = toNode.y + 40;

                      // Control points for curvy cubic bezier paths
                      const dx = Math.abs(x2 - x1) * 0.5;
                      const cx1 = x1 + dx;
                      const cy1 = y1;
                      const cx2 = x2 - dx;
                      const cy2 = y2;

                      return (
                        <g key={i}>
                          {/* Glowing background stroke */}
                          <path
                            d={`M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`}
                            fill="none"
                            stroke="url(#line-gradient)"
                            strokeWidth={4}
                            opacity={0.3}
                            filter="url(#glow)"
                            className={selectedRule.active ? "animate-pulse" : ""}
                          />
                          {/* Main stroke line */}
                          <path
                            d={`M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`}
                            fill="none"
                            stroke="url(#line-gradient)"
                            strokeWidth={2}
                          />
                        </g>
                      );
                    })}
                  </svg>

                  {/* Render Visual Nodes */}
                  {selectedRule.nodes.map(n => {
                    const NodeIcon = n.icon;
                    const isSelected = selectedNode?.id === n.id;
                    return (
                      <div
                        key={n.id}
                        onClick={() => setSelectedNode(n)}
                        style={{ left: n.x, top: n.y }}
                        className={`absolute w-[180px] h-[80px] rounded-xl border p-3 flex flex-col justify-between transition cursor-pointer z-10 glass ${
                          isSelected 
                            ? "border-primary-glow shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)] bg-primary/5" 
                            : "border-border hover:border-border-strong hover:bg-white/[0.02]"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div 
                            style={{ backgroundColor: n.color + "15", border: `1px solid ${n.color}40`, color: n.color }} 
                            className="size-7 rounded-lg flex items-center justify-center shrink-0"
                          >
                            <NodeIcon className="size-4" />
                          </div>
                          <div className="overflow-hidden">
                            <span className="text-[8px] uppercase tracking-wider text-muted-foreground font-mono block leading-none">{n.type}</span>
                            <span className="text-[10px] font-semibold text-foreground block leading-tight truncate mt-0.5">{n.label}</span>
                          </div>
                        </div>

                        <p className="text-[9px] text-muted-foreground truncate font-mono block">{n.detail}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Bottom telemetry instructions */}
                <div className="erp-card px-4 py-2 border-t border-border/40 text-[9px] text-muted-foreground font-mono flex justify-between items-center shrink-0">
                  <span>CLIQUE EM UM NÓ PARA EDITAR REGRAS OU CRIAR CONEXÕES</span>
                  <span>SLA ENGINE INTEGRATION V4.2</span>
                </div>
              </div>

              {/* Node Config Editor Panel */}
              <div className="erp-card p-5 shrink-0 space-y-4">
                <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                  <Settings className="size-4 text-primary-glow" />
                  <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    {selectedNode ? `Configuração do Nó: ${selectedNode.label}` : "Configurador de Nó de Regra"}
                  </h3>
                </div>

                {selectedNode ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                    <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground font-semibold">Título do Nó</span>
                      <input 
                        type="text" 
                        value={selectedNode.label} 
                        onChange={e => {
                          const val = e.target.value;
                          setRules(prev => prev.map(r => r.id === selectedRule.id ? {
                            ...r,
                            nodes: r.nodes.map(node => node.id === selectedNode.id ? { ...node, label: val } : node)
                          } : r));
                          setSelectedNode(prev => prev ? { ...prev, label: val } : null);
                        }}
                        className="w-full p-2 bg-surface border border-border rounded-lg text-foreground font-mono" 
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground font-semibold">Parâmetro de Limiar / Ação</span>
                      <input 
                        type="text" 
                        value={selectedNode.detail} 
                        onChange={e => {
                          const val = e.target.value;
                          setRules(prev => prev.map(r => r.id === selectedRule.id ? {
                            ...r,
                            nodes: r.nodes.map(node => node.id === selectedNode.id ? { ...node, detail: val } : node)
                          } : r));
                          setSelectedNode(prev => prev ? { ...prev, detail: val } : null);
                        }}
                        className="w-full p-2 bg-surface border border-border rounded-lg text-foreground font-mono" 
                      />
                    </div>

                    <div className="flex items-end gap-2">
                      <button 
                        onClick={() => {
                          setSelectedNode(null);
                          toast.success("Nó reajustado com sucesso!");
                        }}
                        className="w-full py-2 bg-primary text-primary-foreground font-bold text-xs rounded transition hover:opacity-90 cursor-pointer"
                      >
                        Salvar Nó
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground py-2 text-center">
                    Selecione qualquer nó na tela acima para visualizar ou editar parâmetros de limiar.
                  </div>
                )}
              </div>

            </div>
              </>
            ) : null}
    </OpsPage>
  );
}
