import { useCallback, useEffect, useRef, useState } from "react";
import { USE_POSTGRES } from "@/lib/repositories";

export type GpsShareStatus = "idle" | "unsupported" | "pending" | "active" | "denied";

type Options = {
  driverId: string | null;
  enabled: boolean;
  intervalMs?: number;
};

/** Envia GPS do dispositivo para o servidor enquanto o entregador está online. */
export function useDriverGps({ driverId, enabled, intervalMs = 15000 }: Options) {
  const watchIdRef = useRef<number | null>(null);
  const lastSentRef = useRef(0);
  const [status, setStatus] = useState<GpsShareStatus>("idle");
  const [lastSentAt, setLastSentAt] = useState<number | null>(null);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unsupported");
      return false;
    }

    setStatus("pending");

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => {
          setStatus("active");
          resolve(true);
        },
        (err) => {
          setStatus(err.code === 1 ? "denied" : "idle");
          resolve(false);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
      );
    });
  }, []);

  useEffect(() => {
    if (!enabled || !driverId || !USE_POSTGRES) {
      if (!enabled) setStatus("idle");
      return;
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unsupported");
      return;
    }

    const sendPosition = (pos: GeolocationPosition) => {
      const now = Date.now();
      if (now - lastSentRef.current < intervalMs - 500) return;
      lastSentRef.current = now;
      setStatus("active");
      setLastSentAt(now);

      void import("@/functions/drivers")
        .then(({ updateDriverCoordsFn }) =>
          updateDriverCoordsFn({
            data: {
              driverId,
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              heading: pos.coords.heading ?? undefined,
            },
          }),
        )
        .catch(() => {
          /* silencioso — GPS pode falhar intermitentemente */
        });
    };

    const onError = (err: GeolocationPositionError) => {
      if (err.code === 1) setStatus("denied");
    };

    watchIdRef.current = navigator.geolocation.watchPosition(sendPosition, onError, {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 12000,
    });

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [driverId, enabled, intervalMs]);

  return { status, lastSentAt, requestPermission };
}
