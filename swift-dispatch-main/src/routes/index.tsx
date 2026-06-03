import { createFileRoute, redirect } from "@tanstack/react-router";
import { authRepository } from "@/lib/repositories";
import { resolveAuthenticatedHome } from "@/lib/auth/redirect";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const user = await authRepository.getUser();
    if (!user) {
      throw redirect({ to: "/login" });
    }
    const target = await resolveAuthenticatedHome();
    throw redirect({ to: target });
  },
  component: () => null,
});
