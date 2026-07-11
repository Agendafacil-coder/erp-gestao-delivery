import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { OpsPage } from "@/components/ops/OpsPage";
import { OpsPageHeader } from "@/components/ops/OpsPageHeader";
import { CrmClientesPanel } from "@/components/crm/CrmClientesPanel";
import { useTenant } from "@/hooks/useTenant";

export const Route = createFileRoute("/_authenticated/clientes")({
  component: ClientesCrmPage,
});

function ClientesCrmPage() {
  const { current } = useTenant();

  return (
    <OpsPage className="space-y-6 max-h-[calc(100dvh-8rem)] overflow-y-auto">
      <OpsPageHeader
        subtitle="CRM"
        icon={Users}
        iconClassName="text-primary"
        title="Clientes"
        description="Base por telefone e nome dos pedidos, preferências e promoções no WhatsApp."
        className="pb-2"
      />

      {current ? <CrmClientesPanel tenantId={current.id} /> : null}
    </OpsPage>
  );
}
