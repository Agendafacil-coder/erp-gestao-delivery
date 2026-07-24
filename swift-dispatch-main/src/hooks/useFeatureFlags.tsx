import { useCallback, useEffect, useState } from "react";
import { getFeatureFlagsFn } from "@/functions/featureFlags";
import {
  isFeatureEnabled,
  type FeatureFlagKey,
  type TenantFeatureFlags,
} from "@/lib/tenant/featureFlags";

export function useFeatureFlags(tenantId: string | undefined) {
  const [flags, setFlags] = useState<TenantFeatureFlags>({});
  // Start loading when a tenant is expected — avoids "recurso desligado" flash on gated routes.
  const [loading, setLoading] = useState(() => Boolean(tenantId));

  const load = useCallback(async () => {
    if (!tenantId) {
      setFlags({});
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const next = await getFeatureFlagsFn({ data: { tenantId } });
      setFlags(next);
    } catch {
      setFlags({});
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  const enabled = useCallback((key: FeatureFlagKey) => isFeatureEnabled(flags, key), [flags]);

  return { flags, loading, enabled, refresh: load };
}
