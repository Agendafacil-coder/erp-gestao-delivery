import { useAuthAccess } from "./useAuthAccess";
import type { AppRole } from "@/lib/roles";

/** @deprecated Prefer useAuthAccess — mantido para Sidebar e componentes legados. */
export function useRole() {
  const { role, profile, loading } = useAuthAccess();
  return { role, profile, loading };
}
