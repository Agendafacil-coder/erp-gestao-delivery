import type { ReactNode } from "react";
import { OpsSidebar } from "@/components/ops/Sidebar";
import { OpsHeader } from "@/components/ops/Header";
import { RestrictedHeader } from "@/components/auth/RestrictedHeader";
import { useAuthAccess } from "@/hooks/useAuthAccess";
import { isRestrictedProfile } from "@/lib/roles";
import { useOpsLayout } from "@/hooks/useOpsLayout";
import { cn } from "@/lib/utils";
import { IncomingOrderAlertsBridge } from "@/components/ops/IncomingOrderAlertsBridge";

/**
 * Layout responsivo por perfil:
 * - ADM: sidebar + header completo (desktop e mobile com drawer)
 * - Cozinha / Entregador: tela focada, sem menu lateral
 */
export function RoleShell({ children }: { children: ReactNode }) {
  const { profile, loading } = useAuthAccess();
  const { sidebarHidden, tvMode } = useOpsLayout();
  const restricted = !loading && isRestrictedProfile(profile);

  if (restricted) {
    return (
      <div className="ops-app min-h-screen flex flex-col bg-background">
        <IncomingOrderAlertsBridge />
        <RestrictedHeader />
        <div
          className={cn(
            "ops-content ops-canvas flex-1 flex flex-col min-h-0",
            tvMode && "ops-tv-mode",
          )}
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="ops-app min-h-screen flex bg-background">
      <IncomingOrderAlertsBridge />
      {!sidebarHidden && <OpsSidebar />}
      <div className="ops-main flex-1 flex flex-col min-w-0 min-h-screen">
        <OpsHeader />
        <div className="ops-content ops-canvas flex-1 flex flex-col min-h-0">{children}</div>
      </div>
    </div>
  );
}
