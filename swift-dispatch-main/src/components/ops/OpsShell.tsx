import { OpsSidebar } from "@/components/ops/Sidebar";
import { OpsHeader } from "@/components/ops/Header";
import { cn } from "@/lib/utils";
import { useOpsLayout } from "@/hooks/useOpsLayout";

export function OpsShell({ children }: { children: React.ReactNode }) {
  const { sidebarHidden } = useOpsLayout();

  return (
    <div className="ops-app flex bg-background">
      {!sidebarHidden && <OpsSidebar />}
      <div className="ops-main flex flex-1 flex-col">
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
        "erp-scrollbar flex-1 overflow-y-auto bg-background",
        flush
          ? "p-0"
          : "p-4 sm:p-5 md:p-6 lg:p-8 space-y-5 sm:space-y-6 md:space-y-7 min-w-0 max-w-[1600px] w-full mx-auto",
        className,
      )}
    >
      {children}
    </main>
  );
}
