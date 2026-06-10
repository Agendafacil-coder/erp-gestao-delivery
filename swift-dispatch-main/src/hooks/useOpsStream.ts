import { useEffect } from "react";
import type { LocalAlert, LocalDriver, LocalOrder } from "@/lib/db/localDb";
import type { OpsSnapshot } from "@/functions/ops";
import { USE_POSTGRES } from "@/lib/repositories";

type ApplySnapshot = (snapshot: {
  orders: LocalOrder[];
  drivers: LocalDriver[];
  alerts: LocalAlert[];
}) => void;

/**
 * SSE em tempo real (substitui polling quando PostgreSQL está ativo).
 */
export function useOpsStream(tenantId: string | undefined, onSnapshot: ApplySnapshot) {
  useEffect(() => {
    if (!USE_POSTGRES || !tenantId || typeof EventSource === "undefined") return;

    const url = `/api/ops/stream?tenantId=${encodeURIComponent(tenantId)}`;
    const es = new EventSource(url, { withCredentials: true });

    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as OpsSnapshot;
        onSnapshot({
          orders: data.orders,
          drivers: data.drivers,
          alerts: data.alerts,
        });
      } catch {
        /* ignore malformed */
      }
    };

    es.onerror = () => {
      es.close();
    };

    return () => es.close();
  }, [tenantId, onSnapshot]);
}
