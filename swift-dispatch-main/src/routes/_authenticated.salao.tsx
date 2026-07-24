import { createFileRoute, Link } from "@tanstack/react-router";
import { Armchair, Loader2 } from "lucide-react";
import { OpsPage } from "@/components/ops/OpsPage";
import { OpsPageHeader } from "@/components/ops/OpsPageHeader";
import { SalonPanel } from "@/components/salon/SalonPanel";
import { WaiterMobileSalon } from "@/components/salon/WaiterMobileSalon";
import { useAuthAccess } from "@/hooks/useAuthAccess";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useTenant } from "@/hooks/useTenant";

export const Route = createFileRoute("/_authenticated/salao")({
  component: SalaoPage,
});

function SalaoPage() {
  const { current } = useTenant();
  const { enabled, loading } = useFeatureFlags(current?.id);
  const { profile, role } = useAuthAccess();
  const isWaiter = profile === "waiter" || role === "waiter";

  if (isWaiter) {
    return (
      <div className="flex flex-col min-h-0 flex-1 px-3 pt-2">
        {!current || loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Carregando…
          </div>
        ) : !enabled("salon_mode") ? (
          <SalonDisabledHint forWaiter />
        ) : (
          <WaiterMobileSalon tenantId={current.id} />
        )}
      </div>
    );
  }

  return (
    <OpsPage className="space-y-6 max-h-[calc(100dvh-8rem)] overflow-y-auto">
      <OpsPageHeader
        subtitle="Salão"
        icon={Armchair}
        iconClassName="text-primary"
        title="Mesas e comandas"
        description="Abra comandas por mesa, lance rodadas para a cozinha e feche a conta no caixa."
        className="pb-2"
      />

      {!current || loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Carregando…
        </div>
      ) : !enabled("salon_mode") ? (
        <SalonDisabledHint />
      ) : (
        <SalonPanel tenantId={current.id} />
      )}
    </OpsPage>
  );
}

function SalonDisabledHint({ forWaiter }: { forWaiter?: boolean }) {
  return (
    <div className="erp-card p-8 text-center space-y-3">
      <Armchair className="size-8 mx-auto text-muted-foreground/40" />
      <p className="text-sm font-medium">O modo Salão está desligado para esta loja.</p>
      {forWaiter ? (
        <p className="text-xs text-muted-foreground">
          Peça ao gerente para ativar “Salão e mesas” nas configurações.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Ative a função “Salão e mesas” em{" "}
          <Link
            to="/sistema"
            search={{ secao: "configs", aba: "operacao" }}
            className="text-primary underline underline-offset-2"
          >
            Sistema → Configurações → Operação
          </Link>{" "}
          para usar mesas e comandas.
        </p>
      )}
    </div>
  );
}
