import { useEffect, useMemo, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { resolveAccess, canAccessPath, type AccessContext } from "@/lib/auth/access";
import { USE_POSTGRES } from "@/lib/repositories";
import { localDb } from "@/lib/db/localDb";
import { buildLocalRoleRows } from "@/lib/auth/localRoles";
import { canAccessNav, type AppProfile, type AppRole, type NavKey } from "@/lib/roles";
import { useAuth } from "./useAuth";
import { useTenant } from "./useTenant";

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("session_fetch_timeout")), ms);
    }),
  ]);
}

export function useAuthAccess() {
  const { user, loading: authLoading } = useAuth();
  const { current, loading: tenantLoading } = useTenant();
  const location = useLocation();
  const [roleRows, setRoleRows] = useState<Array<{ tenant_id: string; role: string }>>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [rolesReady, setRolesReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (USE_POSTGRES) {
          const { getSessionFn } = await import("@/functions/auth");
          const session = await withTimeout(getSessionFn(), 12_000);
          if (!cancelled) setRoleRows(session?.roles ?? []);
        } else if (user) {
          const sess = localDb.getSession();
          const rows =
            sess.user?.roles ??
            user.roles ??
            buildLocalRoleRows(user.email, current?.id ?? "tenant-default-id");
          if (!cancelled) setRoleRows(rows);
        } else if (!cancelled) {
          setRoleRows([]);
        }
      } catch {
        if (!cancelled) setRoleRows([]);
      } finally {
        if (!cancelled) {
          setRolesReady(true);
          setRolesLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.email, current?.id]);

  const access: AccessContext = useMemo(
    () => resolveAccess(roleRows, current?.id ?? null, location.pathname),
    [roleRows, current?.id, location.pathname],
  );

  const loading = authLoading || tenantLoading || (!rolesReady && rolesLoading);

  return {
    ...access,
    loading,
    canAccessRoute: (pathname: string) => canAccessPath(access.role, pathname),
    canAccessNav: (key: NavKey) => canAccessNav(access.role, key),
    roleRows,
  };
}

export type { AppRole, AppProfile, AccessContext };
