import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type Tenant = { id: string; name: string; slug: string; plan: string };

export function useTenant() {
  const { user, loading: authLoading } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [current, setCurrent] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!user) { setTenants([]); setCurrent(null); setLoading(false); return; }
    setLoading(true);
    const { data: roles } = await supabase
      .from("user_roles")
      .select("tenant_id, tenants:tenant_id(id,name,slug,plan)")
      .eq("user_id", user.id);
    const tList = (roles ?? [])
      .map((r: any) => r.tenants)
      .filter(Boolean)
      .filter((t: any, i: number, arr: any[]) => arr.findIndex((x) => x.id === t.id) === i);
    setTenants(tList);
    const { data: profile } = await supabase
      .from("profiles").select("current_tenant_id").eq("id", user.id).single();
    const curr = tList.find((t: any) => t.id === profile?.current_tenant_id) ?? tList[0] ?? null;
    setCurrent(curr);
    setLoading(false);
  };

  useEffect(() => { if (!authLoading) refresh(); /* eslint-disable-next-line */ }, [user?.id, authLoading]);

  const createTenant = async (name: string) => {
    const slug = name.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Math.random().toString(36).slice(2, 6);
    const { data, error } = await supabase.rpc("create_tenant_with_owner", { _name: name, _slug: slug });
    if (error) throw error;
    await refresh();
    return data as string;
  };

  const switchTenant = async (id: string) => {
    await supabase.from("profiles").update({ current_tenant_id: id }).eq("id", user!.id);
    await refresh();
  };

  return { tenants, current, loading: loading || authLoading, refresh, createTenant, switchTenant };
}