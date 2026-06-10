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
import { useTenant } from "@/hooks/useTenant";
import { useAutoDispatch } from "@/hooks/useAutoDispatch";
import { AutoDispatchToggle } from "@/components/ops/AutoDispatchToggle";
import { needsDispatch, STATUS_LABEL, normalizeOrderStatus } from "@/lib/ops/orderWorkflow";
import { canBatchDispatch } from "@/lib/roles";

export const Route = createFileRoute("/_authenticated/entregador")({
  component: EntregadorRoute,
  head: () => ({
    meta: [
      { title: "Delivery OS — Entregador" },
      {
        name: "description",
        content: "App do entregador: pedidos atribuídos, scanner de etiquetas e notificações.",
      },
      { name: "theme-color", content: "#6366f1" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "mobile-web-app-capable", content: "yes" },
    ],
    links: [
      { rel: "manifest", href: "/manifest-entregador.webmanifest" },
      { rel: "apple-touch-icon", href: "/icons/driver-192.png", sizes: "192x192" },
      { rel: "icon", href: "/icons/driver-192.png", sizes: "192x192", type: "image/png" },
    ],
  }),
});

function EntregadoresAdminPage() {
  const { current } = useTenant();
  const { role } = useAuthAccess();
  const canDispatch = canBatchDispatch(role);
  const { tick, orders, drivers, fetchData } = useOps();
  const { filterOrders, filterDrivers } = useUnitView();
  const [formOpen, setFormOpen] = useState(false);

  const {
    enabled: autoDispatchEnabled,
    loading: autoDispatchLoading,
    saving: autoDispatchSaving,
    toggle: toggleAutoDispatch,
  } = useAutoDispatch(current?.id, fetchData);

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
            {canDispatch ? (
              <AutoDispatchToggle
                enabled={autoDispatchEnabled}
                loading={autoDispatchLoading}
                saving={autoDispatchSaving}
                onToggle={toggleAutoDispatch}
              />
            ) : null}
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

      <DriversGrid
        tick={tick}
        drivers={scopedDrivers}
        orders={scopedOrders}
        showBatchDispatch={canDispatch && !autoDispatchEnabled}
      />

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
