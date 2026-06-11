import { OpsPage } from "@/components/ops/OpsPage";
import { OpsPageHeader } from "@/components/ops/OpsPageHeader";
import { AutomationFlowDetail, AutomationsLivePanel } from "@/components/ops/AutomationsLivePanel";
import { IfoodIntegrationPanel } from "@/components/ops/IfoodIntegrationPanel";
import { getAutomationHistoryFn } from "@/functions/automationHistory";
import { useAutoDispatch } from "@/hooks/useAutoDispatch";
import { useAutomationSettings } from "@/hooks/useAutomationSettings";
import { useOps } from "@/hooks/useOps";
import { useTenant } from "@/hooks/useTenant";
import { LIVE_AUTOMATIONS } from "@/lib/ops/automationRegistry";
import { createFileRoute } from "@tanstack/react-router";
import { Activity, Bike, CheckCircle, Clock, Flame } from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/_authenticated/automacoes")({
  component: AutomationsPage,
});

function AutomationsPage() {
  const { current } = useTenant();
  const { orders, drivers, automationLogs, sseConnected, clearAutomationLogs, fetchData } =
    useOps();
  const {
    isEnabled,
    setRuleEnabled,
    saving: togglesSaving,
    loading: togglesLoading,
  } = useAutomationSettings(current?.id);
  const {
    enabled: autoDispatchEnabled,
    toggle: toggleAutoDispatch,
    saving: dispatchSaving,
  } = useAutoDispatch(current?.id, () => void fetchData());
  const [selectedAutomationId, setSelectedAutomationId] = useState(LIVE_AUTOMATIONS[0]?.id ?? "");

  const isRuleEnabled = (ruleId: string) =>
    ruleId === "auto-dispatch" ? autoDispatchEnabled : isEnabled(ruleId);

  const handleToggleRule = (ruleId: string, enabled: boolean) => {
    if (ruleId === "auto-dispatch") {
      void toggleAutoDispatch(enabled);
      return;
    }
    void setRuleEnabled(ruleId, enabled);
  };
  const [pageTab, setPageTab] = useState<"regras" | "ifood">("regras");

  const sessionStats = useMemo(() => {
    const delayed = orders.filter((o) => {
      const elapsed = (Date.now() - new Date(o.placed_at).getTime()) / 60000;
      return elapsed > o.sla_minutes && o.status !== "entregue" && o.status !== "cancelado";
    }).length;
    const inPrep = orders.filter((o) => o.status === "em_preparo").length;
    const activeDrivers = drivers.filter((d) => d.status !== "offline").length;
    return { delayed, inPrep, activeDrivers, events: automationLogs.length };
  }, [orders, drivers, automationLogs.length]);

  return (
    <OpsPage className="ops-split-page !space-y-0">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="segmented-control w-full sm:w-auto">
          <button
            type="button"
            data-active={pageTab === "regras"}
            onClick={() => setPageTab("regras")}
            className="segmented-item text-xs"
          >
            Automações ativas
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

      {pageTab === "ifood" && current?.id ? <IfoodIntegrationPanel tenantId={current.id} /> : null}

      {pageTab === "regras" ? (
        <>
          <div className="mb-4 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success flex items-start gap-2">
            <CheckCircle className="size-4 shrink-0 mt-0.5" />
            <div>
              <strong>Automações reais ativas.</strong> Geofence, prazos de entrega, polling iFood e alertas
              operacionais rodam em background. O console reflete eventos persistidos e live via
              SSE.
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col space-y-4 min-h-0 lg:h-full overflow-y-auto pr-0 lg:pr-1">
            <OpsPageHeader
              subtitle="Operação"
              title="Motor de"
              highlight="Automações"
              description="Monitoramento em tempo real das regras do sistema."
              className="pb-0 shrink-0"
            />

            <AutomationsLivePanel
              automationLogs={automationLogs}
              sseConnected={sseConnected}
              selectedId={selectedAutomationId}
              onSelect={setSelectedAutomationId}
              onClear={clearAutomationLogs}
              isRuleEnabled={isRuleEnabled}
              onToggleRule={handleToggleRule}
              togglesBusy={togglesSaving || togglesLoading || dispatchSaving}
              onExportFullHistory={
                current?.id
                  ? () => getAutomationHistoryFn({ data: { tenantId: current.id } })
                  : undefined
              }
            />
          </div>

          <div className="lg:col-span-8 flex flex-col space-y-4 min-h-[280px] lg:min-h-0 lg:h-full overflow-y-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Eventos carregados", value: sessionStats.events, icon: Activity },
                { label: "Em atraso", value: sessionStats.delayed, icon: Clock },
                { label: "Em preparo", value: sessionStats.inPrep, icon: Flame },
                { label: "Entregadores online", value: sessionStats.activeDrivers, icon: Bike },
              ].map((stat) => (
                <div key={stat.label} className="erp-card p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    {stat.label}
                  </p>
                  <p className="text-xl font-bold text-foreground mt-1">{stat.value}</p>
                </div>
              ))}
            </div>

            <AutomationFlowDetail automationId={selectedAutomationId} />

            <div className="erp-card p-4 text-xs text-muted-foreground space-y-2">
              <p className="font-semibold text-foreground">Configuração</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Eventos server-side são persistidos no Postgres (últimos 80 por tenant).</li>
                <li>
                  Liga/desliga cada regra pelo switch na lista à esquerda (persistido no Postgres).
                </li>
                <li>
                  Limiares de prazo e gargalo de cozinha: <strong>Indicadores → Prazos</strong>
                </li>
                <li>
                  WhatsApp (gerente e cliente): hub WhatsApp + variáveis{" "}
                  <code className="text-[10px]">WHATSAPP_*</code>
                </li>
                <li>
                  Polling iFood server-side: aba <strong>Integração iFood</strong> ou{" "}
                  <code className="text-[10px]">npm run ifood:poll</code>
                </li>
                <li>
                  Geofence: constantes em <code className="text-[10px]">proximityConstants.ts</code>{" "}
                  (500 m / 100 m)
                </li>
              </ul>
            </div>
          </div>
        </>
      ) : null}
    </OpsPage>
  );
}
