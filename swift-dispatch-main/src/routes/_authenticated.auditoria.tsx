import { OpsPage } from "@/components/ops/OpsPage";
import { HistoryPanel } from "@/components/ops/HistoryPanel";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/auditoria")({
  component: AuditPage,
});

function AuditPage() {
  return (
    <OpsPage className="!space-y-0 min-h-0">
      <HistoryPanel />
    </OpsPage>
  );
}
