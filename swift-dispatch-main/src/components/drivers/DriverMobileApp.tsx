import { useState } from "react";
import { toast } from "sonner";
import {
  Bike,
  DollarSign,
  History,
  Loader2,
  Package,
  Power,
} from "lucide-react";
import { DriverOrderCard } from "@/components/drivers/DriverOrderCard";
import { DriverRouteCard } from "@/components/drivers/DriverRouteCard";
import { DRIVER_STATUS_UI } from "@/lib/drivers/driverStats";
import { useDriverOps } from "@/hooks/useDriverOps";
import { useDriverGps } from "@/hooks/useDriverGps";
import { soundService } from "@/lib/services/SoundService";

type Tab = "entregas" | "ganhos" | "historico";

export function DriverMobileApp() {
  const { data, loading, setOnline, applyAction, refresh } = useDriverOps();
  const [tab, setTab] = useState<Tab>("entregas");
  const [busy, setBusy] = useState(false);

  const driver = data?.driver;
  const isOnline = driver ? driver.status !== "offline" : false;
  const statusUi = driver ? DRIVER_STATUS_UI[driver.status] : null;

  useDriverGps({
    driverId: driver?.id ?? null,
    enabled: isOnline,
  });

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-6 text-center gap-3">
        <Bike className="size-12 text-muted-foreground/40" />
        <h2 className="text-lg font-semibold">Conta não vinculada</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          Peça ao administrador para vincular seu usuário a um cadastro de entregador.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col min-h-0 max-w-lg mx-auto w-full">
      <header className="shrink-0 px-4 pt-3 pb-3 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-base font-bold truncate">{driver.name}</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <span className={`size-2 rounded-full ${statusUi?.dot ?? "bg-muted"}`} />
              {statusUi?.label ?? "—"}
              <span>· {data.stats.deliveriesToday} entregas hoje</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              void run(async () => {
                await setOnline(!isOnline);
                toast.success(isOnline ? "Você está offline" : "Você está online", {
                  icon: isOnline ? "🔴" : "🟢",
                });
              })
            }
            className={`touch-target p-3 rounded-xl border transition ${
              isOnline
                ? "border-success/40 bg-success/10 text-success"
                : "border-border bg-muted text-muted-foreground"
            }`}
            aria-label={isOnline ? "Ficar offline" : "Ficar online"}
          >
            <Power className="size-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-24">
        {tab === "entregas" && (
          <>
            {data.myOrders.length > 0 && (
              <DriverRouteCard
                orders={data.myOrders}
                store={data.store}
                driverPosition={
                  driver.lat != null && driver.lng != null
                    ? { lat: driver.lat, lng: driver.lng }
                    : null
                }
              />
            )}

            <section className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Pedidos atribuídos
              </h2>
              {data.myOrders.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border py-14 text-center space-y-2">
                  <Package className="size-10 mx-auto text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                    {isOnline
                      ? "Nenhum pedido atribuído a você ainda. Peça à central para atribuir em Entregadores ou na Central."
                      : "Fique online para ver os pedidos que a operação atribuir a você."}
                  </p>
                  <button
                    type="button"
                    onClick={() => void refresh()}
                    className="text-xs text-primary font-medium"
                  >
                    Atualizar
                  </button>
                </div>
              ) : (
                data.myOrders.map((order) => (
                  <DriverOrderCard
                    key={order.id}
                    order={order}
                    storeLabel={data.store?.name}
                    storeAddress={data.store?.address}
                    busy={busy}
                    onRetirei={() =>
                      void run(async () => {
                        await applyAction(order.id, "retirei_pedido");
                        toast.success("Retirada registrada");
                      })
                    }
                    onSaiu={() =>
                      void run(async () => {
                        await applyAction(order.id, "saiu_entrega");
                        toast.success("Saiu para entrega");
                      })
                    }
                    onEntregue={() =>
                      void run(async () => {
                        await applyAction(order.id, "entregue");
                        soundService.playDeliveryCompleted();
                        toast.success("Entrega concluída!");
                      })
                    }
                  />
                ))
              )}
            </section>
          </>
        )}

        {tab === "ganhos" && (
          <section className="rounded-2xl border border-border bg-card p-6 text-center space-y-4">
            <div className="size-12 rounded-full bg-success/10 flex items-center justify-center mx-auto">
              <DollarSign className="size-6 text-success" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Ganhos do dia
              </p>
              <p className="text-4xl font-black tabular-nums mt-1">
                R$ {data.stats.earningsToday.toFixed(2)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-left text-sm border-t border-border pt-4">
              <div>
                <p className="text-muted-foreground text-xs">Entregas</p>
                <p className="font-semibold">{data.stats.deliveriesToday}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Tempo médio</p>
                <p className="font-semibold">
                  {data.stats.avgDeliveryMinutes != null
                    ? `${data.stats.avgDeliveryMinutes} min`
                    : "—"}
                </p>
              </div>
            </div>
          </section>
        )}

        {tab === "historico" && (
          <section className="space-y-2">
            {data.history.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma entrega concluída ainda.
              </p>
            ) : (
              data.history.map((h) => (
                <div
                  key={h.orderId}
                  className="rounded-xl border border-border bg-card p-3 flex justify-between gap-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-mono font-semibold">{h.code}</p>
                    <p className="text-xs text-muted-foreground truncate">{h.customerName}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-success">R$ {h.payout.toFixed(2)}</p>
                    {h.durationMinutes != null && (
                      <p className="text-[10px] text-muted-foreground">{h.durationMinutes} min</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </section>
        )}
      </main>

      <nav className="shrink-0 fixed bottom-0 left-0 right-0 max-w-lg mx-auto border-t border-border bg-card/95 backdrop-blur-md flex justify-around py-2 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] z-20">
        {(
          [
            ["entregas", Bike, "Entregas"],
            ["ganhos", DollarSign, "Ganhos"],
            ["historico", History, "Histórico"],
          ] as const
        ).map(([key, Icon, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex flex-col items-center justify-center gap-0.5 min-h-[2.75rem] min-w-[4.5rem] px-3 py-2 text-[10px] font-bold rounded-lg ${
              tab === key ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Icon className="size-5" />
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
