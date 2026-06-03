import { resolveAccess, canAccessPath } from "@/lib/auth/access";
import { buildLocalRoleRows } from "@/lib/auth/localRoles";
import type { SessionUser } from "@/functions/session";

/** Valida acesso no beforeLoad (servidor / PostgreSQL). */
export function assertRouteAccess(
  session: SessionUser | null,
  tenantId: string | null,
  pathname: string,
): { allowed: boolean; redirectTo: string } {
  const rows = session?.roles ?? [];
  const { role, homeRoute } = resolveAccess(rows, tenantId);
  if (!role) return { allowed: false, redirectTo: "/login" };
  if (!canAccessPath(role, pathname)) {
    return { allowed: false, redirectTo: homeRoute };
  }
  return { allowed: true, redirectTo: homeRoute };
}

/** Valida acesso no beforeLoad (cliente / LocalStorage). */
export function assertLocalRouteAccess(
  email: string,
  tenantId: string | null,
  pathname: string,
): { allowed: boolean; redirectTo: string } {
  const rows = buildLocalRoleRows(email, tenantId ?? "tenant-default-id");
  const { role, homeRoute } = resolveAccess(rows, tenantId ?? "tenant-default-id");
  if (!canAccessPath(role, pathname)) {
    return { allowed: false, redirectTo: homeRoute };
  }
  return { allowed: true, redirectTo: homeRoute };
}
