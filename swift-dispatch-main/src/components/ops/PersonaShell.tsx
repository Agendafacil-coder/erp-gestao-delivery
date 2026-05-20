import { Link } from "@tanstack/react-router";
import { Zap, LogOut } from "lucide-react";
import { authRepository } from "@/lib/repositories";
import { useNavigate } from "@tanstack/react-router";

type PersonaShellProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  accent?: "kitchen" | "driver";
};

export function PersonaShell({ title, subtitle, children, accent = "kitchen" }: PersonaShellProps) {
  const navigate = useNavigate();

  const signOut = async () => {
    await authRepository.signOut();
    navigate({ to: "/login" });
  };

  const gradient =
    accent === "driver"
      ? "from-accent/30 to-primary/20"
      : "from-warning/25 to-primary/15";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header
        className={`h-14 shrink-0 border-b border-border flex items-center justify-between px-4 bg-gradient-to-r ${gradient}`}
      >
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-primary to-accent">
            <Zap className="size-4 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-display font-semibold text-sm leading-none">{title}</div>
            {subtitle && (
              <div className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="text-xs text-muted-foreground hover:text-foreground hidden sm:inline"
          >
            Trocar conta
          </Link>
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-surface-elevated/50"
          >
            <LogOut className="size-3.5" />
            Sair
          </button>
        </div>
      </header>
      <main className="flex-1 min-h-0 overflow-auto">{children}</main>
    </div>
  );
}
