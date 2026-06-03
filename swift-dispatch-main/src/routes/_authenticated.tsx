import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { authRepository, USE_POSTGRES } from "@/lib/repositories";
import { UnitViewProvider } from "@/hooks/useUnitView";
import { OpsLayoutProvider } from "@/hooks/useOpsLayout";
import { RoleShell } from "@/components/auth/RoleShell";
import { RouteGuard } from "@/components/auth/RouteGuard";
import { getSessionFn } from "@/functions/auth";
import { getCurrentTenantFn } from "@/functions/tenants";
import { assertRouteAccess, assertLocalRouteAccess } from "@/lib/auth/guardRoute";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    const user = await authRepository.getUser();
    if (!user) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }

    const pathname = new URL(location.href, "http://local").pathname;

    if (USE_POSTGRES) {
      try {
        const session = await getSessionFn();
        const tenant = await getCurrentTenantFn();
        if (session && tenant) {
          const { allowed, redirectTo } = assertRouteAccess(session, tenant.id, pathname);
          if (!allowed) throw redirect({ to: redirectTo });
        }
      } catch (e) {
        if (e && typeof e === "object" && "to" in e) throw e;
      }
      return;
    }

    if (typeof window !== "undefined") {
      const tenantId = "tenant-default-id";
      const { allowed, redirectTo } = assertLocalRouteAccess(user.email, tenantId, pathname);
      if (!allowed) throw redirect({ to: redirectTo });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return (
    <UnitViewProvider>
      <OpsLayoutProvider>
        <RoleShell>
          <RouteGuard>
            <Outlet />
          </RouteGuard>
        </RoleShell>
      </OpsLayoutProvider>
    </UnitViewProvider>
  );
}
