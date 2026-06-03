import { useCallback, useEffect, useMemo, useState } from "react";
import type { DashboardKpiId } from "@/lib/ops/dashboardMetrics";
import {
  type DashboardSectionId,
  type DashboardWidgetId,
  ALL_DASHBOARD_WIDGET_IDS,
  ALL_DASHBOARD_KPI_IDS,
  ALL_DASHBOARD_SECTION_IDS,
  DEFAULT_VISIBLE_WIDGETS,
  loadVisibleDashboardWidgets,
  saveVisibleDashboardWidgets,
} from "@/lib/ops/dashboardVisibilityConfig";

export function useDashboardVisibility() {
  const [visibleIds, setVisibleIds] = useState<DashboardWidgetId[]>(loadVisibleDashboardWidgets);

  useEffect(() => {
    saveVisibleDashboardWidgets(visibleIds);
  }, [visibleIds]);

  const visibleSet = useMemo(() => new Set(visibleIds), [visibleIds]);

  const isVisible = useCallback((id: DashboardWidgetId) => visibleSet.has(id), [visibleSet]);

  const toggle = useCallback((id: DashboardWidgetId) => {
    setVisibleIds((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= 1) return prev;
        return prev.filter((x) => x !== id);
      }
      return [...prev, id];
    });
  }, []);

  const showAll = useCallback(() => {
    setVisibleIds([...DEFAULT_VISIBLE_WIDGETS]);
  }, []);

  const resetToDefault = useCallback(() => {
    setVisibleIds([...DEFAULT_VISIBLE_WIDGETS]);
  }, []);

  const visibleKpiIds = useMemo(
    () => ALL_DASHBOARD_KPI_IDS.filter((id) => visibleSet.has(id)),
    [visibleSet],
  );

  const visibleSectionIds = useMemo(
    () => ALL_DASHBOARD_SECTION_IDS.filter((id) => visibleSet.has(id)),
    [visibleSet],
  );

  const isSectionVisible = useCallback(
    (id: DashboardSectionId) => visibleSet.has(id),
    [visibleSet],
  );

  const isKpiVisible = useCallback(
    (id: DashboardKpiId) => visibleSet.has(id),
    [visibleSet],
  );

  const hiddenCount = ALL_DASHBOARD_WIDGET_IDS.length - visibleIds.length;

  return {
    visibleIds,
    visibleKpiIds,
    visibleSectionIds,
    isVisible,
    isKpiVisible,
    isSectionVisible,
    toggle,
    showAll,
    resetToDefault,
    hiddenCount,
  };
}
