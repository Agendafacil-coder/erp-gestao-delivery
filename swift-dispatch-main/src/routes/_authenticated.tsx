import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { authRepository } from "@/lib/repositories";
import { UnitViewProvider } from "@/hooks/useUnitView";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    const user = await authRepository.getUser();
    if (!user) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
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
