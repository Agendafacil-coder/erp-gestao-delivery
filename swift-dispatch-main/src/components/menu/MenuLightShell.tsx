import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, ShoppingBag } from "lucide-react";
import { formatBRL } from "@/lib/menu/format";
import { getMenuLayoutConfig, MENU_PAGE_MAX } from "@/components/menu/public/menu-layout";
import type { MenuLayoutId } from "@/lib/menu/public-settings";
import { cn } from "@/lib/utils";

type MenuLightShellProps = {
  tenantName?: string;
  tenantSlug: string;
  title?: string;
  subtitle?: string;
  cartCount?: number;
  cartTotal?: number;
  showBack?: boolean;
  backTo?: string;
  /** Header enxuto na página do cardápio (só sacola; nome fica no hero) */
  compactHeader?: boolean;
  cartPulse?: boolean;
  /** Oculta barra flutuante "Ver sacola" (carrinho/checkout) */
  hideFloatingCart?: boolean;
  menuLayout?: MenuLayoutId;
  children: React.ReactNode;
};

/** Shell do cardápio público — tema premium warm, mobile-first */
export function MenuLightShell({
  tenantName,
  tenantSlug,
  title,
  subtitle,
  cartCount = 0,
  cartTotal = 0,
  showBack,
  backTo,
  compactHeader,
  cartPulse,
  hideFloatingCart,
  menuLayout = "classic",
  children,
}: MenuLightShellProps) {
  const layout = getMenuLayoutConfig(menuLayout);
  const pageMax = layout.pageMax;

  return (
    <div className={cn("menu-app menu-shell antialiased", layout.shellClass)}>
      <div className={cn("relative mx-auto w-full min-h-[100dvh]", pageMax)}>
        <header className={cn("menu-header", compactHeader ? "h-12" : "h-14")}>
          <div className="flex h-full items-center justify-between gap-2 px-4">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              {showBack && (
                <Link
                  to={backTo ?? "/$tenantSlug"}
                  params={{ tenantSlug }}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--menu-card)] text-[var(--menu-muted)] transition-colors hover:text-[var(--menu-fg)]"
                >
                  <ArrowLeft className="size-4" />
                </Link>
              )}
              {compactHeader ? (
                <p className="truncate text-sm font-semibold text-[var(--menu-fg)]">
                  {tenantName?.trim() || title?.trim() || "Delivery OS"}
                </p>
              ) : (
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-[var(--menu-muted)]">
                    {tenantName ?? "Delivery OS"}
                  </p>
                  <h1 className="truncate font-display text-[15px] font-semibold leading-tight">
                    {title ?? "Cardápio"}
                  </h1>
                  {subtitle && (
                    <p className="truncate text-[11px] text-[var(--menu-muted)]">{subtitle}</p>
                  )}
                </div>
              )}
            </div>
            <Link
              to="/$tenantSlug/carrinho"
              params={{ tenantSlug }}
              className={cn(
                "relative flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--menu-card)] text-[var(--menu-fg)] ring-1 ring-[var(--menu-border)] transition-all",
                cartPulse && "scale-110 ring-[var(--menu-accent)]/40",
              )}
              aria-label="Ver sacola"
            >
              <ShoppingBag className="size-[18px]" strokeWidth={2} />
              {cartCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--menu-gradient)] px-1 text-[9px] font-bold text-white ring-2 ring-[var(--menu-bg)]">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </Link>
          </div>
        </header>

        {children}

        {cartCount > 0 && !hideFloatingCart && (
          <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className={cn("pointer-events-auto mx-auto w-full", pageMax)}>
              <Link
                to="/$tenantSlug/carrinho"
                params={{ tenantSlug }}
                className="menu-btn-primary flex w-full items-center justify-between gap-3 px-4 py-3.5 shadow-[var(--menu-shadow)]"
              >
                <span className="flex items-center gap-2.5 text-sm font-semibold">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-white/15">
                    <ShoppingBag className="size-3.5" />
                  </span>
                  Ver sacola
                  <span className="rounded-md bg-white/20 px-2 py-0.5 text-xs tabular-nums">
                    {cartCount}
                  </span>
                </span>
                <span className="flex items-center gap-1.5 text-sm font-bold tabular-nums">
                  {formatBRL(cartTotal)}
                  <ArrowRight className="size-4 opacity-80" />
                </span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
