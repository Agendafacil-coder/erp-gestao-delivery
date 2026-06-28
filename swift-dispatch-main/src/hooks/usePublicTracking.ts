import { useCallback, useEffect, useState } from "react";
import { getPublicTrackingFn, type PublicTrackingPayload } from "@/functions/tracking";

const POLL_MS = 5_000;

export function usePublicTracking(orderId: string, token: string) {
  const [data, setData] = useState<PublicTrackingPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    try {
      const payload = await getPublicTrackingFn({ data: { orderId, token } });
      setData(payload);
      setError(null);
      setLastUpdatedAt(new Date());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [orderId, token]);

  useEffect(() => {
    setLoading(true);
    void load();
    const interval = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(interval);
  }, [load]);

  return { data, setData, error, loading, reload: load, lastUpdatedAt };
}
