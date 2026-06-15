import { AutomationConfigHints } from "@/components/ops/automations/AutomationConfigHints";
import { AutomationConsole } from "@/components/ops/automations/AutomationConsole";
import { AutomationDetailPanel } from "@/components/ops/automations/AutomationDetailPanel";
import { AutomationRulesList } from "@/components/ops/automations/AutomationRulesList";
import { AutomationStatsRow } from "@/components/ops/automations/AutomationStatsRow";
import type { AutomationEvent } from "@/lib/ops/detectAutomationEvents";

type Props = {
  selectedId: string;
  onSelect: (id: string) => void;
  isRuleEnabled: (ruleId: string) => boolean;
  onToggleRule: (ruleId: string, enabled: boolean) => void;
  togglesBusy?: boolean;
  automationLogs: AutomationEvent[];
  sseConnected?: boolean;
  onClear?: () => void;
  onExportFullHistory?: () => Promise<Array<AutomationEvent & { atIso?: string }>>;
  sessionStats: {
    events: number;
    delayed: number;
    inPrep: number;
    activeDrivers: number;
  };
  eventCounts: Map<string, number>;
  lastEventAt: Map<string, string>;
};

export function AutomationsRulesTab({
  selectedId,
  onSelect,
  isRuleEnabled,
  onToggleRule,
  togglesBusy,
  automationLogs,
  sseConnected,
  onClear,
  onExportFullHistory,
  sessionStats,
  eventCounts,
  lastEventAt,
}: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start min-w-0">
      <div className="lg:col-span-4 min-w-0">
        <AutomationRulesList
          selectedId={selectedId}
          onSelect={onSelect}
          isRuleEnabled={isRuleEnabled}
          onToggleRule={onToggleRule}
          togglesBusy={togglesBusy}
          eventCounts={eventCounts}
          lastEventAt={lastEventAt}
          sseConnected={sseConnected}
        />
      </div>

      <div className="lg:col-span-8 flex flex-col gap-4 min-w-0">
        <AutomationStatsRow stats={sessionStats} />
        <AutomationDetailPanel automationId={selectedId} enabled={isRuleEnabled(selectedId)} />
        <AutomationConsole
          logs={automationLogs}
          selectedRuleId={selectedId}
          onClear={onClear}
          onExportFullHistory={onExportFullHistory}
        />
        <AutomationConfigHints />
      </div>
    </div>
  );
}
