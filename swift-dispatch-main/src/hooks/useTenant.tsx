import { useEffect, useState } from "react";
import { tenantRepository, type LocalTenant as Tenant } from "@/lib/repositories";
import { useAuth } from "./useAuth";

export type { Tenant };

export function useTenant() {
  const { user, loading: authLoading } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [current, setCurrent] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!user) { 
      setTenants([]); 
      setCurrent(null); 
      setLoading(false); 
      return; 
    }
    setLoading(true);
    try {
      const tList = await tenantRepository.getTenants(user.id);
      setTenants(tList);
      
      const curr = await tenantRepository.getCurrentTenant(user.id);
      setCurrent(curr ?? tList[0] ?? null);
    } catch (e) {
      console.error("Error refreshing tenants:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    if (!authLoading) refresh(); 
    // eslint-disable-next-line
  }, [user?.id, authLoading]);

  const createTenant = async (name: string) => {
    const data = await tenantRepository.createTenant(name);
    await refresh();
    return data as string;
  };

  const switchTenant = async (id: string) => {
    if (!user) return;
    await tenantRepository.switchTenant(user.id, id);
    await refresh();
  };

  return { tenants, current, loading: loading || authLoading, refresh, createTenant, switchTenant };
}