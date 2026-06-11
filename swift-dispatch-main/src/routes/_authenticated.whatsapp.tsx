import { OpsPage } from "@/components/ops/OpsPage";
import { OpsPageHeader } from "@/components/ops/OpsPageHeader";
import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useTenant } from "@/hooks/useTenant";
import { useOps } from "@/hooks/useOps";
import { useI18n } from "@/hooks/useI18n";
import { getIntegrationWebhooksFn } from "@/functions/ifood";
import {
  listWhatsappLogsFn,
  sendWhatsappTestFn,
  getWhatsappTemplatesFn,
  saveWhatsappTemplatesFn,
  resetWhatsappTemplatesFn,
  getWhatsappApiConfigFn,
  saveWhatsappApiConfigFn,
} from "@/functions/whatsapp";
import type { WhatsappMessageLog } from "@/lib/whatsapp/orderNotifications";
import {
  DEFAULT_WHATSAPP_TEMPLATES,
  WHATSAPP_TEMPLATE_KEYS,
  WHATSAPP_TEMPLATE_META,
  type WhatsappTemplateKey,
} from "@/lib/whatsapp/templates";
import { 
  MessageSquare, 
  Send, 
  Settings, 
  Link2, 
  CheckCircle, 
  QrCode, 
  AlertTriangle,
  Clock,
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
  status: "sent" | "failed" | "pending" | "demo";
};

function mapServerLog(row: WhatsappMessageLog): MessageLog {
  return {
    id: row.id,
    timestamp: new Date(row.created_at).toLocaleTimeString("pt-BR"),
    recipient: row.recipient_label,
    type: row.recipient_type,
    content: row.content,
    status: row.status,
  };
}

function WhatsappHubPage() {
  const { current } = useTenant();
  const { t } = useI18n();
  const { tick } = useOps();
  const [activeTab, setActiveTab] = useState<"api" | "templates" | "logs">("logs");
  const [selectedApi, setSelectedApi] = useState<"evolution" | "zapi" | "cloud">("evolution");
  const [logs, setLogs] = useState<MessageLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const loadLogs = useCallback(async () => {
    if (!current?.id) return;
    setLogsLoading(true);
    try {
      const rows = await listWhatsappLogsFn({ data: { tenantId: current.id, limit: 50 } });
      setLogs(rows.map(mapServerLog));
    } catch {
      /* mantém feed local em demo offline */
    } finally {
      setLogsLoading(false);
    }
  }, [current?.id]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs, tick]);

  const [templates, setTemplates] = useState<Record<WhatsappTemplateKey, string>>(
    DEFAULT_WHATSAPP_TEMPLATES,
  );
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesSaving, setTemplatesSaving] = useState(false);

  const loadTemplates = useCallback(async () => {
    if (!current?.id) return;
    setTemplatesLoading(true);
    try {
      const rows = await getWhatsappTemplatesFn({ data: { tenantId: current.id } });
      setTemplates(rows);
    } catch {
      setTemplates(DEFAULT_WHATSAPP_TEMPLATES);
    } finally {
      setTemplatesLoading(false);
    }
  }, [current?.id]);

  useEffect(() => {
    if (activeTab === "templates") void loadTemplates();
  }, [activeTab, loadTemplates]);

  const saveTemplates = async () => {
    if (!current?.id) return;
    setTemplatesSaving(true);
    try {
      const saved = await saveWhatsappTemplatesFn({ data: { tenantId: current.id, templates } });
      setTemplates(saved);
      toast.success("Templates salvos!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar templates");
    } finally {
      setTemplatesSaving(false);
    }
  };

  const resetTemplates = async () => {
    if (!current?.id) return;
    try {
      const defaults = await resetWhatsappTemplatesFn({ data: { tenantId: current.id } });
      setTemplates(defaults);
      toast.info("Templates restaurados para o padrão.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao restaurar");
    }
  };

  const previewTemplate = templates.order_received;
  const [webhookInfo, setWebhookInfo] = useState<{
    endpoints: { mercadopago: string; ifood: string; mock_payment: string };
  } | null>(null);

  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [instanceName, setInstanceName] = useState("");
  const [apiEnabled, setApiEnabled] = useState(false);
  const [apiKeySet, setApiKeySet] = useState(false);
  const [apiSource, setApiSource] = useState<"tenant" | "env" | "none">("none");
  const [apiLoading, setApiLoading] = useState(false);
  const [apiSaving, setApiSaving] = useState(false);

  const loadApiConfig = useCallback(async () => {
    if (!current?.id) return;
    setApiLoading(true);
    try {
      const cfg = await getWhatsappApiConfigFn({ data: { tenantId: current.id } });
      setSelectedApi(cfg.provider);
      setApiUrl(cfg.apiUrl ?? "");
      setInstanceName(cfg.instanceName ?? "");
      setApiEnabled(cfg.enabled);
      setApiKeySet(cfg.apiKeySet);
      setApiSource(cfg.source);
      setApiKey("");
    } catch {
      /* demo offline */
    } finally {
      setApiLoading(false);
    }
  }, [current?.id]);

  useEffect(() => {
    if (!current?.id) return;
    void loadApiConfig();
  }, [current?.id, loadApiConfig]);

  useEffect(() => {
    if (activeTab !== "api" || !current?.id) return;
    void getIntegrationWebhooksFn({ data: { tenantId: current.id } })
      .then((info) => setWebhookInfo({ endpoints: info.endpoints }))
      .catch(() => setWebhookInfo(null));
  }, [activeTab, current?.id]);

  const providerLabels = {
    evolution: "Evolution API",
    zapi: "Z-API",
    cloud: "Meta Cloud",
  } as const;
  const gatewayOnline = apiEnabled && apiKeySet;

  const saveApiConfig = async () => {
    if (!current?.id) return;
    setApiSaving(true);
    try {
      const saved = await saveWhatsappApiConfigFn({
        data: {
          tenantId: current.id,
          provider: selectedApi,
          apiUrl: apiUrl || null,
          apiKey: apiKey.trim() || undefined,
          instanceName: instanceName || null,
          enabled: apiEnabled,
        },
      });
      setApiKeySet(saved.apiKeySet);
      setApiSource(saved.source);
      setApiKey("");
      toast.success("Integração WhatsApp salva!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar integração");
    } finally {
      setApiSaving(false);
    }
  };

  const triggerManualTest = async () => {
    if (!current?.id) return;
    try {
      const row = await sendWhatsappTestFn({ data: { tenantId: current.id } });
      setLogs((prev) => [mapServerLog(row), ...prev]);
      toast.success("Mensagem de teste registrada!", { icon: "⚡" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no disparo de teste");
    }
  };
  return (
    <OpsPage className="space-y-6">
            <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
              <strong>Modo demonstração:</strong> mensagens são registradas no banco. Disparo real exige
              integração ativa na aba Conexão API (Evolution, Z-API ou Meta Cloud) ou variáveis{" "}
              <code className="text-xs">WHATSAPP_*</code> no servidor.
            </div>
            <OpsPageHeader
              subtitle="Comunicação automatizada"
              title="WhatsApp"
              highlight="Operation Hub"
              className="border-b border-border/40 pb-4"
              actions={
                <div className="segmented-control w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setActiveTab("logs")}
                    data-active={activeTab === "logs"}
                    className="segmented-item text-xs"
                  >
                    Logs de Disparo
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("templates")}
                    data-active={activeTab === "templates"}
                    className="segmented-item text-xs"
                  >
                    Mensagens automáticas
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("api")}
                    data-active={activeTab === "api"}
                    className="segmented-item text-xs"
                  >
                    Conexão API
                  </button>
                </div>
              }
            />

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="erp-card p-4 flex items-center gap-3">
                <div className="size-9 rounded-lg bg-success/10 flex items-center justify-center text-success">
                  <CheckCircle className="size-5" />
                </div>
                <div>
                  <div className="erp-section-label">Conexão WhatsApp</div>
                  <div
                    className={`text-sm font-bold mt-0.5 ${
                      gatewayOnline ? "text-success" : "text-muted-foreground"
                    }`}
                  >
                    {gatewayOnline ? `Conectado (${providerLabels[selectedApi]})` : "Não configurado"}
                  </div>
                </div>
              </div>

              <div className="erp-card p-4 flex items-center gap-3">
                <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary-glow">
                  <MessageSquare className="size-5" />
                </div>
                <div>
                  <div className="erp-section-label">Disparos registrados</div>
                  <div className="text-sm font-semibold text-foreground mt-0.5">{logs.length} envios</div>
                </div>
              </div>
            </div>

            {/* Subpages Container */}
            {activeTab === "logs" && (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                
                {/* Real-time message logs dashboard feed */}
                <div className="xl:col-span-2 erp-card p-5 space-y-4 shadow-sm">
                  <div className="flex justify-between items-center border-b border-border/40 pb-3">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Clock className="size-4 text-primary-glow" />
                      Log de Automações Realtime
                    </h3>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          void loadLogs();
                          toast.info("Feed atualizado.");
                        }}
                        className="p-1 px-2.5 rounded border border-border hover:bg-surface text-[10px]  text-muted-foreground hover:text-foreground transition"
                        title="Atualizar Feed"
                      >
                        [ ATUALIZAR ]
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
                    {logsLoading && logs.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-8">Carregando logs…</p>
                    ) : null}
                    {!logsLoading && logs.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-8">
                        Nenhum disparo ainda. Avance um pedido ou use o botão de teste.
                      </p>
                    ) : null}
                    {logs.map((log) => (
                      <div 
                        key={log.id} 
                        className="p-3.5 bg-surface/30 border border-border/60 hover:border-border rounded-xl flex items-start justify-between gap-4  text-[11px] animate-in slide-in-from-top-3 duration-250 relative overflow-hidden"
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] text-muted-foreground bg-muted border border-border px-1.5 py-0.2 rounded font-sans">{log.timestamp}</span>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.2 rounded font-sans ${
                              log.type === "cliente" ? "bg-primary/10 text-primary-glow border border-primary/20" :
                              log.type === "entregador" ? "bg-accent/10 text-accent border border-accent/20" :
                              "bg-danger/10 text-danger border border-danger/20"
                            }`}>
                              {log.type}
                            </span>
                            <span className="text-foreground/80 font-bold font-sans">Destinatário: {log.recipient}</span>
                          </div>

                          <p className="text-muted-foreground leading-relaxed text-xs font-sans whitespace-pre-wrap">{log.content}</p>
                        </div>

                        {/* Status Checkmark */}
                        <div className="text-right shrink-0 mt-0.5">
                          <span className={`font-sans font-bold flex items-center gap-1 text-[10px] border px-2 py-0.5 rounded uppercase ${
                            log.status === "sent"
                              ? "text-success bg-success/10 border-success/15"
                              : log.status === "failed"
                                ? "text-danger bg-danger/10 border-danger/15"
                                : log.status === "demo"
                                  ? "text-warning bg-warning/10 border-warning/15"
                                  : "text-muted-foreground bg-muted border-border"
                          }`}>
                            <CheckCircle className="size-3" />
                            {log.status === "demo" ? "DEMO" : log.status === "sent" ? "ENVIADO" : log.status === "failed" ? "FALHOU" : "PENDENTE"}
                          </span>
                        </div>
                      </div>
                    ))}

                    {logs.length === 0 && (
                      <div className="py-16 text-center space-y-3">
                        <MessageSquare className="size-8 mx-auto text-muted-foreground/30" />
                        <p className="text-xs text-muted-foreground">Nenhum disparo registrado. Use o teste manual ou conecte a API.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sidebar details: Future API connections previews */}
                <div className="space-y-6">
                  <div className="erp-card p-5 space-y-4">
                    <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                      <Link2 className="size-4 text-primary-glow" />
                      Status das APIs Integradas
                    </h3>
                    
                    <div className="space-y-3">
                      {(["evolution", "zapi", "cloud"] as const).map((provider) => {
                        const active = selectedApi === provider && gatewayOnline;
                        const configured = selectedApi === provider && apiKeySet;
                        return (
                          <div
                            key={provider}
                            className="p-3.5 bg-surface/30 border border-border rounded-xl flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="size-8 rounded bg-muted border border-border flex items-center justify-center font-bold text-[10px] text-foreground">
                                {provider === "evolution" ? "EV" : provider === "zapi" ? "ZA" : "WA"}
                              </div>
                              <div>
                                <span className="text-xs font-semibold text-foreground">
                                  {providerLabels[provider]}
                                </span>
                                <span className="block text-[8px] text-muted-foreground uppercase mt-0.5">
                                  {selectedApi === provider ? "Provedor selecionado" : "Disponível"}
                                </span>
                              </div>
                            </div>
                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                                active
                                  ? "text-success bg-success/10 border border-success/20"
                                  : configured
                                    ? "text-warning bg-warning/10 border border-warning/20"
                                    : "text-muted-foreground bg-surface border border-border"
                              }`}
                            >
                              {active ? "ATIVO" : configured ? "CONFIG OK" : "—"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="erp-card p-5 space-y-3">
                    <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                      Mensagens automáticas disponíveis
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Os disparos aparecem nos logs quando a API estiver configurada e os eventos
                      do pedido acontecerem na operação.
                    </p>
                  </div>
                </div>

              </div>
            )}

            {activeTab === "templates" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="erp-card p-5 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-foreground">Templates por tenant</h3>
                    <button
                      type="button"
                      onClick={() => void saveTemplates()}
                      disabled={templatesSaving || templatesLoading}
                      className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50"
                    >
                      {templatesSaving ? "Salvando…" : "Salvar"}
                    </button>
                  </div>
                  {templatesLoading ? (
                    <p className="text-xs text-muted-foreground">Carregando templates…</p>
                  ) : (
                    <div className="space-y-4">
                      {WHATSAPP_TEMPLATE_KEYS.map((key) => (
                        <div key={key} className="space-y-1.5">
                          <span
                            className={`text-[10px] uppercase font-bold ${
                              WHATSAPP_TEMPLATE_META[key].audience === "entregador"
                                ? "text-accent"
                                : "text-primary-glow"
                            }`}
                          >
                            {WHATSAPP_TEMPLATE_META[key].audience.toUpperCase()}:{" "}
                            {WHATSAPP_TEMPLATE_META[key].label.toUpperCase()}
                          </span>
                          <textarea
                            value={templates[key]}
                            onChange={(e) =>
                              setTemplates((prev) => ({ ...prev, [key]: e.target.value }))
                            }
                            className="w-full h-24 p-3 bg-surface/50 border border-border rounded-xl text-xs text-foreground focus:ring-1 focus:ring-primary/40"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    Variáveis: {"{{cliente}}"}, {"{{pedido}}"}, {"{{eta}}"}, {"{{link_rastreio}}"},
                    {" {{entregador}}"}, {"{{bairro}}"}, {"{{endereco}}"}, {"{{minutos}}"}, {"{{sla}}"}
                  </p>
                </div>

                <div className="erp-card p-5 flex flex-col justify-between h-full space-y-4">
                  <div className="border-b border-border/40 pb-3">
                    <h3 className="text-sm font-semibold text-foreground">Visualização de Chat WhatsApp</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Prévia do template &quot;Pedido recebido&quot;</p>
                  </div>

                  <div className="bg-muted border border-border rounded-2xl p-4 flex-1 space-y-4 relative overflow-hidden min-h-[300px]">
                    <div className="absolute top-0 inset-x-0 h-8 bg-surface/80 border-b border-border/45 flex items-center justify-between px-4 text-[10px] font-semibold text-foreground z-10">
                      <span>Delivery OS Bot</span>
                      <span className="text-success font-bold uppercase">Online</span>
                    </div>

                    <div className="pt-8 space-y-3.5">
                      <div className="max-w-[85%] bg-surface border border-border rounded-2xl rounded-tl-none p-3 text-xs text-foreground leading-relaxed relative font-sans whitespace-pre-wrap">
                        {previewTemplate
                          .replace(/\{\{cliente\}\}/g, "Maria")
                          .replace(/\{\{pedido\}\}/g, "#5042")
                          .replace(/\{\{eta\}\}/g, "35")
                          .replace(/\{\{link_rastreio\}\}/g, "https://…/rastreio")}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void resetTemplates()}
                    className="w-full py-2.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="size-3.5" />
                    Restaurar Padrão
                  </button>
                </div>
              </div>
            )}

            {activeTab === "api" && (
              <div className="erp-card p-6 space-y-6">
                {webhookInfo && (
                  <div className="rounded-xl border border-border bg-surface/30 p-4 space-y-2 text-xs">
                    <h4 className="font-semibold text-foreground">URLs de webhook (inbound)</h4>
                    <p>
                      <span className="text-muted-foreground">Mercado Pago:</span>{" "}
                      <code className="break-all">{webhookInfo.endpoints.mercadopago}</code>
                    </p>
                    <p>
                      <span className="text-muted-foreground">iFood:</span>{" "}
                      <code className="break-all">{webhookInfo.endpoints.ifood}</code>
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      iFood: header <code>x-ifood-merchant-id: demo-merchant-burger-house</code> (após seed).
                    </p>
                  </div>
                )}
                <div className="border-b border-border/40 pb-4">
                  <h3 className="text-lg font-semibold text-foreground">Configurar Integração de API</h3>
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
                    <div className="text-xs font-semibold text-foreground">Evolution API (Recomendado)</div>
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
                    <div className="text-xs font-semibold text-foreground">Z-API Gateway</div>
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
                    <div className="text-xs font-semibold text-foreground">Meta Cloud API (Oficial)</div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">Conexão direta oficial do WhatsApp Cloud API para disparos corporativos de altíssima escala.</p>
                  </button>
                </div>

                <div className="bg-muted border border-border rounded-xl p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[10px] uppercase text-muted-foreground tracking-widest font-bold">
                      {selectedApi === "evolution"
                        ? "PARÂMETROS EVOLUTION API v2"
                        : selectedApi === "zapi"
                          ? "PARÂMETROS Z-API"
                          : "PARÂMETROS META CLOUD API"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {apiSource === "env"
                        ? "Usando variáveis WHATSAPP_* do servidor"
                        : apiSource === "tenant" && apiEnabled
                          ? "Integração ativa neste tenant"
                          : "Modo demo (sem API configurada)"}
                    </span>
                  </div>

                  {selectedApi === "zapi" ? (
                    <p className="text-xs text-muted-foreground rounded-lg border border-dashed border-border p-3">
                      Z-API: use a URL base <code>https://api.z-api.io</code>, o ID da instância e o token
                      de disparo. O sistema chama{" "}
                      <code>/instances/&#123;id&#125;/token/&#123;token&#125;/send-text</code>.
                    </p>
                  ) : null}
                  {selectedApi === "cloud" ? (
                    <p className="text-xs text-muted-foreground rounded-lg border border-dashed border-border p-3">
                      Meta Cloud: URL <code>https://graph.facebook.com</code>, ID do número (
                      phone_number_id) e token de acesso com permissão{" "}
                      <code>whatsapp_business_messaging</code>.
                    </p>
                  ) : null}

                  <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={apiEnabled}
                      onChange={(e) => setApiEnabled(e.target.checked)}
                      className="size-4 rounded accent-primary"
                    />
                    Ativar disparos via API para este tenant
                  </label>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground font-semibold">Host URL</span>
                      <input
                        type="text"
                        value={apiUrl}
                        onChange={(e) => setApiUrl(e.target.value)}
                        placeholder={
                          selectedApi === "zapi"
                            ? "https://api.z-api.io"
                            : selectedApi === "cloud"
                              ? "https://graph.facebook.com"
                              : "https://api.seuservidor.com.br"
                        }
                        disabled={apiLoading}
                        className="w-full p-2.5 bg-surface/50 border border-border rounded-lg text-foreground focus:ring-1 focus:ring-primary/40 disabled:opacity-60"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground font-semibold">
                        {selectedApi === "cloud" ? "Phone Number ID" : "Nome / ID da instância"}
                      </span>
                      <input
                        type="text"
                        value={instanceName}
                        onChange={(e) => setInstanceName(e.target.value)}
                        placeholder={
                          selectedApi === "zapi"
                            ? "3C4B2A1D..."
                            : selectedApi === "cloud"
                              ? "123456789012345"
                              : "delivery-os"
                        }
                        disabled={apiLoading}
                        className="w-full p-2.5 bg-surface/50 border border-border rounded-lg text-foreground focus:ring-1 focus:ring-primary/40 disabled:opacity-60"
                      />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <span className="text-[10px] text-muted-foreground font-semibold">
                        {selectedApi === "cloud" ? "Access Token" : "API Key / Token"}
                      </span>
                      <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder={
                          apiKeySet
                            ? "Token salvo (deixe vazio para manter)"
                            : selectedApi === "zapi"
                              ? "token-da-instancia-z-api"
                              : selectedApi === "cloud"
                                ? "EAAxxxx..."
                                : "api-token-evolution-key"
                        }
                        disabled={apiLoading}
                        className="w-full p-2.5 bg-surface/50 border border-border rounded-lg text-foreground focus:ring-1 focus:ring-primary/40 disabled:opacity-60"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => void loadApiConfig()}
                      disabled={apiLoading || apiSaving}
                      className="px-4 py-2 border border-border rounded hover:bg-surface transition disabled:opacity-50"
                    >
                      Recarregar
                    </button>
                    <button
                      type="button"
                      onClick={() => void saveApiConfig()}
                      disabled={apiSaving || apiLoading}
                      className="px-4 py-2 erp-btn-primary font-extrabold rounded shadow-glow transition disabled:opacity-50"
                    >
                      {apiSaving ? "Salvando…" : "Salvar integração"}
                    </button>
                  </div>
                </div>
              </div>
            )}
    </OpsPage>
  );
}
