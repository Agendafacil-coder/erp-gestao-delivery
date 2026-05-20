import { Link } from "@tanstack/react-router";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { formatBRL } from "@/lib/menu/format";
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
  /** Header enxuto na página do cardápio (só sacola + nome) */
  compactHeader?: boolean;
  cartPulse?: boolean;
  children: React.ReactNode;
};

/** Tema claro — rotas públicas do cardápio */
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
    <div className="min-h-screen bg-[#f5f5f7] text-[#1c1c1e] antialiased">
      <header
        className={cn(
          "sticky top-0 z-30 border-b border-black/[0.06] bg-white/92 backdrop-blur-lg",
          compactHeader ? "h-12" : "h-14 shadow-sm",
        )}
      >
        <div className="mx-auto flex h-full max-w-lg items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            {showBack && (
              <Link
                to={backTo ?? "/$tenantSlug"}
                params={{ tenantSlug }}
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#f0f0f2] text-[#555]"
              >
                <ArrowLeft className="size-4" />
              </Link>
            )}
            <div className="min-w-0">
              {!compactHeader && (
                <p className="truncate text-[10px] font-medium uppercase tracking-wider text-[#999]">
                  {tenantName ?? "Delivery OS"}
                </p>
              )}
              <h1
                className={cn(
                  "truncate font-semibold text-[#1c1c1e]",
                  compactHeader ? "text-[15px]" : "text-[15px] leading-tight",
                )}
              >
                {compactHeader ? (tenantName ?? title ?? "Cardápio") : (title ?? "Cardápio")}
              </h1>
              {subtitle && !compactHeader && (
                <p className="truncate text-[11px] text-[#888]">{subtitle}</p>
              )}
            </div>
          </div>
          <Link
            to="/$tenantSlug/carrinho"
            params={{ tenantSlug }}
            className={cn(
              "relative flex size-10 shrink-0 items-center justify-center rounded-full border border-[#ea1d2c]/12 bg-[#fff5f5] text-[#ea1d2c] transition-transform",
              cartPulse && "scale-110",
            )}
          >
            <ShoppingBag className="size-5" strokeWidth={2} />
            {cartCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#ea1d2c] px-1 text-[10px] font-bold text-white">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </header>

      {children}

      {cartCount > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="pointer-events-auto mx-auto max-w-lg">
            <Link
              to="/$tenantSlug/carrinho"
              params={{ tenantSlug }}
              className="flex w-full items-center justify-between rounded-2xl bg-[#ea1d2c] px-5 py-3.5 text-white shadow-[0_8px_32px_rgba(234,29,44,0.38)] transition-transform duration-200 active:scale-[0.98]"
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                <ShoppingBag className="size-5" />
                Ver sacola
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs tabular-nums">
                  {cartCount}
                </span>
              </span>
              <span className="text-sm font-bold tabular-nums">{formatBRL(cartTotal)}</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
