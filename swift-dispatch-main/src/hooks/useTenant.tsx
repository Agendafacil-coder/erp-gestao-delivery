import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { tenantRepository, type LocalTenant as Tenant } from "@/lib/repositories";
import { useAuth } from "./useAuth";

export type { Tenant };

type TenantCtx = {
  tenants: Tenant[];
  current: Tenant | null;
  loading: boolean;
  refresh: (opts?: { blocking?: boolean }) => Promise<void>;
  createTenant: (name: string) => Promise<string>;
  switchTenant: (id: string) => Promise<void>;
};

const Ctx = createContext<TenantCtx | null>(null);

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("tenant_fetch_timeout")), ms);
    }),
  ]);
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [current, setCurrent] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const inFlightRef = useRef(0);

  const refresh = async (opts?: { blocking?: boolean }) => {
    if (!user) {
      setTenants([]);
      setCurrent(null);
      setLoading(false);
      return;
    }

    const shouldBlock = opts?.blocking ?? !current;
    inFlightRef.current += 1;
    if (shouldBlock && inFlightRef.current === 1) setLoading(true);

    try {
      const tList = await withTimeout(tenantRepository.getTenants(user.id), 12_000);
      setTenants(tList);

      const curr = await withTimeout(tenantRepository.getCurrentTenant(user.id), 12_000);
      setCurrent(curr ?? tList[0] ?? null);
    } catch (e) {
      console.error("Error refreshing tenants:", e);
    } finally {
      inFlightRef.current = Math.max(0, inFlightRef.current - 1);
      if (inFlightRef.current === 0) setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  return (
    <Ctx.Provider
      value={{
        tenants,
        current,
        loading: loading || authLoading,
        refresh,
        createTenant,
        switchTenant,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useTenant() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error("useTenant must be used within TenantProvider");
  }
  return ctx;
}
