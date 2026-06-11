import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Bike,
  Clock,
  Filter,
  MapPin,
  Navigation,
  Package,
  Radio,
  Route,
  Search,
  Signal,
  SignalZero,
  User,
  Zap,
} from "lucide-react";
import { OpsMapbox, type MapMarker, type RouteLine, type RoutePath } from "@/components/map/OpsMapbox";
import { SP_CENTER, getMapboxToken } from "@/lib/map/constants";
import { fetchDrivingDirections } from "@/lib/map/directions";
import type { LocalDriver, LocalOrder } from "@/lib/db/localDb";
import { DRIVER_STATUS_UI } from "@/lib/drivers/driverStats";
import { STATUS_LABEL, isDriverActiveOrder } from "@/lib/ops/orderWorkflow";
import { getOpsDriversGpsHealthFn, getOpsOrderTrailFn } from "@/functions/tracking";
import { haversineKm } from "@/lib/map/geo";
import { ARRIVED_GEOFENCE_KM, ARRIVING_NOTIFY_KM } from "@/lib/geo/proximityGeofence";
import { soundService } from "@/lib/services/SoundService";
import { cn } from "@/lib/utils";

const PROXIMITY_KM = ARRIVING_NOTIFY_KM;

type TrackingFilter = "all" | "in_route" | "critical";

const FILTER_OPTIONS: Array<{ id: TrackingFilter; label: string }> = [
  { id: "all", label: "Todos" },
  { id: "in_route", label: "Em rota" },
  { id: "critical", label: "Críticos" },
];

type TrackingLiveViewProps = {
  tenantId: string;
  orders: LocalOrder[];
  drivers: LocalDriver[];
};

function driverOrders(orders: LocalOrder[], driverId: string) {
  return orders.filter((o) => o.driver_id === driverId && isDriverActiveOrder(o.status));
}

function matchesFilter(order: LocalOrder, filter: TrackingFilter) {
  if (filter === "in_route") return order.status === "em_rota_entrega";
  if (filter === "critical") return order.priority === "critica";
  return true;
}

export function TrackingLiveView({ tenantId, orders, drivers }: TrackingLiveViewProps) {
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [filter, setFilter] = useState<TrackingFilter>("all");
  const [trail, setTrail] = useState<Array<{ lat: number; lng: number }>>([]);
  const [gpsStaleByDriver, setGpsStaleByDriver] = useState<Record<string, number | null>>({});
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const [etaDistanceKm, setEtaDistanceKm] = useState<number | null>(null);
  const [drivingPath, setDrivingPath] = useState<Array<{ lng: number; lat: number }>>([]);
  const [trailProgress, setTrailProgress] = useState(100);
  const proximityNotifiedRef = useRef<Set<string>>(new Set());

  const activeOrders = useMemo(
    () => orders.filter((o) => isDriverActiveOrder(o.status)),
    [orders],
  );

  const filteredOrders = useMemo(
    () => activeOrders.filter((o) => matchesFilter(o, filter)),
    [activeOrders, filter],
  );

  const onlineDrivers = useMemo(
    () => drivers.filter((d) => d.status !== "offline"),
    [drivers],
  );

  const driversWithGps = useMemo(
    () => onlineDrivers.filter((d) => d.lat != null && d.lng != null),
    [onlineDrivers],
  );

  const ordersInRoute = useMemo(
    () => activeOrders.filter((o) => o.driver_id && o.status === "em_rota_entrega"),
    [activeOrders],
  );

  const filteredDrivers = useMemo(() => {
    if (filter === "all") return onlineDrivers;
    const driverIds = new Set(
      filteredOrders.map((o) => o.driver_id).filter((id): id is string => Boolean(id)),
    );
    return onlineDrivers.filter(
      (d) => driverIds.has(d.id) || (filter === "in_route" && d.status === "em_rota"),
    );
  }, [onlineDrivers, filteredOrders, filter]);

  const selectedDriver = useMemo(() => {
    const id = selectedOrderId
      ? activeOrders.find((o) => o.id === selectedOrderId)?.driver_id
      : selectedDriverId;
    return id ? drivers.find((d) => d.id === id) ?? null : null;
  }, [activeOrders, drivers, selectedDriverId, selectedOrderId]);

  const selectedOrder = useMemo(
    () => (selectedOrderId ? activeOrders.find((o) => o.id === selectedOrderId) ?? null : null),
    [activeOrders, selectedOrderId],
  );

  const focusDriverId = selectedOrder?.driver_id ?? selectedDriverId;

  useEffect(() => {
    if (selectedOrderId && !filteredOrders.some((o) => o.id === selectedOrderId)) {
      setSelectedOrderId(null);
    }
    if (selectedDriverId && !filteredDrivers.some((d) => d.id === selectedDriverId)) {
      setSelectedDriverId(null);
    }
  }, [filter, filteredOrders, filteredDrivers, selectedOrderId, selectedDriverId]);

  useEffect(() => {
    setTrailProgress(100);
  }, [selectedOrderId]);

  useEffect(() => {
    if (
      !selectedOrder ||
      !selectedDriver?.lat ||
      !selectedDriver.lng ||
      selectedOrder.lat == null ||
      selectedOrder.lng == null
    ) {
      setEtaMinutes(null);
      setEtaDistanceKm(null);
      setDrivingPath([]);
      return;
    }

    let cancelled = false;
    const load = async () => {
      const result = await fetchDrivingDirections(
        { lng: selectedDriver.lng!, lat: selectedDriver.lat! },
        { lng: selectedOrder.lng!, lat: selectedOrder.lat! },
      );
      if (cancelled) return;
      if (!result) {
        setEtaMinutes(null);
        setEtaDistanceKm(null);
        setDrivingPath([]);
        return;
      }
      setEtaMinutes(result.durationMinutes);
      setEtaDistanceKm(result.distanceKm);
      setDrivingPath(result.coordinates);
    };

    void load();
    const interval = setInterval(() => void load(), 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [selectedOrder, selectedDriver]);

  useEffect(() => {
    if (!selectedOrderId) {
      setTrail([]);
      return;
    }

    let cancelled = false;
    const load = async () => {
      try {
        const payload = await getOpsOrderTrailFn({
          data: { tenantId, orderId: selectedOrderId },
        });
        if (!cancelled) setTrail(payload.trail);
      } catch {
        if (!cancelled) setTrail([]);
      }
    };

    void load();
    const interval = setInterval(() => void load(), 15_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [tenantId, selectedOrderId]);

  useEffect(() => {
    if (onlineDrivers.length === 0) {
      setGpsStaleByDriver({});
      return;
    }

    let cancelled = false;
    const load = async () => {
      try {
        const payload = await getOpsDriversGpsHealthFn({
          data: {
            tenantId,
            driverIds: onlineDrivers.map((d) => d.id),
          },
        });
        if (cancelled) return;
        const map: Record<string, number | null> = {};
        for (const row of payload.drivers) {
          map[row.driverId] = row.staleMinutes;
        }
        setGpsStaleByDriver(map);
      } catch {
        /* silencioso */
      }
    };

    void load();
    const interval = setInterval(() => void load(), 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [tenantId, onlineDrivers]);

  const proximityAlerts = useMemo(() => {
    const list: Array<{
      order: LocalOrder;
      driver: LocalDriver;
      distanceM: number;
    }> = [];

    for (const order of ordersInRoute) {
      if (!order.driver_id || order.lat == null || order.lng == null) continue;
      const driver = drivers.find((d) => d.id === order.driver_id);
      if (!driver || driver.lat == null || driver.lng == null) continue;

      const km = haversineKm(
        { lat: driver.lat, lng: driver.lng },
        { lat: order.lat, lng: order.lng },
      );
      if (km <= PROXIMITY_KM) {
        list.push({
          order,
          driver,
          distanceM: Math.max(50, Math.round(km * 1000)),
        });
      }
    }

    return list.sort((a, b) => a.distanceM - b.distanceM);
  }, [ordersInRoute, drivers]);

  useEffect(() => {
    const activeIds = new Set(proximityAlerts.map((a) => a.order.id));
    for (const id of [...proximityNotifiedRef.current]) {
      if (!activeIds.has(id)) proximityNotifiedRef.current.delete(id);
    }

    for (const { order, driver, distanceM } of proximityAlerts) {
      if (proximityNotifiedRef.current.has(order.id)) continue;
      proximityNotifiedRef.current.add(order.id);
      soundService.playProximityAlert();
      toast.success(`${driver.name} chegando — ${order.code} (~${distanceM} m)`, {
        description: order.customer_name,
        duration: 8000,
      });
    }
  }, [proximityAlerts]);

  const gpsAlerts = useMemo(() => {
    return onlineDrivers
      .map((driver) => {
        const hasCoords = driver.lat != null && driver.lng != null;
        const staleMinutes = gpsStaleByDriver[driver.id];
        if (!hasCoords && staleMinutes == null) {
          return { driver, reason: "Sem localização compartilhada" as const };
        }
        if (staleMinutes != null) {
          return {
            driver,
            reason: `GPS sem atualizar há ${staleMinutes} min` as const,
          };
        }
        return null;
      })
      .filter((x): x is NonNullable<typeof x> => x != null);
  }, [onlineDrivers, gpsStaleByDriver]);

  const markers = useMemo((): MapMarker[] => {
    const list: MapMarker[] = [];
    const visibleOrders = focusDriverId
      ? filteredOrders.filter((o) => o.driver_id === focusDriverId)
      : filteredOrders;

    visibleOrders.forEach((o) => {
      if (o.lat == null || o.lng == null) return;
      const isSelected = o.id === selectedOrderId;
      list.push({
        id: `order-${o.id}`,
        lng: o.lng,
        lat: o.lat,
        label: o.code,
        kind: "order",
        color: isSelected ? "#f59e0b" : o.priority === "critica" ? "#ef4444" : "#6366f1",
      });
    });

    const visibleDrivers = focusDriverId
      ? filteredDrivers.filter((d) => d.id === focusDriverId)
      : filteredDrivers;

    visibleDrivers.forEach((d) => {
      if (d.lat == null || d.lng == null) return;
      const isSelected = d.id === focusDriverId;
      list.push({
        id: `driver-${d.id}`,
        lng: d.lng,
        lat: d.lat,
        label: d.name.split(" ")[0],
        kind: "driver",
        color: isSelected ? "#22d3ee" : d.status === "em_rota" ? "#22c55e" : "#a855f7",
      });
    });

    return list;
  }, [filteredOrders, filteredDrivers, focusDriverId, selectedOrderId]);

  const routeLines = useMemo((): RouteLine[] => {
    const showSimpleLines = focusDriverId != null && drivingPath.length < 2;
    if (!showSimpleLines) return [];
    const driver = drivers.find((d) => d.id === focusDriverId);
    if (!driver || driver.lat == null || driver.lng == null) return [];

    return driverOrders(filteredOrders, focusDriverId)
      .filter((o) => o.lat != null && o.lng != null)
      .map((o) => ({
        id: `${driver.id}-${o.id}`,
        from: { lng: driver.lng!, lat: driver.lat! },
        to: { lng: o.lng!, lat: o.lat! },
        color: o.id === selectedOrderId ? "#f59e0b" : "#6366f1",
        opacity: o.id === selectedOrderId ? 0.95 : 0.55,
      }));
  }, [filteredOrders, drivers, focusDriverId, selectedOrderId, drivingPath.length]);

  const routePaths = useMemo((): RoutePath[] => {
    if (drivingPath.length < 2 || !selectedOrderId) return [];
    return [
      {
        id: `driving-${selectedOrderId}`,
        coordinates: drivingPath,
        color: "#818cf8",
        width: 4,
        opacity: 0.9,
      },
    ];
  }, [drivingPath, selectedOrderId]);

  const trailCoordinates = useMemo(() => {
    if (trail.length < 2) return [];
    const count = Math.max(2, Math.round((trail.length * trailProgress) / 100));
    return trail.slice(0, count).map((p) => ({ lng: p.lng, lat: p.lat }));
  }, [trail, trailProgress]);

  const arrivedOrders = useMemo(
    () => ordersInRoute.filter((o) => o.arrived_at),
    [ordersInRoute],
  );

  const hasToken = Boolean(getMapboxToken());
  const ordersMissingCoords = activeOrders.filter((o) => o.lat == null || o.lng == null).length;
  const feedLinked = driversWithGps.length > 0;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 p-1 rounded-xl border border-border bg-muted/30">
            <Filter className="size-3.5 text-muted-foreground ml-2" />
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setFilter(opt.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition",
                  filter === opt.id
                    ? "bg-card text-foreground shadow-sm border border-border"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <StatPill
            icon={Radio}
            label="Online"
            value={`${onlineDrivers.length}/${drivers.length}`}
            tone="success"
          />
          <StatPill
            icon={feedLinked ? Signal : SignalZero}
            label="Com GPS"
            value={String(driversWithGps.length)}
            tone={feedLinked ? "success" : "warning"}
          />
          <StatPill icon={Package} label="Em rota" value={String(ordersInRoute.length)} />
          <StatPill icon={MapPin} label="Pedidos ativos" value={String(activeOrders.length)} />
        </div>

        {proximityAlerts.length > 0 && (
          <div className="rounded-2xl border border-success/35 bg-success/[0.06] px-4 py-3 space-y-2">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Zap className="size-4 text-success" />
              {proximityAlerts.length} entrega(s) chegando ao destino
            </p>
            <ul className="space-y-1">
              {proximityAlerts.map(({ order, driver, distanceM }) => (
                <li key={order.id} className="text-xs text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDriverId(driver.id);
                      setSelectedOrderId(order.id);
                    }}
                    className="hover:text-foreground transition underline-offset-2 hover:underline font-semibold text-success"
                  >
                    {order.code}
                  </button>
                  {" — "}
                  {driver.name} a ~{distanceM} m · {order.customer_name}
                  {order.arrived_at ? (
                    <span className="ml-1 text-[10px] font-bold uppercase text-emerald-400">
                      · Chegou
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        )}

        {arrivedOrders.length > 0 && (
          <div className="rounded-2xl border border-emerald-500/35 bg-emerald-500/[0.06] px-4 py-3 space-y-1">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              <MapPin className="size-4 text-emerald-400" />
              {arrivedOrders.length} pedido(s) no destino (geofence &lt; {Math.round(ARRIVED_GEOFENCE_KM * 1000)} m)
            </p>
            <p className="text-[11px] text-muted-foreground">
              WhatsApp automático enviado ao cliente quando entrou no raio de 500 m.
            </p>
          </div>
        )}

        {gpsAlerts.length > 0 && (
          <div className="rounded-2xl border border-warning/35 bg-warning/[0.06] px-4 py-3 space-y-2">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="size-4 text-warning" />
              {gpsAlerts.length} entregador(es) com problema de GPS
            </p>
            <ul className="space-y-1">
              {gpsAlerts.map(({ driver, reason }) => (
                <li key={driver.id} className="text-xs text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDriverId(driver.id);
                      setSelectedOrderId(null);
                    }}
                    className="hover:text-foreground transition underline-offset-2 hover:underline"
                  >
                    {driver.name}
                  </button>
                  {" — "}
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="bg-card border border-border rounded-2xl overflow-hidden relative shadow-sm">
          <div className="absolute top-4 left-4 z-10 glass-strong border border-white/10 rounded-xl p-3 flex items-center gap-3">
            <div className="size-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-primary-glow">
              <Navigation className="size-4" />
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">
                Status conexão
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    feedLinked ? "bg-success animate-ping" : "bg-warning",
                  )}
                />
                <span
                  className={cn(
                    "text-xs font-mono font-bold",
                    feedLinked ? "text-success" : "text-warning",
                  )}
                >
                  {feedLinked ? "FEED AO VIVO ATIVO" : "AGUARDANDO GPS"}
                </span>
              </div>
            </div>
          </div>

          <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-2">
            {etaMinutes != null && (
              <div className="glass-strong border border-indigo-500/30 rounded-xl px-3 py-2 flex items-center gap-2">
                <Clock className="size-3.5 text-primary-glow" />
                <span className="text-[10px] font-mono font-bold text-foreground uppercase">
                  ETA {etaMinutes} min
                  {etaDistanceKm != null ? ` · ${etaDistanceKm} km` : ""}
                </span>
              </div>
            )}
            {trailCoordinates.length >= 2 && (
              <div className="glass-strong border border-success/25 rounded-xl px-3 py-2 flex items-center gap-2">
                <Route className="size-3.5 text-success" />
                <span className="text-[10px] font-mono font-bold text-success uppercase">
                  Trajeto GPS · {trailCoordinates.length} pts
                </span>
              </div>
            )}
          </div>

          <OpsMapbox
            className="h-[380px] lg:h-[480px] w-full"
            markers={markers}
            routeLines={routeLines}
            routePaths={routePaths}
            trailCoordinates={trailCoordinates}
            center={markers.length ? undefined : SP_CENTER}
            zoom={13}
            showMarkerLabels
          />

          {trail.length >= 2 && selectedOrderId && (
            <div className="px-4 py-3 border-t border-border/40 bg-muted/20 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                <span>Replay trajeto GPS</span>
                <span>
                  {trailProgress}% · {trailCoordinates.length}/{trail.length} pts
                </span>
              </div>
              <input
                type="range"
                min={5}
                max={100}
                step={5}
                value={trailProgress}
                onChange={(e) => setTrailProgress(Number(e.target.value))}
                className="w-full accent-success"
              />
            </div>
          )}

          <div className="p-4 border-t border-border/40 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap gap-2">
              <LegendDot color="#22c55e" label="Entregador em rota" />
              <LegendDot color="#a855f7" label="Disponível" />
              <LegendDot color="#6366f1" label="Destino do pedido" />
              {routePaths.length > 0 && (
                <LegendDot color="#818cf8" label="Rota com trânsito" line />
              )}
              {trailCoordinates.length >= 2 && (
                <LegendDot color="#22c55e" label="Trajeto percorrido" line />
              )}
            </div>
            {hasToken && ordersMissingCoords > 0 && (
              <span className="text-warning font-medium">
                {ordersMissingCoords} pedido(s) sem coordenadas no mapa
              </span>
            )}
          </div>
        </div>

        {selectedOrder && (
          <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase font-mono text-muted-foreground tracking-wider">
                  Pedido selecionado
                </p>
                <h3 className="text-lg font-bold text-foreground">
                  {selectedOrder.code} · {selectedOrder.customer_name}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">{selectedOrder.address}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20">
                  {STATUS_LABEL[selectedOrder.status]}
                </span>
                {selectedOrder.arrived_at && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                    Chegou ao cliente
                  </span>
                )}
                {etaMinutes != null && (
                  <span className="text-xs font-mono font-bold text-indigo-300 flex items-center gap-1">
                    <Clock className="size-3" />
                    {etaMinutes} min
                    {etaDistanceKm != null ? ` · ${etaDistanceKm} km` : ""}
                  </span>
                )}
              </div>
            </div>
            {selectedDriver && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Bike className="size-3.5" />
                Entregador:{" "}
                <span className="font-semibold text-foreground">{selectedDriver.name}</span>
                {selectedDriver.lat == null
                  ? " · sem GPS no momento"
                  : etaMinutes != null
                    ? ` · chegada estimada em ${etaMinutes} min`
                    : trailCoordinates.length >= 2
                      ? ` · trajeto com ${trailCoordinates.length} pontos`
                      : " · posição ao vivo"}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Search className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Entregadores ao vivo</h3>
          </div>

          {filteredDrivers.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <Bike className="size-8 mx-auto text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                {onlineDrivers.length === 0
                  ? "Nenhum entregador online"
                  : "Nenhum resultado para este filtro"}
              </p>
              <p className="text-xs text-muted-foreground">
                {onlineDrivers.length === 0
                  ? "Peça aos entregadores para abrir o app e ficar online com localização ativa."
                  : "Tente outro filtro ou aguarde pedidos em rota."}
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {filteredDrivers.map((driver) => {
                const assigned = driverOrders(filteredOrders, driver.id);
                const statusUi = DRIVER_STATUS_UI[driver.status];
                const hasGps = driver.lat != null && driver.lng != null;
                const isStale = gpsStaleByDriver[driver.id] != null;
                const isSelected = driver.id === focusDriverId;

                return (
                  <button
                    key={driver.id}
                    type="button"
                    onClick={() => {
                      setSelectedDriverId(driver.id);
                      setSelectedOrderId(null);
                    }}
                    className={cn(
                      "w-full text-left rounded-xl border p-3.5 transition",
                      isSelected
                        ? "border-primary/50 bg-primary/5"
                        : "border-border/60 bg-muted/20 hover:border-border",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary text-sm">
                          {driver.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span
                          className={cn(
                            "absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-card",
                            !hasGps || isStale ? "bg-warning" : "bg-success",
                          )}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {driver.name}
                          </p>
                          <span
                            className={cn(
                              "text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border shrink-0",
                              statusUi?.tone,
                            )}
                          >
                            {statusUi?.label}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {!hasGps
                            ? "Sem localização"
                            : isStale
                              ? `GPS desatualizado (${gpsStaleByDriver[driver.id]} min)`
                              : "GPS ativo"}{" "}
                          · {assigned.length} pedido(s)
                        </p>
                      </div>
                    </div>

                    {assigned.length > 0 ? (
                      <div className="mt-3 space-y-1.5">
                        {assigned.map((order) => (
                          <button
                            key={order.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDriverId(driver.id);
                              setSelectedOrderId(order.id);
                            }}
                            className={cn(
                              "w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs border transition",
                              selectedOrderId === order.id
                                ? "border-warning/50 bg-warning/5"
                                : "border-border/40 bg-card/50 hover:border-border",
                            )}
                          >
                            <Package className="size-3.5 text-primary shrink-0" />
                            <span className="font-mono font-bold text-foreground">{order.code}</span>
                            <span className="text-muted-foreground truncate flex-1">
                              {order.customer_name}
                            </span>
                            <span className="text-[9px] uppercase text-muted-foreground shrink-0">
                              {STATUS_LABEL[order.status]}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-[10px] text-muted-foreground italic">
                        Sem pedidos atribuídos no momento
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-muted/30 border border-border/50 rounded-2xl p-4 space-y-2">
          <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <User className="size-3.5" />
            Como funciona
          </h4>
          <ul className="text-[11px] text-muted-foreground space-y-1.5 leading-relaxed">
            <li>
              · Entregador abre o app e fica <strong className="text-foreground">Online</strong>
            </li>
            <li>· O celular compartilha GPS a cada ~15 segundos</li>
            <li>· Pedidos atribuídos aparecem ligados ao entregador no mapa</li>
            <li>· Clique em um pedido para ver <strong className="text-foreground">trajeto GPS</strong>, replay e ETA</li>
            <li>· Use os filtros para ver só pedidos em rota ou críticos</li>
            <li>· Alerta verde + WhatsApp ao cliente quando entregador estiver a menos de 500 m</li>
            <li>· Geofence automático marca chegada ao cliente (&lt; 100 m) via GPS do entregador</li>
            <li>· Alerta se GPS ficar sem atualizar por mais de 3 minutos</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function StatPill({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone?: "success" | "warning";
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs">
      <Icon
        className={cn(
          "size-3.5",
          tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-primary",
        )}
      />
      <span className="text-muted-foreground uppercase text-[9px] font-bold tracking-wider">
        {label}
      </span>
      <span className="font-mono font-bold text-foreground">{value}</span>
    </div>
  );
}

function LegendDot({
  color,
  label,
  line,
}: {
  color: string;
  label: string;
  line?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      {line ? (
        <span className="w-4 h-0.5 rounded-full" style={{ background: color }} />
      ) : (
        <span
          className="size-2.5 rounded-full border border-white/30"
          style={{ background: color }}
        />
      )}
      {label}
    </span>
  );
}
