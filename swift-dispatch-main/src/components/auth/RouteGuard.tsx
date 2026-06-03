import { useEffect, type ReactNode } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useAuthAccess } from "@/hooks/useAuthAccess";

type RouteGuardProps = {
  children: ReactNode;
};

/**
 * Proteção client-side de rotas autenticadas.
 * Complementa o beforeLoad do layout (SSR/PostgreSQL) e cobre modo LocalStorage.
 */
export function RouteGuard({ children }: RouteGuardProps) {
  const { role, homeRoute, loading, canAccessRoute } = useAuthAccess();
  const location = useLocation();
  const navigate = useNavigate();

  const pathname = location.pathname;
  const allowed = canAccessRoute(pathname);

  useEffect(() => {
    if (loading || !role) return;
    if (!allowed) {
      navigate({ to: homeRoute, replace: true });
    }
  }, [loading, role, allowed, homeRoute, navigate]);

  if (loading) {
    return (
      <div className="flex flex-1 min-h-[50vh] items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-primary" aria-label="Carregando permissões" />
      </div>
    );
  }

  if (!role) {
    return (
      <div className="flex flex-1 min-h-[50vh] items-center justify-center bg-background px-4 text-center">
        <p className="text-sm text-muted-foreground">
          Sua conta não possui perfil ativo nesta operação. Peça ao administrador para liberar o acesso.
        </p>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="flex flex-1 min-h-[40vh] items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }

  return <>{children}</>;
}
