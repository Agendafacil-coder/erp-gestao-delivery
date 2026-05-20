import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { authRepository, USE_POSTGRES } from "@/lib/repositories";
import { UnitViewProvider } from "@/hooks/useUnitView";
import { getSessionFn } from "@/functions/auth";
import { getCurrentTenantFn } from "@/functions/tenants";
import {
  canAccessRoute,
  defaultRouteForRole,
  pickPrimaryRole,
  rolesForTenant,
} from "@/lib/roles";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    const user = await authRepository.getUser();
    if (!user) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }

    if (!USE_POSTGRES) return;

    try {
      const session = await getSessionFn();
      const tenant = await getCurrentTenantFn();
      if (!session || !tenant) return;

      const tenantRoles = rolesForTenant(session.roles, tenant.id);
      const role = pickPrimaryRole(tenantRoles);
      const pathname = new URL(location.href, "http://local").pathname;

      if (!canAccessRoute(role, pathname)) {
        throw redirect({ to: defaultRouteForRole(role) });
      }
    } catch (e) {
      if (e && typeof e === "object" && "to" in e) throw e;
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return (
    <UnitViewProvider>
      <Outlet />
    </UnitViewProvider>
  );
}
