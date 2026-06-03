import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FileBarChart } from "lucide-react";
import { OpsPage } from "@/components/ops/OpsPage";
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

export const Route = createFileRoute("/_authenticated/relatorios")({
  component: RelatoriosPage,
});

function RelatoriosPage() {
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
    <OpsPage className="space-y-6 max-h-[calc(100dvh-8rem)] overflow-y-auto">
      <div className="border-b border-border/40 pb-4">
        <div className="flex items-center gap-2">
          <FileBarChart className="size-4 text-primary" />
          <span className="text-xs text-muted-foreground">Gestão operacional</span>
        </div>
        <h1 className="erp-page-title mt-1">Relatórios operacionais</h1>
        <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
          Decisões práticas sobre vendas, regiões, cancelamentos, tempos e clientes. Faturamento
          considera apenas pedidos entregues.
        </p>
      </div>

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
    </OpsPage>
  );
}
