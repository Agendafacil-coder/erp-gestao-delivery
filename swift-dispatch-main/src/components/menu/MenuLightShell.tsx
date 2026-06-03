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
  children: React.ReactNode;
};

/** Tema claro — rotas públicas do cardápio (mobile-first) */
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
  children,
}: MenuLightShellProps) {
  return (
    <div className="min-h-[100dvh] bg-[#ebebed] text-[#1c1c1e] antialiased">
      <div className={cn("relative mx-auto w-full min-h-[100dvh] bg-[#f7f7f8]", MENU_PAGE_MAX)}>
        <header
          className={cn(
            "sticky top-0 z-30 border-b border-black/[0.06] bg-white/95 backdrop-blur-md",
            compactHeader ? "h-11" : "h-12 shadow-sm",
          )}
        >
          <div className="flex h-full items-center justify-between gap-2 px-4">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              {showBack && (
                <Link
                  to={backTo ?? "/$tenantSlug"}
                  params={{ tenantSlug }}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#f0f0f2] text-[#555]"
                >
                  <ArrowLeft className="size-4" />
                </Link>
              )}
              {!compactHeader && (
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-medium uppercase tracking-wider text-[#999]">
                    {tenantName ?? "Delivery OS"}
                  </p>
                  <h1 className="truncate text-[15px] font-semibold leading-tight text-[#1c1c1e]">
                    {title ?? "Cardápio"}
                  </h1>
                  {subtitle && (
                    <p className="truncate text-[11px] text-[#888]">{subtitle}</p>
                  )}
                </div>
              )}
            </div>
            <Link
              to="/$tenantSlug/carrinho"
              params={{ tenantSlug }}
              className={cn(
                "relative flex size-9 shrink-0 items-center justify-center rounded-full bg-[#ea1d2c] text-white transition-transform",
                cartPulse && "scale-110",
              )}
              aria-label="Ver sacola"
            >
              <ShoppingBag className="size-[18px]" strokeWidth={2} />
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-[#1c1c1e] px-1 text-[9px] font-bold text-white ring-2 ring-white">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </Link>
          </div>
        </header>

        {children}

        {cartCount > 0 && (
          <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className={cn("pointer-events-auto mx-auto w-full px-0", MENU_PAGE_MAX)}>
              <Link
                to="/$tenantSlug/carrinho"
                params={{ tenantSlug }}
                className="flex w-full items-center justify-between rounded-xl bg-[#ea1d2c] px-4 py-3.5 text-white shadow-[0_6px_24px_rgba(234,29,44,0.35)] transition-transform active:scale-[0.98]"
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
