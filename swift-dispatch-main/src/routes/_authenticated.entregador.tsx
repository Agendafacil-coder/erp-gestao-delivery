import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Map, UserPlus } from "lucide-react";
import { OpsPage } from "@/components/ops/OpsPage";
import { OpsPageHeader } from "@/components/ops/OpsPageHeader";
import { DriversGrid } from "@/components/ops/DriversGrid";
import { DriverMobileApp } from "@/components/drivers/DriverMobileApp";
import { DriverFormDialog } from "@/components/drivers/DriverFormDialog";
import { useAuthAccess } from "@/hooks/useAuthAccess";
import { useOps } from "@/hooks/useOps";
import { useUnitView } from "@/hooks/useUnitView";
import { needsDispatch, STATUS_LABEL, normalizeOrderStatus } from "@/lib/ops/orderWorkflow";

export const Route = createFileRoute("/_authenticated/entregador")({
  component: EntregadorRoute,
});

function EntregadoresAdminPage() {
  const { tick, orders, drivers } = useOps();
  const { filterOrders, filterDrivers } = useUnitView();
  const [formOpen, setFormOpen] = useState(false);

  const scopedOrders = useMemo(() => filterOrders(orders), [filterOrders, orders]);
  const scopedDrivers = useMemo(
    () => filterDrivers(scopedOrders, drivers),
    [scopedOrders, drivers, filterDrivers],
  );
  const onlineCount = scopedDrivers.filter((d) => d.status !== "offline").length;
  const unassignedOrders = useMemo(
    () => scopedOrders.filter((o) => !o.driver_id && needsDispatch(o.status)),
    [scopedOrders],
  );

  return (
    <OpsPage>
      <OpsPageHeader
        title="Entregadores"
        description="Gerencie a frota, atribua pedidos prontos e acompanhe o desempenho do dia."
        highlight={`${onlineCount} online · ${scopedDrivers.length} cadastrados`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="erp-btn-primary inline-flex items-center gap-2 text-sm"
            >
              <UserPlus className="size-4" />
              Cadastrar entregador
            </button>
            <Link
              to="/mapa"
              className="erp-btn-secondary inline-flex items-center gap-2 text-sm"
            >
              <Map className="size-4" />
              Mapa ao vivo
            </Link>
          </div>
        }
      />

      {unassignedOrders.length > 0 ? (
        <div className="mb-4 rounded-xl border border-warning/25 bg-warning/10 px-4 py-3 space-y-2">
          <p className="text-sm text-foreground">
            <span className="font-semibold">{unassignedOrders.length}</span>{" "}
            {unassignedOrders.length === 1 ? "pedido sem entregador" : "pedidos sem entregador"} — use{" "}
            <span className="font-medium">Atribuir pedido</span> no card do entregador abaixo.
          </p>
          <ul className="flex flex-wrap gap-2">
            {unassignedOrders.slice(0, 8).map((o) => (
              <li
                key={o.id}
                className="text-xs font-mono px-2 py-1 rounded-md bg-background/80 border border-border"
              >
                {o.code}{" "}
                <span className="text-muted-foreground font-sans">
                  · {STATUS_LABEL[normalizeOrderStatus(o.status)]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <DriversGrid tick={tick} drivers={scopedDrivers} orders={scopedOrders} />

      <DriverFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </OpsPage>
  );
}

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

  if (isDriver) {
    return (
      <OpsPage className="flex-1 flex flex-col min-h-0 p-0 max-w-none">
        <DriverMobileApp />
      </OpsPage>
    );
  }

  return <EntregadoresAdminPage />;
}
