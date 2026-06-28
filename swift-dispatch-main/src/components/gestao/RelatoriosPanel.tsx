import { useState } from "react";
import { OperationalReportsView } from "@/components/reports/OperationalReportsView";
import { useTenant } from "@/hooks/useTenant";
import { useOps } from "@/hooks/useOps";
import { useOperationalReports } from "@/hooks/useOperationalReports";
import {
  monthStartIsoDate,
  todayIsoDate,
  rangeFromPreset,
  type ReportDatePreset,
} from "@/lib/ops/operationalReports";

export function RelatoriosPanel() {
  const { current } = useTenant();
  const { orders, drivers } = useOps();
  const tenantId = current?.id;

  const [preset, setPreset] = useState<ReportDatePreset>("last7");
  const [customFrom, setCustomFrom] = useState(monthStartIsoDate());
  const [customTo, setCustomTo] = useState(todayIsoDate());

  const handlePresetChange = (next: ReportDatePreset) => {
    setPreset(next);
    if (next !== "custom") {
      const r = rangeFromPreset(next);
      setCustomFrom(r.from);
      setCustomTo(r.to);
    }
  };

  const { report, loading } = useOperationalReports({
    tenantId,
    orders,
    drivers,
    preset,
    customRange: { from: customFrom, to: customTo },
  });

  return (
    <OperationalReportsView
      report={report}
      loading={loading}
      preset={preset}
      customFrom={customFrom}
      customTo={customTo}
      onPresetChange={handlePresetChange}
      onCustomFromChange={setCustomFrom}
      onCustomToChange={setCustomTo}
    />
  );
}
