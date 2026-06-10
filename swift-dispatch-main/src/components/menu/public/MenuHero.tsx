import { Clock, Star, Sparkles } from "lucide-react";
import { MENU_PAGE_MAX } from "@/components/menu/public/menu-layout";
import { cn } from "@/lib/utils";

type MenuHeroProps = {
  name: string;
  isOpen?: boolean;
};

/** Hero da loja — capa, status e badges promocionais */
export function MenuHero({ name, isOpen = true }: MenuHeroProps) {
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className="relative overflow-hidden">
      {/* Capa com gradiente */}
      <div className="relative h-36 w-full bg-[var(--menu-surface)] sm:h-40">
        <div
          className="absolute inset-0 opacity-90"
          style={{
            background:
              "radial-gradient(ellipse 120% 80% at 50% 100%, oklch(0.45 0.18 35 / 0.5), transparent 70%), linear-gradient(180deg, oklch(0.22 0.03 265) 0%, oklch(0.14 0.015 265) 100%)",
          }}
        />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMwIDkuOTQtOC4wNiAxOC0xOCAxOHMtMTgtOC4wNi0xOC0xOCA4LjA2LTE4IDE4LTE4IDE4IDguMDYgMTggMTh6IiBzdHJva2U9IndoaXRlIiBzdHJva2Utb3BhY2l0eT0iLjAzIi8+PC9nPjwvc3ZnPg==')] opacity-40" />
      </div>

      <div
        className={cn(
          "relative -mt-10 px-4 pb-4",
          MENU_PAGE_MAX,
          "mx-auto w-full",
        )}
      >
        <div className="flex items-end gap-3">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-[var(--menu-gradient)] text-2xl font-bold text-white shadow-[var(--menu-glow)] ring-4 ring-[var(--menu-bg)]">
            {initial}
          </div>
          <div className="min-w-0 flex-1 pb-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate font-display text-xl font-bold leading-tight tracking-tight">
                {name}
              </h1>
              <span className="menu-badge shrink-0 bg-[var(--menu-accent)]/20 text-[var(--menu-accent)]">
                <Sparkles className="size-2.5" />
                Online
              </span>
            </div>
            <p className="mt-0.5 text-xs text-[var(--menu-muted)]">
              Pedido digital · entrega e retirada
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {isOpen ? (
            <span className="menu-badge menu-badge--open">
              <span className="size-1.5 rounded-full bg-[var(--menu-success)] animate-pulse" />
              Aberto agora
            </span>
          ) : (
            <span className="menu-badge bg-[var(--menu-card)] text-[var(--menu-muted)]">
              Fechado
            </span>
          )}
          <span className="menu-badge bg-[var(--menu-card)] text-[var(--menu-muted)]">
            <Star className="size-2.5 fill-amber-400 text-amber-400" />
            4,8
          </span>
          <span className="menu-badge bg-[var(--menu-card)] text-[var(--menu-muted)]">
            <Clock className="size-2.5" />
            35–50 min
          </span>
        </div>
      </div>
    </div>
  );
}
