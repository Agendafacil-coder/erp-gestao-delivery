import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: React.ReactNode;
  /** Subtítulo abaixo do título (mesmo papel que erp-page-subtitle) */
  description?: string;
  eyebrow?: string;
  icon?: LucideIcon;
  iconClassName?: string;
  highlight?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
};

export function PageHeader({
  title,
  description,
  eyebrow,
  icon: Icon,
  iconClassName,
  highlight,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between pb-1",
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        {eyebrow && (
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            {Icon && <Icon className={cn("size-3.5 shrink-0", iconClassName)} />}
            <span>{eyebrow}</span>
          </div>
        )}
        <h1 className="erp-page-title">
          {title}
          {highlight != null && (
            <>
              {" "}
              <span className="text-primary">{highlight}</span>
            </>
          )}
        </h1>
        {description && <p className="erp-page-subtitle max-w-2xl">{description}</p>}
      </div>
      {actions && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </header>
  );
}
