import { resolveAccess, resolvePostLoginPath } from "@/lib/auth/access";
import { authRepository, USE_POSTGRES } from "@/lib/repositories";

/** Destino após login ou ao abrir `/` autenticado. */
export async function resolveAuthenticatedHome(
  requestedPath?: string | null,
): Promise<string> {
  if (USE_POSTGRES) {
    const [{ getSessionFn }, { getCurrentTenantFn }] = await Promise.all([
      import("@/functions/auth"),
      import("@/functions/tenants"),
    ]);
    const session = await getSessionFn();
    const tenant = await getCurrentTenantFn();
    const { role, homeRoute } = resolveAccess(session?.roles ?? [], tenant?.id ?? null);
    return resolvePostLoginPath(role, requestedPath ?? homeRoute);
  }

  const user = await authRepository.getUser();
  if (!user) return "/login";
  const { role, homeRoute } = resolveAccess(user.roles ?? [], "tenant-default-id");
  return resolvePostLoginPath(role, requestedPath ?? homeRoute);
}
