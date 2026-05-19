import { useEffect, useRef } from "react";
import { updateDriverCoordsFn } from "@/functions/drivers";
import { USE_POSTGRES } from "@/lib/repositories";

type Options = {
  driverId: string | null;
  enabled: boolean;
  intervalMs?: number;
};

/** Envia GPS do dispositivo para o servidor enquanto o entregador está online. */
export function useDriverGps({ driverId, enabled, intervalMs = 15000 }: Options) {
  const watchIdRef = useRef<number | null>(null);
  const lastSentRef = useRef(0);

  useEffect(() => {
    if (!enabled || !driverId || !USE_POSTGRES) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    const sendPosition = (pos: GeolocationPosition) => {
      const now = Date.now();
      if (now - lastSentRef.current < intervalMs - 500) return;
      lastSentRef.current = now;

      void updateDriverCoordsFn({
        data: {
          driverId,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          heading: pos.coords.heading ?? undefined,
        },
      }).catch(() => {
        /* silencioso — GPS pode falhar intermitentemente */
      });
    };

    const onError = () => {
      /* permissão negada ou indisponível */
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
}
