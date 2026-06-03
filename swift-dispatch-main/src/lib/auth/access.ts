import {
  canAccessRoute,
  defaultRouteForRole,
  pickPrimaryRole,
  profileHomeRoute,
  roleToProfile,
  rolesForTenant,
  type AppProfile,
  type AppRole,
} from "@/lib/roles";

export type RoleRow = { tenant_id: string; role: string };

export type AccessContext = {
  role: AppRole | null;
  profile: AppProfile | null;
  homeRoute: string;
  tenantId: string | null;
};

export function resolveAccess(
  roleRows: RoleRow[],
  tenantId: string | null,
): AccessContext {
  const roles = tenantId ? rolesForTenant(roleRows, tenantId) : [];
  const role = pickPrimaryRole(roles.map((r) => r));
  const profile = roleToProfile(role);
  const homeRoute = role ? defaultRouteForRole(role) : profileHomeRoute(profile);

  return { role, profile, homeRoute, tenantId };
}

export function canAccessPath(role: AppRole | null, pathname: string): boolean {
  return canAccessRoute(role, pathname);
}

export function resolvePostLoginPath(
  role: AppRole | null,
  requestedPath?: string | null,
): string {
  const home = role ? defaultRouteForRole(role) : "/central";
  if (!requestedPath || requestedPath === "/central" || requestedPath === "/") {
    return home;
  }
  try {
    const pathname = new URL(requestedPath, "http://local").pathname;
    if (canAccessRoute(role, pathname)) return pathname;
  } catch {
    // ignore malformed redirect
  }
  return home;
}
