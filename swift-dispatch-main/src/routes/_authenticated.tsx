import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { authRepository, USE_POSTGRES } from "@/lib/repositories";
import { UnitViewProvider } from "@/hooks/useUnitView";
import { OpsLayoutProvider } from "@/hooks/useOpsLayout";
import { RoleShell } from "@/components/auth/RoleShell";
import { RouteGuard } from "@/components/auth/RouteGuard";
import { assertRouteAccess, assertLocalRouteAccess } from "@/lib/auth/guardRoute";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    let user: Awaited<ReturnType<typeof authRepository.getUser>> = null;
    try {
      user = await authRepository.getUser();
    } catch (e) {
      console.error("beforeLoad auth:", e);
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
    if (!user) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }

    const pathname = new URL(location.href, "http://local").pathname;

    if (USE_POSTGRES) {
      try {
        const [{ getSessionFn }, { getCurrentTenantFn }] = await Promise.all([
          import("@/functions/auth"),
          import("@/functions/tenants"),
        ]);
        const session = await getSessionFn();
        const tenant = await getCurrentTenantFn();
        if (!session || !tenant) {
          throw redirect({ to: "/login", search: { redirect: location.href } });
        }
        const { allowed, redirectTo } = assertRouteAccess(session, tenant.id, pathname);
        if (!allowed) throw redirect({ to: redirectTo });
      } catch (e) {
        if (e && typeof e === "object" && "to" in e) throw e;
        console.error("beforeLoad session:", e);
        throw redirect({ to: "/login", search: { redirect: location.href } });
      }
      return;
    }

    const tenantId = "tenant-default-id";
    const { allowed, redirectTo } = assertLocalRouteAccess(user.email, tenantId, pathname);
    if (!allowed) throw redirect({ to: redirectTo });
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
