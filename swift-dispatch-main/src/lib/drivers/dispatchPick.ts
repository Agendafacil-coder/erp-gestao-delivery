import type { LocalDriver } from "@/lib/db/localDb";
import { isDriverAvailableForAutoDispatch } from "@/lib/services/DispatchService";

type DriverCandidate = {
  id: string;
  name: string;
  status: LocalDriver["status"];
  activeOrders: number;
  rating: number;
};

function driverDispatchScore(d: DriverCandidate): number {
  const idleBonus = d.status === "disponivel" ? 1000 : 0;
  const loadPenalty = d.activeOrders * 10;
  return idleBonus - loadPenalty + d.rating;
}

/** Próximo entregador disponível (menor carga, preferência por ocioso). */
export function pickNextDriverFromList(drivers: LocalDriver[]): LocalDriver | null {
  const available = drivers
    .filter(isDriverAvailableForAutoDispatch)
    .sort((a, b) => {
      const scoreA = driverDispatchScore({
        id: a.id,
        name: a.name,
        status: a.status,
        activeOrders: a.active_orders ?? 0,
        rating: a.rating,
      });
      const scoreB = driverDispatchScore({
        id: b.id,
        name: b.name,
        status: b.status,
        activeOrders: b.active_orders ?? 0,
        rating: b.rating,
      });
      return scoreB - scoreA;
    });
  return available[0] ?? null;
}
