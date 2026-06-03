import { cn } from "@/lib/utils";

type OpsPageHeaderProps = {
  subtitle?: string;
  title: React.ReactNode;
  highlight?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
};

export function OpsPageHeader({
  subtitle,
  title,
  highlight,
  actions,
  className,
}: OpsPageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {subtitle && <p className="erp-page-subtitle">{subtitle}</p>}
        <h1 className="erp-page-title mt-1">
          {title}
          {highlight != null && (
            <>
              {" "}
              <span className="text-gradient">{highlight}</span>
            </>
          )}
        </h1>
      </div>
      {actions && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
