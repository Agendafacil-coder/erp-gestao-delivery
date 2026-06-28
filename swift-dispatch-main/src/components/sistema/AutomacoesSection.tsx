import { useState } from "react";
import { AutomationsRulesTab } from "@/components/ops/automations/AutomationsRulesTab";
import { IfoodIntegrationPanel } from "@/components/ops/IfoodIntegrationPanel";
import { useAutomationsPage } from "@/hooks/useAutomationsPage";
import { useTenant } from "@/hooks/useTenant";

export function AutomacoesSection() {
  const { current } = useTenant();
  const page = useAutomationsPage();
  const [pageTab, setPageTab] = useState<"regras" | "ifood">("regras");

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground max-w-xl">
          Regras que rodam sozinhas — SLA, geofence, despacho e iFood. Escolha uma regra à esquerda;
          o console registra cada execução em tempo real.
        </p>
        <div className="segmented-control w-full sm:w-auto shrink-0">
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
    </div>
  );
}
