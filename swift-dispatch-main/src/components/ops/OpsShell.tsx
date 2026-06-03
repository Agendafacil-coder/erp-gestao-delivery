import { OpsSidebar } from "@/components/ops/Sidebar";
import { OpsHeader } from "@/components/ops/Header";
import { cn } from "@/lib/utils";
import { useOpsLayout } from "@/hooks/useOpsLayout";

export function OpsShell({ children }: { children: React.ReactNode }) {
  const { sidebarHidden } = useOpsLayout();

  return (
    <div className="ops-app min-h-screen flex bg-background">
      {!sidebarHidden && <OpsSidebar />}
      <div className="ops-main flex-1 flex flex-col min-w-0 min-h-screen">
        <OpsHeader />
        <div className="ops-content flex-1 flex flex-col min-h-0">{children}</div>
      </div>
    </div>
  );
}

/** Área principal padrão das telas operacionais */
export function OpsMain({
  children,
  className,
  flush,
}: {
  children: React.ReactNode;
  className?: string;
  /** Sem padding lateral (ex.: kanban full-bleed) */
  flush?: boolean;
}) {
  return (
    <main
      className={cn(
        "flex-1 overflow-y-auto bg-background",
        flush ? "p-0" : "p-3 sm:p-4 md:p-5 lg:p-6 space-y-4 sm:space-y-5 md:space-y-6 min-w-0",
        className,
      )}
    >
      {children}
    </main>
  );
}
