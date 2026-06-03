import * as React from "react";
import { cn } from "@/lib/utils";

type AppCardProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Sem borda visível — apenas sombra (estilo Linear) */
  flat?: boolean;
  /** Elevação ao hover */
  hover?: boolean;
};

export function AppCard({ className, flat, hover, children, ...props }: AppCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-card text-card-foreground",
        flat
          ? "shadow-[var(--shadow-card)]"
          : "border border-border/50 shadow-[var(--shadow-card)]",
        hover && "transition-shadow duration-200 hover:shadow-[var(--shadow-lift)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function AppCardHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between px-5 py-4 sm:px-6 border-b border-border/40",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function AppCardTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn("font-display text-sm font-semibold tracking-tight text-foreground", className)}
      {...props}
    >
      {children}
    </h2>
  );
}

export function AppCardDescription({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-xs text-muted-foreground mt-0.5 leading-relaxed", className)} {...props}>
      {children}
    </p>
  );
}

export function AppCardContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("px-5 py-4 sm:px-6", className)} {...props}>
      {children}
    </div>
  );
}
