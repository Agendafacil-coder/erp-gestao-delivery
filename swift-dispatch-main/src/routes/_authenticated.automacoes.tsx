import { OpsPage } from "@/components/ops/OpsPage";
import { OpsPageHeader } from "@/components/ops/OpsPageHeader";
import { AutomationsRulesTab } from "@/components/ops/automations/AutomationsRulesTab";
import { IfoodIntegrationPanel } from "@/components/ops/IfoodIntegrationPanel";
import { useAutomationsPage } from "@/hooks/useAutomationsPage";
import { useTenant } from "@/hooks/useTenant";
import { createFileRoute } from "@tanstack/react-router";
import { Zap } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/automacoes")({
  component: AutomationsPage,
});

function AutomationsPage() {
  const { current } = useTenant();
  const page = useAutomationsPage();
  const [pageTab, setPageTab] = useState<"regras" | "ifood">("regras");

  return (
    <OpsPage className="space-y-4">
      <OpsPageHeader
        subtitle="Operação"
        icon={Zap}
        iconClassName="text-primary"
        title="Automações"
        description="Regras que rodam sozinhas — WhatsApp, atrasos, iFood e despacho. Escolha uma regra à esquerda para ver como funciona; o console registra cada execução."
        className="pb-0"
      />

      <div className="segmented-control w-full sm:w-auto">
        <button
          type="button"
          data-active={pageTab === "regras"}
          onClick={() => setPageTab("regras")}
          className="segmented-item text-xs"
        >
          Regras e console
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

      {pageTab === "ifood" && current?.id ? (
        <IfoodIntegrationPanel tenantId={current.id} />
      ) : null}

      {pageTab === "regras" ? (
        <AutomationsRulesTab
          selectedId={page.selectedId}
          onSelect={page.setSelectedId}
          isRuleEnabled={page.isRuleEnabled}
          onToggleRule={page.toggleRule}
          togglesBusy={page.togglesBusy}
          automationLogs={page.automationLogs}
          sseConnected={page.sseConnected}
          onClear={page.clearAutomationLogs}
          onExportFullHistory={page.exportFullHistory}
          sessionStats={page.sessionStats}
          eventCounts={page.eventCounts}
          lastEventAt={page.lastEventAt}
        />
      ) : null}
    </OpsPage>
  );
}
