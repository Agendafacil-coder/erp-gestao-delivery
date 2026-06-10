import { Link } from "@tanstack/react-router";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { formatBRL } from "@/lib/menu/format";
import { MENU_PAGE_MAX } from "@/components/menu/public/menu-layout";
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
  children: React.ReactNode;
};

/** Shell do cardápio público — tema premium dark, mobile-first */
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
  children,
}: MenuLightShellProps) {
  return (
    <div className="menu-app menu-shell antialiased">
      <div className={cn("relative mx-auto w-full min-h-[100dvh]", MENU_PAGE_MAX)}>
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
              {!compactHeader && (
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
                "relative flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--menu-card)] text-[var(--menu-fg)] ring-1 ring-[var(--menu-border)] transition-transform",
                cartPulse && "scale-110",
              )}
              aria-label="Ver sacola"
            >
              <ShoppingBag className="size-[18px]" strokeWidth={2} />
              {cartCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--menu-accent)] px-1 text-[9px] font-bold text-white ring-2 ring-[var(--menu-bg)]">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </Link>
          </div>
        </header>

        {children}

        {cartCount > 0 && !hideFloatingCart && (
          <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className={cn("pointer-events-auto mx-auto w-full", MENU_PAGE_MAX)}>
              <Link
                to="/$tenantSlug/carrinho"
                params={{ tenantSlug }}
                className="menu-btn-primary flex w-full items-center justify-between px-4 py-3.5"
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  Ver sacola
                  <span className="rounded-md bg-white/20 px-2 py-0.5 text-xs tabular-nums">
                    {cartCount}
                  </span>
                </span>
                <span className="text-sm font-bold tabular-nums">{formatBRL(cartTotal)}</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
