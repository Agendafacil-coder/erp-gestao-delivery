import { useMemo, useState } from "react";
import { getAutomationHistoryFn } from "@/functions/automationHistory";
import { useAutoDispatch } from "@/hooks/useAutoDispatch";
import { useAutomationSettings } from "@/hooks/useAutomationSettings";
import { useOps } from "@/hooks/useOps";
import { useTenant } from "@/hooks/useTenant";
import { LIVE_AUTOMATIONS } from "@/lib/ops/automationRegistry";

export function useAutomationsPage() {
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

  const [selectedId, setSelectedId] = useState(LIVE_AUTOMATIONS[0]?.id ?? "");

  const isRuleEnabled = (ruleId: string) =>
    ruleId === "auto-dispatch" ? autoDispatchEnabled : isEnabled(ruleId);

  const toggleRule = (ruleId: string, enabled: boolean) => {
    if (ruleId === "auto-dispatch") {
      void toggleAutoDispatch(enabled);
      return;
    }
    void setRuleEnabled(ruleId, enabled);
  };

  const sessionStats = useMemo(() => {
    const delayed = orders.filter((o) => {
      const elapsed = (Date.now() - new Date(o.placed_at).getTime()) / 60000;
      return elapsed > o.sla_minutes && o.status !== "entregue" && o.status !== "cancelado";
    }).length;
    const inPrep = orders.filter((o) => o.status === "em_preparo").length;
    const activeDrivers = drivers.filter((d) => d.status !== "offline").length;
    return {
      delayed,
      inPrep,
      activeDrivers,
      events: automationLogs.length,
    };
  }, [orders, drivers, automationLogs.length]);

  const eventCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const log of automationLogs) {
      map.set(log.ruleId, (map.get(log.ruleId) ?? 0) + 1);
    }
    return map;
  }, [automationLogs]);

  const lastEventAt = useMemo(() => {
    const map = new Map<string, string>();
    for (const log of automationLogs) {
      if (!map.has(log.ruleId)) map.set(log.ruleId, log.at);
    }
    return map;
  }, [automationLogs]);

  const exportFullHistory = current?.id
    ? () => getAutomationHistoryFn({ data: { tenantId: current.id } })
    : undefined;

  return {
    tenantId: current?.id,
    selectedId,
    setSelectedId,
    isRuleEnabled,
    toggleRule,
    togglesBusy: togglesSaving || togglesLoading || dispatchSaving,
    automationLogs,
    sseConnected,
    clearAutomationLogs,
    sessionStats,
    eventCounts,
    lastEventAt,
    exportFullHistory,
  };
}
