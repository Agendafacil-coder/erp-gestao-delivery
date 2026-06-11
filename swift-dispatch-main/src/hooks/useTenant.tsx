import { useEffect, useState } from "react";
import { tenantRepository, type LocalTenant as Tenant } from "@/lib/repositories";
import { useAuth } from "./useAuth";

export type { Tenant };

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("tenant_fetch_timeout")), ms);
    }),
  ]);
}

export function useTenant() {
  const { user, loading: authLoading } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [current, setCurrent] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async (opts?: { blocking?: boolean }) => {
    if (!user) {
      setTenants([]);
      setCurrent(null);
      setLoading(false);
      return;
    }

    const shouldBlock = opts?.blocking ?? !current;
    if (shouldBlock) setLoading(true);

    try {
      const tList = await withTimeout(tenantRepository.getTenants(user.id), 12_000);
      setTenants(tList);

      const curr = await withTimeout(tenantRepository.getCurrentTenant(user.id), 12_000);
      setCurrent(curr ?? tList[0] ?? null);
    } catch (e) {
      console.error("Error refreshing tenants:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) void refresh();
    // eslint-disable-next-line
  }, [user?.id, authLoading]);

  const createTenant = async (name: string) => {
    const data = await tenantRepository.createTenant(name);
    await refresh({ blocking: true });
    return data as string;
  };

  const switchTenant = async (id: string) => {
    if (!user) return;
    await tenantRepository.switchTenant(user.id, id);
    await refresh({ blocking: true });
  };

  return { tenants, current, loading: loading || authLoading, refresh, createTenant, switchTenant };
}
