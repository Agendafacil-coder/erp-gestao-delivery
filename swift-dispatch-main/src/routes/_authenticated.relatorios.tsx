import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/relatorios")({
  beforeLoad: () => {
    throw redirect({ to: "/financeiro", search: { secao: "relatorios" } });
  },
  component: () => null,
});
