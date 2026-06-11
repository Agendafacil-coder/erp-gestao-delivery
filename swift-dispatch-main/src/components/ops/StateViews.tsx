import { AlertCircle, CheckCircle2, Inbox, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type StateSize = "sm" | "md" | "lg";

const sizeMap: Record<StateSize, { icon: string; title: string; pad: string }> = {
  sm: { icon: "size-8", title: "text-base", pad: "py-8 px-4" },
  md: { icon: "size-10", title: "text-lg", pad: "py-12 px-6" },
  lg: { icon: "size-12", title: "text-xl", pad: "py-16 px-6" },
};

export function LoadingState({
  label = "Carregando…",
  size = "md",
  className,
}: {
  label?: string;
  size?: StateSize;
  className?: string;
}) {
  const s = sizeMap[size];
  return (
    <div
      className={cn(
        "erp-state erp-state--loading flex flex-col items-center justify-center",
        s.pad,
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <Loader2 className={cn(s.icon, "text-primary animate-spin")} aria-hidden />
      <p className="mt-3 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  size = "md",
  className,
}: {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
  size?: StateSize;
  className?: string;
}) {
  const s = sizeMap[size];
  return (
    <div
      className={cn(
        "erp-state erp-state--empty flex flex-col items-center text-center",
        s.pad,
        className,
      )}
    >
      <div className="erp-state-icon-wrap">
        <Icon className={cn(s.icon, "text-muted-foreground/70")} aria-hidden />
      </div>
      <h3 className={cn(s.title, "font-semibold text-foreground mt-4")}>{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mt-2 max-w-sm leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "Algo deu errado",
  description,
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "erp-state erp-state--error flex flex-col items-center text-center py-12 px-6",
        className,
      )}
      role="alert"
    >
      <div className="erp-state-icon-wrap erp-state-icon-wrap--danger">
        <AlertCircle className="size-10 text-danger" aria-hidden />
      </div>
      <h3 className="text-lg font-semibold text-foreground mt-4">{title}</h3>
      {description && <p className="text-sm text-muted-foreground mt-2 max-w-md">{description}</p>}
      {onRetry && (
        <button type="button" onClick={onRetry} className="erp-btn-secondary mt-5">
          Tentar novamente
        </button>
      )}
    </div>
  );
}

export function SuccessBanner({
  title,
  description,
  className,
}: {
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "erp-banner erp-banner--success flex items-start gap-3 rounded-xl border px-4 py-3",
        className,
      )}
      role="status"
    >
      <CheckCircle2 className="size-5 text-success shrink-0 mt-0.5" aria-hidden />
      <div className="min-w-0 text-left">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
    </div>
  );
}
