import { useEffect, useRef } from "react";
import type { LocalAlert, LocalDriver, LocalOrder } from "@/lib/db/localDb";
import type { OpsSnapshot } from "@/lib/ops/opsSnapshot.types";
import { USE_POSTGRES } from "@/lib/repositories";

type ApplySnapshot = (snapshot: {
  orders: LocalOrder[];
  drivers: LocalDriver[];
  alerts: LocalAlert[];
  automationEvents?: OpsSnapshot["automationEvents"];
}) => void;

const RECONNECT_BASE_MS = 3000;
const RECONNECT_MAX_MS = 30000;

/**
 * SSE em tempo real (substitui polling quando PostgreSQL está ativo).
 * Reconecta automaticamente se a conexão cair.
 */
export function useOpsStream(
  tenantId: string | undefined,
  onSnapshot: ApplySnapshot,
  onConnectionChange?: (connected: boolean) => void,
) {
  const onSnapshotRef = useRef(onSnapshot);
  onSnapshotRef.current = onSnapshot;
  const onConnectionChangeRef = useRef(onConnectionChange);
  onConnectionChangeRef.current = onConnectionChange;

  useEffect(() => {
    if (!USE_POSTGRES || !tenantId || typeof EventSource === "undefined") {
      onConnectionChangeRef.current?.(false);
      return;
    }

    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectDelay = RECONNECT_BASE_MS;
    let cancelled = false;

    const connect = () => {
      if (cancelled) return;

      const url = `/api/ops/stream?tenantId=${encodeURIComponent(tenantId)}`;
      es = new EventSource(url, { withCredentials: true });

      es.onopen = () => {
        reconnectDelay = RECONNECT_BASE_MS;
        onConnectionChangeRef.current?.(true);
      };

      es.onmessage = (ev) => {
        reconnectDelay = RECONNECT_BASE_MS;
        onConnectionChangeRef.current?.(true);
        try {
          const data = JSON.parse(ev.data) as OpsSnapshot;
          onSnapshotRef.current({
            orders: data.orders,
            drivers: data.drivers,
            alerts: data.alerts,
            automationEvents: data.automationEvents,
          });
        } catch {
          /* ignore malformed */
        }
      };

      es.onerror = () => {
        onConnectionChangeRef.current?.(false);
        es?.close();
        es = null;
        if (cancelled) return;
        reconnectTimer = setTimeout(() => {
          reconnectDelay = Math.min(reconnectDelay * 2, RECONNECT_MAX_MS);
          connect();
        }, reconnectDelay);
      };
    };

    connect();

    return () => {
      cancelled = true;
      onConnectionChangeRef.current?.(false);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      es?.close();
    };
  }, [tenantId]);
}
