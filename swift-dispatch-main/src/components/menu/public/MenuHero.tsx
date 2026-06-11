import { MapPin, UtensilsCrossed } from "lucide-react";
import { MENU_PAGE_MAX } from "@/components/menu/public/menu-layout";
import { pickMenuPlaceholderImage } from "@/lib/menu/menu-placeholders";
import type { MenuLayoutId } from "@/lib/menu/public-settings";
import { cn } from "@/lib/utils";

type MenuHeroProps = {
  name: string;
  coverImageUrl?: string | null;
  logoUrl?: string | null;
  city?: string | null;
  isOpen?: boolean;
  /** Ex.: Seg–Sáb 11:00–23:00 — exibido quando fechado */
  hoursSummary?: string | null;
  variant?: "full" | "compact";
  layoutId?: MenuLayoutId;
  pageMax?: string;
};

/** Hero da loja — capa cinematográfica, marca e confiança */
export function MenuHero({
  name,
  coverImageUrl,
  logoUrl,
  city,
  isOpen = true,
  hoursSummary,
  variant = "full",
  layoutId = "classic",
  pageMax = MENU_PAGE_MAX,
}: MenuHeroProps) {
  const initial = name.charAt(0).toUpperCase();
  const cover =
    coverImageUrl?.trim() ||
    pickMenuPlaceholderImage({ name, categoryName: "burger", id: name });
  const logo = logoUrl?.trim() || null;

  if (variant === "compact") {
    return (
      <div className={cn("relative px-4 pt-3 pb-1", pageMax, "mx-auto w-full")}>
        <div className="menu-hero-compact overflow-hidden rounded-2xl border border-[var(--menu-border)] bg-[var(--menu-card)] shadow-[var(--menu-shadow)]">
          <div className="h-1 bg-[var(--menu-gradient)]" />
          <div className="flex items-center gap-3.5 px-4 py-4">
            <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[var(--menu-gradient)] text-xl font-bold text-white shadow-[var(--menu-glow)]">
              {logo ? (
                <img src={logo} alt="" className="size-full object-cover" loading="eager" />
              ) : (
                initial
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-display text-lg font-bold leading-tight tracking-tight">
                {name}
              </h1>
              <p className="mt-1 text-xs text-[var(--menu-muted)]">
                Pedido digital · entrega e retirada
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {isOpen ? (
                  <span className="menu-badge menu-badge--open text-[10px]">
                    <span className="size-1.5 rounded-full bg-[var(--menu-success)]" />
                    Aberto agora
                  </span>
                ) : (
                  <span className="menu-badge bg-[var(--menu-card)] text-[var(--menu-muted)] text-[10px]">
                    Fechado
                  </span>
                )}
                {city ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-[var(--menu-muted)]">
                    <MapPin className="size-3 opacity-70" />
                    {city}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden", layoutId === "gallery" && "menu-hero--gallery")}>
      <div className={cn("relative w-full", layoutId === "gallery" ? "h-48 sm:h-56" : "h-44 sm:h-52")}>
        <img
          src={cover}
          alt=""
          className="absolute inset-0 size-full object-cover scale-105"
          loading="eager"
          decoding="async"
        />
        <div className="absolute inset-0 bg-[var(--menu-hero-overlay)]" />
        <div className="menu-hero-accent-glow absolute inset-0 opacity-70" />
      </div>

      <div className={cn("relative -mt-14 px-4 pb-2", pageMax, "mx-auto w-full")}>
        <div className="menu-hero-glass rounded-2xl p-4 sm:p-5">
          <div className="flex items-start gap-3.5">
            <div className="relative shrink-0">
              <div className="flex size-[4.25rem] items-center justify-center overflow-hidden rounded-2xl bg-[var(--menu-gradient)] text-2xl font-bold text-white shadow-[var(--menu-glow)] ring-[3px] ring-[var(--menu-bg)] sm:size-[4.75rem] sm:text-3xl">
                {logo ? (
                  <img src={logo} alt="" className="size-full object-cover" loading="eager" />
                ) : (
                  initial
                )}
              </div>
              {isOpen ? (
                <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-[var(--menu-success)] ring-2 ring-[var(--menu-bg)]">
                  <span className="size-2 rounded-full bg-white animate-pulse" />
                </span>
              ) : null}
            </div>

            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate font-display text-xl font-bold leading-tight tracking-tight sm:text-2xl">
                  {name}
                </h1>
                <span className="menu-badge shrink-0 border border-[var(--menu-accent)]/25 bg-[var(--menu-accent)]/12 text-[var(--menu-accent)]">
                  <UtensilsCrossed className="size-2.5" />
                  Online
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-[var(--menu-muted)] sm:text-[13px]">
                Pedido digital · entrega e retirada
                {city ? (
                  <>
                    {" "}
                    · <MapPin className="mb-px inline size-3 opacity-70" />
                    {city}
                  </>
                ) : null}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--menu-border)] pt-3.5">
            {isOpen ? (
              <span className="menu-badge menu-badge--open">
                <span className="size-1.5 rounded-full bg-[var(--menu-success)]" />
                Aberto agora
              </span>
            ) : (
              <span className="menu-badge bg-[var(--menu-card)] text-[var(--menu-muted)]">
                Fechado
              </span>
            )}
            {!isOpen && hoursSummary ? (
              <span className="text-[11px] text-[var(--menu-muted)]">{hoursSummary}</span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
