import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { getIntegrationWebhooksFn } from "@/functions/ifood";
import {
  getWhatsappApiConfigFn,
  getWhatsappTemplatesFn,
  listWhatsappLogsFn,
  resetWhatsappTemplatesFn,
  saveWhatsappApiConfigFn,
  saveWhatsappTemplatesFn,
  sendWhatsappTestFn,
} from "@/functions/whatsapp";
import {
  DEFAULT_WHATSAPP_TEMPLATES,
  type WhatsappTemplateKey,
} from "@/lib/whatsapp/templates";
import { mapServerLog, type WhatsappHubState, type WhatsappProvider, type WhatsappTab } from "@/components/whatsapp/types";

export function useWhatsappHub(tenantId: string | undefined, tick: number): WhatsappHubState {
  const [activeTab, setActiveTab] = useState<WhatsappTab>("logs");
  const [logs, setLogs] = useState<WhatsappHubState["logs"]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const [templates, setTemplates] = useState<Record<WhatsappTemplateKey, string>>(DEFAULT_WHATSAPP_TEMPLATES);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesSaving, setTemplatesSaving] = useState(false);

  const [selectedApi, setSelectedApi] = useState<WhatsappProvider>("evolution");
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [instanceName, setInstanceName] = useState("");
  const [apiEnabled, setApiEnabled] = useState(false);
  const [apiKeySet, setApiKeySet] = useState(false);
  const [apiSource, setApiSource] = useState<"tenant" | "env" | "none">("none");
  const [apiLoading, setApiLoading] = useState(false);
  const [apiSaving, setApiSaving] = useState(false);

  const [webhookInfo, setWebhookInfo] = useState<WhatsappHubState["webhookInfo"]>(null);

  const gatewayOnline = apiEnabled && apiKeySet;

  const loadLogs = useCallback(async () => {
    if (!tenantId) return;
    setLogsLoading(true);
    try {
      const rows = await listWhatsappLogsFn({ data: { tenantId, limit: 100 } });
      setLogs(rows.map(mapServerLog));
    } catch {
      /* mantém feed local em demo offline */
    } finally {
      setLogsLoading(false);
    }
  }, [tenantId]);

  const loadTemplates = useCallback(async () => {
    if (!tenantId) return;
    setTemplatesLoading(true);
    try {
      const rows = await getWhatsappTemplatesFn({ data: { tenantId } });
      setTemplates(rows);
    } catch {
      setTemplates(DEFAULT_WHATSAPP_TEMPLATES);
    } finally {
      setTemplatesLoading(false);
    }
  }, [tenantId]);

  const loadApiConfig = useCallback(async () => {
    if (!tenantId) return;
    setApiLoading(true);
    try {
      const cfg = await getWhatsappApiConfigFn({ data: { tenantId } });
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
  }, [tenantId]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs, tick]);

  useEffect(() => {
    if (!tenantId) return;
    void loadApiConfig();
  }, [tenantId, loadApiConfig]);

  useEffect(() => {
    if (activeTab === "templates") void loadTemplates();
  }, [activeTab, loadTemplates]);

  useEffect(() => {
    if (activeTab !== "api" || !tenantId) return;
    void getIntegrationWebhooksFn({ data: { tenantId } })
      .then((info) => setWebhookInfo({ endpoints: info.endpoints }))
      .catch(() => setWebhookInfo(null));
  }, [activeTab, tenantId]);

  const saveTemplates = async () => {
    if (!tenantId) return;
    setTemplatesSaving(true);
    try {
      const saved = await saveWhatsappTemplatesFn({ data: { tenantId, templates } });
      setTemplates(saved);
      toast.success("Mensagens automáticas salvas.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar templates");
    } finally {
      setTemplatesSaving(false);
    }
  };

  const resetTemplates = async () => {
    if (!tenantId) return;
    try {
      const defaults = await resetWhatsappTemplatesFn({ data: { tenantId } });
      setTemplates(defaults);
      toast.info("Templates restaurados para o padrão.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao restaurar");
    }
  };

  const saveApiConfig = async () => {
    if (!tenantId) return;
    setApiSaving(true);
    try {
      const saved = await saveWhatsappApiConfigFn({
        data: {
          tenantId,
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
      toast.success("Integração WhatsApp salva.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar integração");
    } finally {
      setApiSaving(false);
    }
  };

  const triggerManualTest = async (phone?: string) => {
    if (!tenantId) return;
    try {
      const row = await sendWhatsappTestFn({
        data: { tenantId, phone: phone?.trim() || undefined },
      });
      setLogs((prev) => [mapServerLog(row), ...prev]);
      if (row.status === "sent") {
        toast.success("Mensagem de teste enviada via API.");
      } else if (row.status === "demo") {
        toast.info("Teste registrado em modo demo — configure a API para envio real.");
      } else {
        toast.error("Falha ao enviar. Verifique credenciais e instância.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no disparo de teste");
    }
  };

  return {
    activeTab,
    setActiveTab,
    logs,
    logsLoading,
    loadLogs,
    triggerManualTest,
    templates,
    setTemplates,
    templatesLoading,
    templatesSaving,
    saveTemplates,
    resetTemplates,
    selectedApi,
    setSelectedApi,
    apiUrl,
    setApiUrl,
    apiKey,
    setApiKey,
    instanceName,
    setInstanceName,
    apiEnabled,
    setApiEnabled,
    apiKeySet,
    apiSource,
    apiLoading,
    apiSaving,
    loadApiConfig,
    saveApiConfig,
    gatewayOnline,
    webhookInfo,
  };
}
