import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { OpsSidebar } from "@/components/ops/Sidebar";
import { OpsHeader } from "@/components/ops/Header";
import { Onboarding } from "@/components/ops/Onboarding";
import { useTenant } from "@/hooks/useTenant";
import { useOps } from "@/hooks/useOps";
import { useI18n } from "@/hooks/useI18n";
import { 
  MessageSquare, 
  Send, 
  Settings, 
  Link2, 
  CheckCircle, 
  QrCode, 
  AlertTriangle,
  Clock,
  Sparkles,
  Bot,
  User,
  Coffee,
  HelpCircle,
  Play,
  RotateCcw
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/whatsapp")({
  component: WhatsappHubPage,
});

type MessageLog = {
  id: string;
  timestamp: string;
  recipient: string;
  type: "cliente" | "entregador" | "gerente";
  content: string;
  status: "sent" | "failed" | "pending";
};

function WhatsappHubPage() {
  const { current, loading } = useTenant();
  const { t } = useI18n();
  const { orders, tick } = useOps();
  const [activeTab, setActiveTab] = useState<"api" | "templates" | "logs">("logs");
  const [selectedApi, setSelectedApi] = useState<"evolution" | "zapi" | "cloud">("evolution");
  const [logs, setLogs] = useState<MessageLog[]>([]);

  // Simple local templates state
  const [templates, setTemplates] = useState({
    cliente_confirmado: "Olá {{cliente}}, seu pedido {{pedido}} foi confirmado e já está na cozinha! A estimativa de entrega é de {{eta}} minutos. Acompanhe em tempo real pelo link: {{link_rastreio}}",
    cliente_preparo: "Excelente notícia, {{cliente}}! Seu pedido {{pedido}} está sendo preparado com muito carinho na chapa! 👨‍🍳🔥",
    cliente_despachado: "🚀 Saiu para entrega! O motoboy {{entregador}} já retirou seu pedido {{pedido}} e está a caminho da sua residência. ETA de chegada: {{eta}} min.",
    entregador_nova_rota: "🏍️ NOVA ROTA: Olá {{entregador}}, você foi designado para uma nova rota! Região: {{bairro}} com {{pedidos_qtde}} entregas otimizadas.",
    gerente_alerta: "🚨 ATENÇÃO OPERACIONAL: Risco crítico de SLA no pedido {{pedido}}! Cozinha lenta no preparo há mais de 25 minutos."
  });

  // Track status changes in global orders to simulate real-time message triggers!
  const previousOrdersRef = useEffect(() => {
    if (orders.length === 0) return;
    
    // Find if any order status changed
    const stored = localStorage.getItem("prev_whatsapp_orders");
    if (!stored) {
      localStorage.setItem("prev_whatsapp_orders", JSON.stringify(orders.map(o => ({ id: o.id, status: o.status }))));
      return;
    }

    const prevList = JSON.parse(stored) as Array<{ id: string; status: string }>;
    const prevMap = new Map(prevList.map(p => [p.id, p.status]));

    orders.forEach(o => {
      const prevStatus = prevMap.get(o.id);
      if (prevStatus && prevStatus !== o.status) {
        // Trigger a simulated WhatsApp message based on new status!
        let content = "";
        let recipient = o.customer_name;
        let type: "cliente" | "entregador" | "gerente" = "cliente";

        if (o.status === "em_preparo") {
          content = templates.cliente_preparo.replace("{{cliente}}", o.customer_name).replace("{{pedido}}", o.code);
        } else if (o.status === "pronto") {
          const trackingLink =
            typeof window !== "undefined" && o.tracking_token
              ? `${window.location.origin}/rastreio/${o.id}/${o.tracking_token}`
              : `/rastreio/${o.id}/${o.tracking_token ?? ""}`;
          content = templates.cliente_confirmado
            .replace("{{cliente}}", o.customer_name)
            .replace("{{pedido}}", o.code)
            .replace("{{eta}}", "35")
            .replace("{{link_rastreio}}", trackingLink);
        } else if (o.status === "em_rota_coleta") {
          content = templates.entregador_nova_rota.replace("{{entregador}}", "Rafa").replace("{{bairro}}", o.address.split(",")[0]).replace("{{pedidos_qtde}}", "1");
          recipient = "Entregador Rafa (#E-14)";
          type = "entregador";
        } else if (o.status === "em_rota_entrega") {
          content = templates.cliente_despachado.replace("{{cliente}}", o.customer_name).replace("{{pedido}}", o.code).replace("{{entregador}}", "Rafa").replace("{{eta}}", "12");
        }

        if (content) {
          const newLog: MessageLog = {
            id: `msg-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString("pt-BR"),
            recipient,
            type,
            content,
            status: "sent"
          };
          setLogs(prev => [newLog, ...prev].slice(0, 30));
          toast.success(`WhatsApp enviado: ${recipient} (${o.code})`, {
            icon: "💬"
          });
        }
      }
    });

    localStorage.setItem("prev_whatsapp_orders", JSON.stringify(orders.map(o => ({ id: o.id, status: o.status }))));
  }, [orders]);

  // Seed initial mock logs on mount
  useEffect(() => {
    const initialLogs: MessageLog[] = [
      {
        id: "msg-1",
        timestamp: "16:15:23",
        recipient: "Ana Silva (+5511987654321)",
        type: "cliente",
        content: "Olá Ana Silva, seu pedido #4820 foi confirmado e já está na cozinha! A estimativa de entrega é de 35 minutos.",
        status: "sent"
      },
      {
        id: "msg-2",
        timestamp: "16:14:02",
        recipient: "Entregador Tito (+5511932109876)",
        type: "entregador",
        content: "🏍️ NOVA ROTA: Olá #E-08 Tito, você foi designado para uma nova rota! Região: Itaim Bibi com 2 entregas otimizadas.",
        status: "sent"
      },
      {
        id: "msg-3",
        timestamp: "16:11:45",
        recipient: "Gerente Guilherme (+5511999998888)",
        type: "gerente",
        content: "🚨 ATENÇÃO OPERACIONAL: Risco crítico de SLA no pedido #4831! Cozinha lenta no preparo há mais de 25 minutos.",
        status: "sent"
      },
      {
        id: "msg-4",
        timestamp: "16:09:12",
        recipient: "Bruno Melo (+5511976543210)",
        type: "cliente",
        content: "Excelente notícia, Bruno Melo! Seu pedido #4821 está sendo preparado com muito carinho na chapa! 👨‍🍳🔥",
        status: "sent"
      }
    ];
    setLogs(initialLogs);
  }, []);

  const triggerManualTest = () => {
    const testLog: MessageLog = {
      id: `msg-manual-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString("pt-BR"),
      recipient: "Cliente de Teste (+5511999999999)",
      type: "cliente",
      content: "Olá, este é um disparo de teste operacional simulando a conexão WhatsApp Evolution API de alta performance!",
      status: "sent"
    };
    setLogs(prev => [testLog, ...prev]);
    toast.success("Mensagem de teste disparada com sucesso!", {
      icon: "⚡"
    });
  };

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
          <main className="flex-1 p-4 lg:p-6 space-y-6 overflow-y-auto">
            {/* Header portion */}
            <div className="flex items-center justify-between flex-wrap gap-4 border-b border-border/40 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-success animate-pulse" />
                  <span className="text-[10px] uppercase font-mono tracking-widest text-success font-bold font-mono">AUTOMATION CONTROLLER</span>
                </div>
                <h1 className="text-2xl lg:text-3xl font-display font-semibold mt-1 text-white">
                  WhatsApp <span className="text-gradient">Operation Hub</span>
                </h1>
              </div>

              {/* Action tabs selectors */}
              <div className="flex items-center gap-2 bg-[#0f1219] p-1 border border-border rounded-xl">
                <button
                  onClick={() => setActiveTab("logs")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    activeTab === "logs" ? "bg-primary/20 text-primary-glow font-bold" : "text-muted-foreground hover:text-white"
                  }`}
                >
                  Logs de Disparo
                </button>
                <button
                  onClick={() => setActiveTab("templates")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    activeTab === "templates" ? "bg-primary/20 text-primary-glow font-bold" : "text-muted-foreground hover:text-white"
                  }`}
                >
                  Templates IA
                </button>
                <button
                  onClick={() => setActiveTab("api")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    activeTab === "api" ? "bg-primary/20 text-primary-glow font-bold" : "text-muted-foreground hover:text-white"
                  }`}
                >
                  Conexão API
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#0b0e14] border border-border/60 rounded-2xl p-4 flex items-center gap-3">
                <div className="size-9 rounded-lg bg-success/10 flex items-center justify-center text-success">
                  <CheckCircle className="size-5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-mono text-muted-foreground">Status do Gateway</div>
                  <div className="text-sm font-bold text-success font-mono mt-0.5">ONLINE (Z-API)</div>
                </div>
              </div>

              <div className="bg-[#0b0e14] border border-border/60 rounded-2xl p-4 flex items-center gap-3">
                <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary-glow">
                  <MessageSquare className="size-5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-mono text-muted-foreground">Disparos no Turno</div>
                  <div className="text-sm font-bold text-white font-mono mt-0.5">{logs.length + 114} envios</div>
                </div>
              </div>

              <div className="bg-[#0b0e14] border border-border/60 rounded-2xl p-4 flex items-center gap-3">
                <div className="size-9 rounded-lg bg-indigo-500/10 flex items-center justify-center text-primary-glow">
                  <Clock className="size-5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-mono text-muted-foreground">Latência Média</div>
                  <div className="text-sm font-bold text-white font-mono mt-0.5">180 ms</div>
                </div>
              </div>

              <div className="bg-[#0b0e14] border border-border/60 rounded-2xl p-4 flex items-center gap-3">
                <div className="size-9 rounded-lg bg-warning/10 flex items-center justify-center text-warning">
                  <Bot className="size-5 text-warning" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-mono text-muted-foreground">IA Autopilot</div>
                  <div className="text-sm font-bold text-white font-mono mt-0.5">ATIVO (98.2% acc)</div>
                </div>
              </div>
            </div>

            {/* Subpages Container */}
            {activeTab === "logs" && (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                
                {/* Real-time message logs dashboard feed */}
                <div className="xl:col-span-2 bg-[#0b0e14] border border-border rounded-2xl p-5 space-y-4 shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
                  <div className="flex justify-between items-center border-b border-border/40 pb-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                      <Clock className="size-4 text-primary-glow" />
                      Log de Automações Realtime
                    </h3>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          setLogs([]); 
                          toast.info("Logs limpos.");
                        }}
                        className="p-1 px-2.5 rounded border border-border hover:bg-surface text-[10px] font-mono text-muted-foreground hover:text-white transition"
                        title="Limpar Feed"
                      >
                        [ LIMPAR FEED ]
                      </button>
                      <button
                        onClick={triggerManualTest}
                        className="px-3 py-1 bg-gradient-to-r from-success to-emerald-500 hover:opacity-90 text-black font-extrabold text-[10px] rounded tracking-wider uppercase transition flex items-center gap-1 cursor-pointer"
                      >
                        <Send className="size-3" />
                        Disparo Teste
                      </button>
                    </div>
                  </div>

                  {/* Logs stream flow feed */}
                  <div className="space-y-3.5 max-h-[460px] overflow-y-auto pr-1">
                    {logs.map((log) => (
                      <div 
                        key={log.id} 
                        className="p-3.5 bg-surface/30 border border-border/60 hover:border-border rounded-xl flex items-start justify-between gap-4 font-mono text-[11px] animate-in slide-in-from-top-3 duration-250 relative overflow-hidden"
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] text-muted-foreground bg-[#10141f] border border-border px-1.5 py-0.2 rounded font-sans">{log.timestamp}</span>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.2 rounded font-sans ${
                              log.type === "cliente" ? "bg-primary/10 text-primary-glow border border-primary/20" :
                              log.type === "entregador" ? "bg-accent/10 text-accent border border-accent/20" :
                              "bg-danger/10 text-danger border border-danger/20"
                            }`}>
                              {log.type}
                            </span>
                            <span className="text-white/80 font-bold font-sans">Destinatário: {log.recipient}</span>
                          </div>

                          <p className="text-muted-foreground leading-relaxed text-xs font-sans whitespace-pre-wrap">{log.content}</p>
                        </div>

                        {/* Status Checkmark */}
                        <div className="text-right shrink-0 mt-0.5">
                          <span className="text-success font-sans font-bold flex items-center gap-1 text-[10px] bg-success/10 border border-success/15 px-2 py-0.5 rounded uppercase">
                            <CheckCircle className="size-3" />
                            ENVIADO
                          </span>
                        </div>
                      </div>
                    ))}

                    {logs.length === 0 && (
                      <div className="py-16 text-center space-y-3">
                        <MessageSquare className="size-8 mx-auto text-muted-foreground/30" />
                        <p className="text-xs text-muted-foreground font-mono uppercase">Aguardando novos eventos simulados na cozinha ou logística...</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sidebar details: Future API connections previews */}
                <div className="space-y-6">
                  <div className="bg-[#0b0e14] border border-border rounded-2xl p-5 space-y-4">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Link2 className="size-4 text-primary-glow" />
                      Status das APIs Integradas
                    </h3>
                    
                    <div className="space-y-3">
                      {/* Evolution API */}
                      <div className="p-3.5 bg-surface/30 border border-border rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="size-8 rounded bg-[#10141f] border border-border flex items-center justify-center font-bold text-[10px] text-white">EV</div>
                          <div>
                            <span className="text-xs font-bold text-white">Evolution API</span>
                            <span className="block text-[8px] text-muted-foreground font-mono uppercase mt-0.5">V2.4 · Cloud Docker</span>
                          </div>
                        </div>
                        <span className="text-[9px] font-mono font-bold text-success bg-success/10 border border-success/20 px-2 py-0.5 rounded">CONNECTED ✓</span>
                      </div>

                      {/* Z-API */}
                      <div className="p-3.5 bg-surface/30 border border-border rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="size-8 rounded bg-[#10141f] border border-border flex items-center justify-center font-bold text-[10px] text-white">ZA</div>
                          <div>
                            <span className="text-xs font-bold text-white">Z-API Gateway</span>
                            <span className="block text-[8px] text-muted-foreground font-mono uppercase mt-0.5">QR Server Scale</span>
                          </div>
                        </div>
                        <span className="text-[9px] font-mono font-bold text-success bg-success/10 border border-success/20 px-2 py-0.5 rounded">STANDBY</span>
                      </div>

                      {/* WhatsApp Cloud API */}
                      <div className="p-3.5 bg-surface/30 border border-border rounded-xl flex items-center justify-between font-sans">
                        <div className="flex items-center gap-2.5">
                          <div className="size-8 rounded bg-[#10141f] border border-border flex items-center justify-center font-bold text-[10px] text-white">WA</div>
                          <div>
                            <span className="text-xs font-bold text-white">Meta Cloud API</span>
                            <span className="block text-[8px] text-muted-foreground font-mono uppercase mt-0.5">Official Direct</span>
                          </div>
                        </div>
                        <span className="text-[9px] font-mono font-bold text-muted-foreground bg-surface border border-border px-2 py-0.5 rounded">CONFIG_READ</span>
                      </div>
                    </div>
                  </div>

                  {/* Operational Webhook triggers summary */}
                  <div className="bg-[#0b0e14] border border-border rounded-2xl p-5 space-y-4">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Bot className="size-4 text-primary-glow" />
                      Gatilhos Operacionais Ativos
                    </h3>
                    <ul className="text-xs text-muted-foreground space-y-2.5 font-mono">
                      <li className="flex justify-between"><span>✔ Pedido Criado (Client)</span> <span className="text-success">[Webhook Ok]</span></li>
                      <li className="flex justify-between"><span>✔ Preparo Iniciado (Client)</span> <span className="text-success">[Webhook Ok]</span></li>
                      <li className="flex justify-between"><span>✔ Rota Despachada (Driver)</span> <span className="text-success">[Evolution]</span></li>
                      <li className="flex justify-between"><span>✔ Alerta SLA Estourado (Mgr)</span> <span className="text-success">[Evolution]</span></li>
                      <li className="flex justify-between"><span>✔ Entrega Concluída (Client)</span> <span className="text-success">[Webhook Ok]</span></li>
                    </ul>
                  </div>
                </div>

              </div>
            )}

            {activeTab === "templates" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Template Editor list */}
                <div className="bg-[#0b0e14] border border-border rounded-2xl p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">Editor de Templates WhatsApp IA</h3>
                  <div className="space-y-4">
                    
                    {/* Template 1 */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-mono uppercase text-primary-glow font-bold">CLIENTE: PEDIDO CONFIRMADO</span>
                      <textarea
                        value={templates.cliente_confirmado}
                        onChange={(e) => setTemplates(prev => ({ ...prev, cliente_confirmado: e.target.value }))}
                        className="w-full h-24 p-3 bg-surface/50 border border-border rounded-xl text-xs text-foreground focus:ring-1 focus:ring-primary/40 font-mono"
                      />
                    </div>

                    {/* Template 2 */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-mono uppercase text-primary-glow font-bold">CLIENTE: SAIU PARA ENTREGA</span>
                      <textarea
                        value={templates.cliente_despachado}
                        onChange={(e) => setTemplates(prev => ({ ...prev, cliente_despachado: e.target.value }))}
                        className="w-full h-24 p-3 bg-surface/50 border border-border rounded-xl text-xs text-foreground focus:ring-1 focus:ring-primary/40 font-mono"
                      />
                    </div>

                    {/* Template 3 */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-mono uppercase text-accent font-bold">ENTREGADOR: NOVA ROTA (IA)</span>
                      <textarea
                        value={templates.entregador_nova_rota}
                        onChange={(e) => setTemplates(prev => ({ ...prev, entregador_nova_rota: e.target.value }))}
                        className="w-full h-24 p-3 bg-surface/50 border border-border rounded-xl text-xs text-foreground focus:ring-1 focus:ring-primary/40 font-mono"
                      />
                    </div>

                  </div>
                </div>

                {/* Simulated preview display of chat */}
                <div className="bg-[#0b0e14] border border-border rounded-2xl p-5 flex flex-col justify-between h-full space-y-4">
                  <div className="border-b border-border/40 pb-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white">Visualização de Chat WhatsApp</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Previsualização fiel do cliente final no celular</p>
                  </div>

                  {/* Phone screen preview frame mockup */}
                  <div className="bg-[#07090d] border border-border rounded-2xl p-4 flex-1 space-y-4 relative overflow-hidden min-h-[300px]">
                    <div className="absolute top-0 inset-x-0 h-8 bg-surface/80 border-b border-border/45 flex items-center justify-between px-4 text-[10px] font-bold text-white z-10">
                      <span>Delivery OS Bot</span>
                      <span className="text-success font-mono font-bold uppercase">Online Hub</span>
                    </div>

                    <div className="pt-8 space-y-3.5">
                      {/* Left: Bot welcome message bubble */}
                      <div className="max-w-[85%] bg-surface border border-border rounded-2xl rounded-tl-none p-3 text-xs text-white leading-relaxed relative font-sans">
                        Olá Guilherme, seu pedido #4820 foi confirmado e já está na cozinha! A estimativa de entrega é de 35 minutos. Acompanhe em tempo real pelo link: deliveryos.com/t/o-0
                      </div>

                      {/* Right: User thumbs up bubble */}
                      <div className="max-w-[70%] bg-primary/20 border border-primary/25 rounded-2xl rounded-tr-none p-3 text-xs text-white text-right ml-auto leading-relaxed relative font-sans">
                        Muito obrigado! Adorei a central em tempo real. 👍
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setTemplates({
                        cliente_confirmado: "Olá {{cliente}}, seu pedido {{pedido}} foi confirmado e já está na cozinha! A estimativa de entrega é de {{eta}} minutos. Acompanhe em tempo real pelo link: {{link_rastreio}}",
                        cliente_preparo: "Excelente notícia, {{cliente}}! Seu pedido {{pedido}} está sendo preparado com muito carinho na chapa! 👨‍🍳🔥",
                        cliente_despachado: "🚀 Saiu para entrega! O motoboy {{entregador}} já retirou seu pedido {{pedido}} e está a caminho da sua residência. ETA de chegada: {{eta}} min.",
                        entregador_nova_rota: "🏍️ NOVA ROTA: Olá {{entregador}}, você foi designado para uma nova rota! Região: {{bairro}} com {{pedidos_qtde}} entregas otimizadas.",
                        gerente_alerta: "🚨 ATENÇÃO OPERACIONAL: Risco crítico de SLA no pedido {{pedido}}! Cozinha lenta no preparo há mais de 25 minutos."
                      });
                      toast.info("Templates restaurados para valores originais.");
                    }}
                    className="w-full py-2.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-white transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="size-3.5" />
                    Restaurar Padrão
                  </button>
                </div>
              </div>
            )}

            {activeTab === "api" && (
              <div className="bg-[#0b0e14] border border-border rounded-2xl p-6 space-y-6">
                <div className="border-b border-border/40 pb-4">
                  <h3 className="text-lg font-bold text-white">Configurar Integração de API</h3>
                  <p className="text-xs text-muted-foreground mt-1">Conecte o Delivery OS a gateways de disparo robustos em minutos.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Option 1 */}
                  <button
                    onClick={() => setSelectedApi("evolution")}
                    className={`p-4 rounded-xl border text-left space-y-2 cursor-pointer transition ${
                      selectedApi === "evolution" ? "bg-primary/10 border-primary/40 shadow-glow" : "bg-surface/30 border-border hover:bg-surface/50"
                    }`}
                  >
                    <Bot className="size-6 text-primary-glow" />
                    <div className="text-xs font-bold text-white">Evolution API (Recomendado)</div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">Alta performance com suporte a instâncias múltiplas, Docker self-hosted e Evolution Cloud.</p>
                  </button>

                  {/* Option 2 */}
                  <button
                    onClick={() => setSelectedApi("zapi")}
                    className={`p-4 rounded-xl border text-left space-y-2 cursor-pointer transition ${
                      selectedApi === "zapi" ? "bg-primary/10 border-primary/40 shadow-glow" : "bg-surface/30 border-border hover:bg-surface/50"
                    }`}
                  >
                    <QrCode className="size-6 text-[#22d3ee]" />
                    <div className="text-xs font-bold text-white">Z-API Gateway</div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">Conexão via QR-Code rápida e escalável, homologado com a Z-API Enterprise Scale.</p>
                  </button>

                  {/* Option 3 */}
                  <button
                    onClick={() => setSelectedApi("cloud")}
                    className={`p-4 rounded-xl border text-left space-y-2 cursor-pointer transition ${
                      selectedApi === "cloud" ? "bg-primary/10 border-primary/40 shadow-glow" : "bg-surface/30 border-border hover:bg-surface/50"
                    }`}
                  >
                    <Link2 className="size-6 text-success" />
                    <div className="text-xs font-bold text-white">Meta Cloud API (Oficial)</div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">Conexão direta oficial do WhatsApp Cloud API para disparos corporativos de altíssima escala.</p>
                  </button>
                </div>

                <div className="bg-[#07090d] border border-border rounded-xl p-5 space-y-4">
                  <span className="text-[10px] font-mono uppercase text-muted-foreground tracking-widest font-bold block">
                    {selectedApi === "evolution" ? "PARÂMETROS EVOLUTION API v2" : selectedApi === "zapi" ? "PARÂMETROS Z-API" : "PARÂMETROS META CLOUD API"}
                  </span>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                    <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground font-semibold">Evolution Host URL</span>
                      <input type="text" placeholder="https://api.seuservidor.com.br" className="w-full p-2.5 bg-surface/50 border border-border rounded-lg text-foreground focus:ring-1 focus:ring-primary/40" />
                    </div>
                    
                    <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground font-semibold">Global API Key Token</span>
                      <input type="password" placeholder="api-token-evolution-key-secret-92318" className="w-full p-2.5 bg-surface/50 border border-border rounded-lg text-foreground focus:ring-1 focus:ring-primary/40" />
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-2 text-xs">
                    <button onClick={() => toast.info("Configurações redefinidas.")} className="px-4 py-2 border border-border rounded hover:bg-surface transition">Limpar</button>
                    <button onClick={() => toast.success("Integração salva com sucesso!")} className="px-4 py-2 bg-[#22d3ee] text-black font-extrabold rounded shadow-glow transition">Salvar Integração</button>
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
