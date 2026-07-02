import { AutomationsRulesTab } from "@/components/ops/automations/AutomationsRulesTab";
import { IfoodIntegrationPanel } from "@/components/ops/IfoodIntegrationPanel";
import { useAutomationsPage } from "@/hooks/useAutomationsPage";
import { useTenant } from "@/hooks/useTenant";
import type { AutomacoesAba } from "@/lib/sistema/search";

type Props = {
  aba: AutomacoesAba;
  onAbaChange: (aba: AutomacoesAba) => void;
};

export function AutomacoesSection({ aba, onAbaChange }: Props) {
  const { current } = useTenant();
  const page = useAutomationsPage();

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
            data-active={aba === "regras"}
            onClick={() => onAbaChange("regras")}
            className="segmented-item text-xs"
          >
            Regras e console
          </button>
          <button
            type="button"
            data-active={aba === "ifood"}
            onClick={() => onAbaChange("ifood")}
            className="segmented-item text-xs"
          >
            Integração iFood
          </button>
        </div>
      </div>

      {aba === "ifood" && current?.id ? (
        <IfoodIntegrationPanel tenantId={current.id} />
      ) : null}

      {aba === "regras" ? (
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
