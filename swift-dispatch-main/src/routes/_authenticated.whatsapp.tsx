import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { MessageSquare, Plug, ScrollText, Send, Wifi } from "lucide-react";
import { OpsPage } from "@/components/ops/OpsPage";
import { OpsPageHeader } from "@/components/ops/OpsPageHeader";
import { StatCard } from "@/components/design/StatCard";
import { WhatsappApiPanel } from "@/components/whatsapp/WhatsappApiPanel";
import { WhatsappLogsPanel } from "@/components/whatsapp/WhatsappLogsPanel";
import { WhatsappStatusBanner } from "@/components/whatsapp/WhatsappStatusBanner";
import { WhatsappTemplatesPanel } from "@/components/whatsapp/WhatsappTemplatesPanel";
import { PROVIDER_LABELS } from "@/components/whatsapp/types";
import { useOps } from "@/hooks/useOps";
import { useTenant } from "@/hooks/useTenant";
import { useWhatsappHub } from "@/hooks/useWhatsappHub";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/whatsapp")({
  component: WhatsappHubPage,
});

const TABS = [
  { id: "logs" as const, label: "Histórico", icon: ScrollText },
  { id: "templates" as const, label: "Mensagens", icon: MessageSquare },
  { id: "api" as const, label: "Conexão API", icon: Plug },
];

function WhatsappHubPage() {
  const { current } = useTenant();
  const { tick } = useOps();
  const hub = useWhatsappHub(current?.id, tick);

  const logStats = useMemo(() => {
    const sent = hub.logs.filter((l) => l.status === "sent").length;
    const demo = hub.logs.filter((l) => l.status === "demo").length;
    const failed = hub.logs.filter((l) => l.status === "failed").length;
    return { sent, demo, failed };
  }, [hub.logs]);

  return (
    <OpsPage className="flex flex-col gap-5 lg:gap-6">
      <WhatsappStatusBanner
        gatewayOnline={hub.gatewayOnline}
        provider={hub.selectedApi}
        apiSource={hub.apiSource}
      />

      <OpsPageHeader
        subtitle="Comunicação automatizada"
        title="WhatsApp"
        highlight="Central Operacional"
        description="Disparos automáticos para clientes, entregadores e gerência — histórico, templates e integração."
        icon={MessageSquare}
        iconClassName="text-primary"
        className="pb-0"
        actions={
          <div className="segmented-control w-full sm:w-auto overflow-x-auto">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => hub.setActiveTab(tab.id)}
                  data-active={hub.activeTab === tab.id}
                  className="segmented-item text-xs whitespace-nowrap"
                >
                  <Icon className="size-3.5 shrink-0" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Conexão"
          value={hub.gatewayOnline ? "Online" : "Demo"}
          hint={hub.gatewayOnline ? PROVIDER_LABELS[hub.selectedApi] : "Configure a API"}
          icon={Wifi}
          variant={hub.gatewayOnline ? "default" : "warning"}
        />
        <StatCard
          label="Disparos registrados"
          value={hub.logs.length}
          hint="No histórico deste tenant"
          icon={Send}
        />
        <StatCard
          label="Enviados via API"
          value={logStats.sent}
          hint={logStats.demo ? `${logStats.demo} em modo demo` : "Disparos reais"}
          icon={MessageSquare}
          variant={logStats.sent ? "default" : "warning"}
        />
        <StatCard
          label="Falhas"
          value={logStats.failed}
          hint={logStats.failed ? "Revise credenciais" : "Nenhuma falha"}
          icon={ScrollText}
          variant={logStats.failed ? "danger" : "default"}
        />
      </div>

      <div
        className={cn(
          "min-h-0",
          hub.activeTab === "logs" && "flex-1",
        )}
      >
        {hub.activeTab === "logs" ? (
          <WhatsappLogsPanel
            logs={hub.logs}
            logsLoading={hub.logsLoading}
            loadLogs={hub.loadLogs}
            triggerManualTest={hub.triggerManualTest}
            gatewayOnline={hub.gatewayOnline}
            selectedApi={hub.selectedApi}
            apiKeySet={hub.apiKeySet}
          />
        ) : null}

        {hub.activeTab === "templates" ? (
          <WhatsappTemplatesPanel
            templates={hub.templates}
            setTemplates={hub.setTemplates}
            templatesLoading={hub.templatesLoading}
            templatesSaving={hub.templatesSaving}
            saveTemplates={hub.saveTemplates}
            resetTemplates={hub.resetTemplates}
          />
        ) : null}

        {hub.activeTab === "api" ? (
          <WhatsappApiPanel
            selectedApi={hub.selectedApi}
            setSelectedApi={hub.setSelectedApi}
            apiUrl={hub.apiUrl}
            setApiUrl={hub.setApiUrl}
            apiKey={hub.apiKey}
            setApiKey={hub.setApiKey}
            instanceName={hub.instanceName}
            setInstanceName={hub.setInstanceName}
            apiEnabled={hub.apiEnabled}
            setApiEnabled={hub.setApiEnabled}
            apiKeySet={hub.apiKeySet}
            apiSource={hub.apiSource}
            apiLoading={hub.apiLoading}
            apiSaving={hub.apiSaving}
            loadApiConfig={hub.loadApiConfig}
            saveApiConfig={hub.saveApiConfig}
            webhookInfo={hub.webhookInfo}
            gatewayOnline={hub.gatewayOnline}
          />
        ) : null}
      </div>
    </OpsPage>
  );
}
