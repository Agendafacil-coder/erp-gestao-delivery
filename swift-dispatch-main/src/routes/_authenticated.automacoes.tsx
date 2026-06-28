import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/automacoes")({
  beforeLoad: () => {
    throw redirect({ to: "/sistema", search: { secao: "automacoes" } });
  },
});
