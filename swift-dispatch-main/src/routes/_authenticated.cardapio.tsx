import { createFileRoute } from "@tanstack/react-router";
import { OpsSidebar } from "@/components/ops/Sidebar";
import { OpsHeader } from "@/components/ops/Header";
import { Onboarding } from "@/components/ops/Onboarding";
import { MenuManager } from "@/components/menu/admin/MenuManager";
import { useTenant } from "@/hooks/useTenant";
import { useOps } from "@/hooks/useOps";

export const Route = createFileRoute("/_authenticated/cardapio")({
  component: CardapioAdminPage,
});

function CardapioAdminPage() {
  const { current, loading } = useTenant();
  const { tick } = useOps();

  return (
    <div className="min-h-screen flex">
      <OpsSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <OpsHeader tick={tick} />
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            Carregando…
          </div>
        ) : !current ? (
          <Onboarding />
        ) : (
          <main className="flex-1 overflow-y-auto bg-[#0f172a]/40 p-5 md:p-8">
            <MenuManager tenantId={current.id} tenantSlug={current.slug} />
          </main>
        )}
      </div>
    </div>
  );
}
