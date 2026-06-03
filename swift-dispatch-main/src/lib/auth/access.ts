import {
  canAccessRoute,
  defaultRouteForRole,
  pickPrimaryRole,
  profileHomeRoute,
  resolveProfileForPath,
  rolesForAccess,
  type AppProfile,
  type AppRole,
} from "@/lib/roles";

export type RoleRow = { tenant_id: string; role: string };

export type AccessContext = {
  role: AppRole | null;
  roles: AppRole[];
  profile: AppProfile | null;
  homeRoute: string;
  tenantId: string | null;
};

export function resolveAccess(
  roleRows: RoleRow[],
  tenantId: string | null,
  pathname = "/central",
): AccessContext {
  const roles = rolesForAccess(roleRows, tenantId);
  const role = pickPrimaryRole(roles);
  const profile = resolveProfileForPath(roles, pathname);
  const homeRoute = role ? defaultRouteForRole(role) : profileHomeRoute(profile);

  return { role, roles, profile, homeRoute, tenantId };
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
