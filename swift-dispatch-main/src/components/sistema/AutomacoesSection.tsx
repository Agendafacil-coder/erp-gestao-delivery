import { AutomationsRulesTab } from "@/components/ops/automations/AutomationsRulesTab";
import { Food99IntegrationPanel } from "@/components/ops/Food99IntegrationPanel";
import { IfoodIntegrationPanel } from "@/components/ops/IfoodIntegrationPanel";
import { RappiIntegrationPanel } from "@/components/ops/RappiIntegrationPanel";
import { useAutomationsPage } from "@/hooks/useAutomationsPage";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useTenant } from "@/hooks/useTenant";
import type { AutomacoesAba } from "@/lib/sistema/search";

type Props = {
  aba: AutomacoesAba;
  onAbaChange: (aba: AutomacoesAba) => void;
};

export function AutomacoesSection({ aba, onAbaChange }: Props) {
  const { current } = useTenant();
  const { enabled: featureEnabled } = useFeatureFlags(current?.id);
  const rappiEnabled = featureEnabled("marketplace_rappi");
  const food99Enabled = featureEnabled("marketplace_99food");
  const page = useAutomationsPage();

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground max-w-xl">
          Avisos do dia a dia (atraso, área de entrega) e pedidos do iFood. Escolha o que quer
          configurar.
        </p>
        <div className="segmented-control w-full sm:w-auto shrink-0">
          <button
            type="button"
            data-active={aba === "regras"}
            onClick={() => onAbaChange("regras")}
            className="segmented-item text-xs"
          >
            Avisos automáticos
          </button>
          <button
            type="button"
            data-active={aba === "ifood"}
            onClick={() => onAbaChange("ifood")}
            className="segmented-item text-xs"
          >
            iFood
          </button>
          {rappiEnabled ? (
            <button
              type="button"
              data-active={aba === "rappi"}
              onClick={() => onAbaChange("rappi")}
              className="segmented-item text-xs"
            >
              Rappi
            </button>
          ) : null}
          {food99Enabled ? (
            <button
              type="button"
              data-active={aba === "99food"}
              onClick={() => onAbaChange("99food")}
              className="segmented-item text-xs"
            >
              99Food
            </button>
          ) : null}
        </div>
      </div>

      {aba === "ifood" && current?.id ? <IfoodIntegrationPanel tenantId={current.id} /> : null}

      {aba === "rappi" && current?.id && rappiEnabled ? (
        <RappiIntegrationPanel tenantId={current.id} />
      ) : aba === "rappi" && !rappiEnabled ? (
        <div className="erp-card p-6 text-sm text-muted-foreground">
          Rappi ainda não está ligado. Ative em Minha loja → Impressão e extras → Mais recursos.
        </div>
      ) : null}

      {aba === "99food" && current?.id && food99Enabled ? (
        <Food99IntegrationPanel tenantId={current.id} />
      ) : aba === "99food" && !food99Enabled ? (
        <div className="erp-card p-6 text-sm text-muted-foreground">
          99Food ainda não está ligado. Ative em Minha loja → Impressão e extras → Mais recursos.
        </div>
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
