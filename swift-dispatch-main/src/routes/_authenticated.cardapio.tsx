import { createFileRoute } from "@tanstack/react-router";
import { OpsPage } from "@/components/ops/OpsPage";
import { MenuManager } from "@/components/menu/admin/MenuManager";
import { useTenant } from "@/hooks/useTenant";

export const Route = createFileRoute("/_authenticated/cardapio")({
  component: CardapioAdminPage,
});

function CardapioAdminPage() {
  const { current } = useTenant();

  return (
    <OpsPage className="!space-y-0">
      {current ? (
        <MenuManager tenantId={current.id} tenantSlug={current.slug} />
      ) : null}
    </OpsPage>
  );
}
