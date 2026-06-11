import { MapPin, UtensilsCrossed } from "lucide-react";
import { MENU_PAGE_MAX } from "@/components/menu/public/menu-layout";
import { pickMenuPlaceholderImage } from "@/lib/menu/menu-placeholders";
import { cn } from "@/lib/utils";

type MenuHeroProps = {
  name: string;
  coverImageUrl?: string | null;
  logoUrl?: string | null;
  city?: string | null;
  isOpen?: boolean;
};

/** Hero da loja — capa cinematográfica, marca e confiança */
export function MenuHero({ name, coverImageUrl, logoUrl, city, isOpen = true }: MenuHeroProps) {
  const initial = name.charAt(0).toUpperCase();
  const cover =
    coverImageUrl?.trim() ||
    pickMenuPlaceholderImage({ name, categoryName: "burger", id: name });
  const logo = logoUrl?.trim() || null;

  return (
    <div className="relative overflow-hidden">
      <div className="relative h-44 w-full sm:h-52">
        <img
          src={cover}
          alt=""
          className="absolute inset-0 size-full object-cover scale-105"
          loading="eager"
          decoding="async"
        />
        <div className="absolute inset-0 bg-[var(--menu-hero-overlay)]" />
        <div
          className="absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(ellipse 90% 60% at 80% 0%, oklch(0.74 0.15 65 / 0.35), transparent 55%)",
          }}
        />
      </div>

      <div className={cn("relative -mt-14 px-4 pb-2", MENU_PAGE_MAX, "mx-auto w-full")}>
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
          </div>
        </div>
      </div>
    </div>
  );
}
