import { createFileRoute, Link } from "@tanstack/react-router";
import { OpsPage } from "@/components/ops/OpsPage";
import { DriverMobileApp } from "@/components/drivers/DriverMobileApp";
import { useAuthAccess } from "@/hooks/useAuthAccess";
import { ArrowRight, Bike } from "lucide-react";

export const Route = createFileRoute("/_authenticated/entregador")({
  component: EntregadorRoute,
});

function EntregadorRoute() {
  const { profile, loading } = useAuthAccess();
  const isDriver = profile === "driver";

  if (loading) {
    return (
      <OpsPage className="flex-1 flex items-center justify-center">
        <span className="text-sm text-muted-foreground">Carregando…</span>
      </OpsPage>
    );
  }

  if (!isDriver) {
    return (
      <OpsPage className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <Bike className="size-12 mx-auto text-primary/60" />
          <h1 className="text-xl font-bold">Área do entregador</h1>
          <p className="text-sm text-muted-foreground">
            Como administrador, gerencie a frota na Central Operacional: status, métricas,
            atribuição de pedidos e histórico.
          </p>
          <Link
            to="/central"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
          >
            Abrir Central
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </OpsPage>
    );
  }

  return (
    <OpsPage className="flex-1 flex flex-col min-h-0 p-0 max-w-none">
      <DriverMobileApp />
    </OpsPage>
  );
}
