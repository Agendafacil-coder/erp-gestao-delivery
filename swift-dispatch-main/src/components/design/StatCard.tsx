import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppCard } from "@/components/design/AppCard";

type StatCardProps = {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: LucideIcon;
  variant?: "default" | "warning" | "danger";
  delta?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  variant = "default",
  delta,
  className,
  children,
}: StatCardProps) {
  const iconBg =
    variant === "warning"
      ? "bg-warning/12 text-warning"
      : variant === "danger"
        ? "bg-danger/10 text-danger"
        : "bg-primary/10 text-primary";

  return (
    <AppCard className={cn("p-4 sm:p-5 min-w-0 flex flex-col gap-3", className)} hover>
      <div className="flex items-start justify-between gap-2">
        {Icon && (
          <div
            className={cn(
              "size-10 rounded-2xl flex items-center justify-center shrink-0",
              iconBg,
            )}
          >
            <Icon className="size-4" strokeWidth={2} />
          </div>
        )}
        {delta && <div className="shrink-0">{delta}</div>}
      </div>
      <div>
        <div className="text-xl sm:text-2xl font-semibold tabular-nums tracking-tight leading-none text-foreground">
          {value}
        </div>
        <div className="text-xs text-muted-foreground mt-2 leading-snug font-medium">{label}</div>
        {hint && (
          <div className="text-[11px] text-muted-foreground/80 mt-1 truncate">{hint}</div>
        )}
      </div>
      {children}
    </AppCard>
  );
}
