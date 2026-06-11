import { OpsPage } from "@/components/ops/OpsPage";
import { AuditPanel } from "@/components/ops/AuditPanel";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/auditoria")({
  component: AuditPage,
});

function AuditPage() {
  return (
    <OpsPage className="!space-y-0 min-h-0">
      <AuditPanel />
    </OpsPage>
  );
}
