import { useEffect, useState } from "react";
import { getSessionFn } from "@/functions/auth";
import { USE_POSTGRES } from "@/lib/repositories";
import { pickPrimaryRole, type AppRole } from "@/lib/roles";
import { useTenant } from "./useTenant";

export function useRole() {
  const { current } = useTenant();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(USE_POSTGRES);

  useEffect(() => {
    if (!USE_POSTGRES) {
      setRole("owner");
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const session = await getSessionFn();
        if (cancelled) return;
        if (!session || !current?.id) {
          setRole(null);
          return;
        }
        const tenantRoles = session.roles
          .filter((r) => r.tenant_id === current.id)
          .map((r) => r.role);
        setRole(pickPrimaryRole(tenantRoles));
      } catch {
        if (!cancelled) setRole(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [current?.id]);

  return { role, loading };
}
