import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { authRepository } from "@/lib/repositories";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    const user = await authRepository.getUser();
    if (!user) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
  },
  component: () => <Outlet />,
});