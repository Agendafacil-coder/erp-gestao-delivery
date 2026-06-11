import { useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { useOps } from "@/hooks/useOps";
import { normalizeOrderStatus } from "@/lib/ops/orderWorkflow";
import { ARRIVING_NOTIFY_KM } from "@/lib/geo/proximityConstants";
import { haversineKm } from "@/lib/map/geo";
import { soundService } from "@/lib/services/SoundService";

/**
 * Alertas sonoros na operação quando entregador se aproxima ou chega ao cliente.
 */
export function useOperationalArrivalAlerts(enabled = true) {
  const { orders, drivers } = useOps();
  const proximityNotifiedRef = useRef<Set<string>>(new Set());
  const arrivedNotifiedRef = useRef<Set<string>>(new Set());
  const bootstrappedRef = useRef(false);

  const driversById = useMemo(() => new Map(drivers.map((d) => [d.id, d])), [drivers]);

  const proximityAlerts = useMemo(() => {
    if (!enabled) return [];

    return orders
      .filter((o) => normalizeOrderStatus(o.status) === "em_rota_entrega" && o.driver_id)
      .map((order) => {
        const driver = driversById.get(order.driver_id!);
        if (
          !driver ||
          driver.lat == null ||
          driver.lng == null ||
          order.lat == null ||
          order.lng == null
        ) {
          return null;
        }
        const km = haversineKm(
          { lat: driver.lat, lng: driver.lng },
          { lat: order.lat, lng: order.lng },
        );
        if (km > ARRIVING_NOTIFY_KM) return null;
        return {
          order,
          driver,
          distanceM: Math.max(50, Math.round(km * 1000)),
        };
      })
      .filter((x): x is NonNullable<typeof x> => x != null);
  }, [orders, driversById, enabled]);

  useEffect(() => {
    if (!enabled) return;

    if (!bootstrappedRef.current) {
      for (const o of orders) {
        if (o.arrived_at) arrivedNotifiedRef.current.add(o.id);
      }
      for (const { order } of proximityAlerts) {
        proximityNotifiedRef.current.add(order.id);
      }
      if (orders.length > 0) bootstrappedRef.current = true;
      return;
    }

    const activeProximityIds = new Set(proximityAlerts.map((a) => a.order.id));
    for (const id of [...proximityNotifiedRef.current]) {
      if (!activeProximityIds.has(id)) proximityNotifiedRef.current.delete(id);
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

    for (const order of orders) {
      if (!order.arrived_at || arrivedNotifiedRef.current.has(order.id)) continue;
      if (normalizeOrderStatus(order.status) !== "em_rota_entrega") continue;

      arrivedNotifiedRef.current.add(order.id);
      soundService.playProximityAlert();
      toast.info(`Entregador chegou — ${order.code}`, {
        description: `${order.customer_name} · aguardando finalização`,
        duration: 10000,
      });
    }
  }, [orders, proximityAlerts, enabled]);
}
