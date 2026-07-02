import { useCallback, useEffect, useState } from "react";
import { getFeatureFlagsFn } from "@/functions/featureFlags";
import {
  isFeatureEnabled,
  type FeatureFlagKey,
  type TenantFeatureFlags,
} from "@/lib/tenant/featureFlags";

export function useFeatureFlags(tenantId: string | undefined) {
  const [flags, setFlags] = useState<TenantFeatureFlags>({});
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!tenantId) {
      setFlags({});
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
