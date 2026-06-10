import { Layers2 } from "lucide-react";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  tagline?: string;
  className?: string;
  onDark?: boolean;
};

const SIZES = {
  sm: { mark: "size-8 rounded-lg", icon: "size-4", title: "text-sm", tag: "text-[10px]" },
  md: { mark: "size-10 rounded-xl", icon: "size-[18px]", title: "text-base", tag: "text-[11px]" },
  lg: { mark: "size-12 rounded-xl", icon: "size-6", title: "text-xl", tag: "text-sm" },
} as const;

/** Marca visual: wordmark + ícone geométrico. */
export function BrandLogo({
  size = "md",
  showTagline = true,
  tagline = "Operações de delivery",
  className,
  onDark = false,
}: BrandLogoProps) {
  const s = SIZES[size];

  return (
    <div className={cn("flex items-center gap-3 min-w-0", className)}>
      <div
        className={cn("brand-mark flex shrink-0 items-center justify-center", s.mark)}
        aria-hidden
      >
        <Layers2 className={cn(s.icon, "text-primary-foreground")} strokeWidth={2.25} />
      </div>
      <div className="min-w-0">
        <div
          className={cn(
            "brand-wordmark font-display font-bold leading-none tracking-tight",
            s.title,
          )}
        >
          <span className={onDark ? "text-white" : "text-foreground"}>Delivery</span>
          <span className="text-primary">OS</span>
        </div>
        {showTagline ? (
          <p
            className={cn(
              "mt-1 truncate font-medium leading-snug",
              s.tag,
              onDark ? "text-white/60" : "text-muted-foreground",
            )}
          >
            {tagline}
          </p>
        ) : null}
      </div>
    </div>
  );
}
