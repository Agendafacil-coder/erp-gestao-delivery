import { createFileRoute, redirect } from "@tanstack/react-router";
import { authRepository } from "@/lib/repositories";
import { resolveAuthenticatedHome } from "@/lib/auth/redirect";
import { LandingPage } from "@/components/marketing/LandingPage";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const user = await authRepository.getUser();
    if (user) {
      const target = await resolveAuthenticatedHome();
      throw redirect({ to: target });
    }
  },
  component: LandingPage,
});
