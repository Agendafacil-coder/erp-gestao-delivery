import { useEffect, useMemo } from "react";
import { MessageSquare, Plug, ScrollText, Send, Wifi, Megaphone } from "lucide-react";
import { StatCard } from "@/components/design/StatCard";
import { WhatsappApiPanel } from "@/components/whatsapp/WhatsappApiPanel";
import { WhatsappCampaignsPanel } from "@/components/whatsapp/WhatsappCampaignsPanel";
import { WhatsappLogsPanel } from "@/components/whatsapp/WhatsappLogsPanel";
import { WhatsappStatusBanner } from "@/components/whatsapp/WhatsappStatusBanner";
import { WhatsappTemplatesPanel } from "@/components/whatsapp/WhatsappTemplatesPanel";
import { PROVIDER_LABELS } from "@/components/whatsapp/types";
import { useOps } from "@/hooks/useOps";
import { useTenant } from "@/hooks/useTenant";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useWhatsappHub } from "@/hooks/useWhatsappHub";
import type { WhatsappAba } from "@/lib/sistema/search";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "api" as const, label: "Conexão", icon: Plug },
  { id: "templates" as const, label: "Textos", icon: MessageSquare },
  { id: "campaigns" as const, label: "Campanhas", icon: Megaphone },
  { id: "logs" as const, label: "Enviadas", icon: ScrollText },
];

type Props = {
  aba: WhatsappAba;
  onAbaChange: (aba: WhatsappAba) => void;
};

export function WhatsappSection({ aba, onAbaChange }: Props) {
  const { current } = useTenant();
  const { enabled: featureEnabled } = useFeatureFlags(current?.id);
  const campaignsEnabled = featureEnabled("whatsapp_campaigns");
  const { tick } = useOps();
  const hub = useWhatsappHub(current?.id, tick);

  useEffect(() => {
    hub.setActiveTab(aba);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync URL tab into hub once per aba change
  }, [aba]);

  const setTab = (tab: WhatsappAba) => {
    hub.setActiveTab(tab);
    onAbaChange(tab);
  };

  const logStats = useMemo(() => {
    const sent = hub.logs.filter((l) => l.status === "sent").length;
    const demo = hub.logs.filter((l) => l.status === "demo").length;
    const failed = hub.logs.filter((l) => l.status === "failed").length;
    return { sent, demo, failed };
  }, [hub.logs]);

  return (
    <div className="flex flex-col gap-5">
      {aba !== "api" ? (
        <WhatsappStatusBanner
          gatewayOnline={hub.gatewayOnline}
          provider={hub.selectedApi}
          apiSource={hub.apiSource}
        />
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground max-w-xl">
          {aba === "api"
            ? "Conecte o WhatsApp da loja aqui — você mesmo preenche e salva."
            : aba === "templates"
              ? "Textos das mensagens enviadas a clientes e entregadores."
              : aba === "campaigns"
                ? "Envios em massa para clientes."
                : "Mensagens já enviadas ou tentadas."}
        </p>
        <div className="segmented-control w-full sm:w-auto overflow-x-auto shrink-0">
          {TABS.filter((tab) => tab.id !== "campaigns" || campaignsEnabled).map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTab(tab.id)}
                data-active={aba === tab.id}
                className="segmented-item text-xs whitespace-nowrap"
              >
                <Icon className="size-3.5 shrink-0" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {aba !== "api" ? (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="WhatsApp"
          value={hub.gatewayOnline ? "Conectado" : "Teste"}
          hint={hub.gatewayOnline ? PROVIDER_LABELS[hub.selectedApi] : "Ainda não conectado"}
          icon={Wifi}
          variant={hub.gatewayOnline ? "default" : "warning"}
        />
        <StatCard
          label="Mensagens no histórico"
          value={hub.logs.length}
          hint="Últimos envios desta loja"
          icon={Send}
        />
        <StatCard
          label="Enviadas de verdade"
          value={logStats.sent}
          hint={logStats.demo ? `${logStats.demo} só em teste` : "Chegaram no celular"}
          icon={MessageSquare}
          variant={logStats.sent ? "default" : "warning"}
        />
        <StatCard
          label="Falhas"
          value={logStats.failed}
          hint={logStats.failed ? "Confira a conexão" : "Nenhuma falha"}
          icon={ScrollText}
          variant={logStats.failed ? "danger" : "default"}
        />
      </div>
      ) : null}

      <div className={cn("min-h-0", aba === "logs" && "flex-1")}>
        {aba === "logs" ? (
          <WhatsappLogsPanel
            logs={hub.logs}
            logsLoading={hub.logsLoading}
            loadLogs={hub.loadLogs}
            triggerManualTest={hub.triggerManualTest}
          />
        ) : null}

        {aba === "templates" ? (
          <WhatsappTemplatesPanel
            templates={hub.templates}
            setTemplates={hub.setTemplates}
            templatesLoading={hub.templatesLoading}
            templatesSaving={hub.templatesSaving}
            saveTemplates={hub.saveTemplates}
            resetTemplates={hub.resetTemplates}
          />
        ) : null}

        {aba === "campaigns" && current && campaignsEnabled ? (
          <WhatsappCampaignsPanel tenantId={current.id} />
        ) : aba === "campaigns" && !campaignsEnabled ? (
          <div className="erp-card p-6 text-sm text-muted-foreground">
            Campanhas WhatsApp estão desligadas. Ative em{" "}
            <span className="font-medium text-foreground">
              Minha loja → Impressão e extras → Mais recursos
            </span>
            .
          </div>
        ) : null}

        {aba === "api" ? (
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
            apiLoading={hub.apiLoading}
            apiSaving={hub.apiSaving}
            loadApiConfig={hub.loadApiConfig}
            saveApiConfig={hub.saveApiConfig}
            gatewayOnline={hub.gatewayOnline}
          />
        ) : null}
      </div>
    </div>
  );
}
