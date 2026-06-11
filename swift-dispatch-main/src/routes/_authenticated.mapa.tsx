import { createFileRoute, redirect } from "@tanstack/react-router";

/** Mapa operacional unificado com a página de Rastreio ao vivo. */
export const Route = createFileRoute("/_authenticated/mapa")({
  beforeLoad: () => {
    throw redirect({ to: "/tracking" });
  },
});
