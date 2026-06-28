import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/configs")({
  beforeLoad: () => {
    throw redirect({ to: "/sistema", search: { secao: "configs" } });
  },
});
