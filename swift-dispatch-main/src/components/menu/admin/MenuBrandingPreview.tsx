import { getMenuLayoutConfig } from "@/components/menu/public/menu-layout";
import type { MenuLayoutId } from "@/lib/menu/public-settings";
import { cn } from "@/lib/utils";

type MenuBrandingPreviewProps = {
  layoutId: MenuLayoutId;
  tenantName: string;
  coverUrl: string;
  logoUrl: string | null;
  coverBusy?: boolean;
  logoBusy?: boolean;
  onPickCover: () => void;
  onPickLogo: () => void;
};

/** Prévia ao vivo do cardápio público dentro do dialog de branding. */
export function MenuBrandingPreview({
  layoutId,
  tenantName,
  coverUrl,
  logoUrl,
  coverBusy,
  logoBusy,
  onPickCover,
  onPickLogo,
}: MenuBrandingPreviewProps) {
  const layout = getMenuLayoutConfig(layoutId);
  const initial = tenantName.charAt(0).toUpperCase();
  const isCompact = layout.heroVariant === "compact";

  return (
    <div
      className={cn(
        "menu-app overflow-hidden rounded-[1.35rem] border border-[var(--menu-border)] shadow-lg ring-1 ring-white/[0.04]",
        layout.shellClass,
      )}
    >
      {isCompact ? (
        <div className="menu-hero-compact m-2 overflow-hidden rounded-xl border border-[var(--menu-border)] bg-[var(--menu-card)]">
          <div className="h-1 bg-[var(--menu-gradient)]" />
          <div className="flex items-center gap-2.5 px-3 py-3">
            <button
              type="button"
              onClick={onPickLogo}
              className="group relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--menu-gradient)] text-sm font-bold text-white"
            >
              {logoUrl ? (
                <img src={logoUrl} alt="" className="size-full object-cover" />
              ) : (
                initial
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-[9px] text-white opacity-0 group-hover:opacity-100">
                {logoBusy ? "…" : "Logo"}
              </span>
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{tenantName}</p>
              <span className="menu-badge menu-badge--open mt-1 text-[9px]">
                <span className="size-1 rounded-full bg-[var(--menu-success)]" />
                Aberto
              </span>
            </div>
          </div>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={onPickCover}
            className="group relative block h-24 w-full overflow-hidden"
          >
            <img src={coverUrl} alt="" className="size-full object-cover" />
            <div className="absolute inset-0 bg-[var(--menu-hero-overlay)]" />
            <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
              {coverBusy ? "Enviando…" : "Alterar capa"}
            </span>
          </button>
          <div className="relative -mt-7 px-2.5 pb-2">
            <div className="menu-hero-glass rounded-xl p-2.5">
              <div className="flex items-start gap-2">
                <button
                  type="button"
                  onClick={onPickLogo}
                  className="group relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--menu-gradient)] text-sm font-bold text-white"
                >
                  {logoUrl ? (
                    <img src={logoUrl} alt="" className="size-full object-cover" />
                  ) : (
                    initial
                  )}
                  <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-[8px] text-white opacity-0 group-hover:opacity-100">
                    {logoBusy ? "…" : "Logo"}
                  </span>
                </button>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="truncate text-xs font-bold">{tenantName}</p>
                  <p className="text-[9px] text-[var(--menu-muted)]">Pedido digital</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="space-y-2 px-2.5 pb-3">
        <div className="h-7 rounded-lg border border-[var(--menu-border)] bg-[var(--menu-card)] px-2 text-[9px] leading-7 text-[var(--menu-muted)]">
          Buscar no cardápio…
        </div>

        {layout.highlightStyle === "strip" ? (
          <div className="flex gap-1.5 overflow-hidden">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-6 shrink-0 rounded-full border border-[var(--menu-border)] bg-[var(--menu-surface)] px-2 text-[8px] leading-6 text-[var(--menu-muted)]"
              >
                Destaque
              </div>
            ))}
          </div>
        ) : layout.highlightStyle === "rail" ? (
          <div className="flex gap-1.5 overflow-hidden">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="w-14 shrink-0 overflow-hidden rounded-lg border border-[var(--menu-border)] bg-[var(--menu-card)]"
              >
                <div className="aspect-square bg-[var(--menu-surface)]" />
                <div className="h-1.5" />
              </div>
            ))}
          </div>
        ) : null}

        <div
          className={cn(
            layout.productLayout === "grid"
              ? "grid grid-cols-2 gap-1.5"
              : "flex flex-col gap-1.5",
          )}
        >
          {[0, 1].map((i) => (
            <div
              key={i}
              className={cn(
                "overflow-hidden border border-[var(--menu-border)] bg-[var(--menu-card)]",
                layout.cardVariant === "gallery"
                  ? "menu-card--gallery rounded-xl"
                  : layout.cardVariant === "clean"
                    ? "menu-card--clean rounded-lg"
                    : "menu-card--list rounded-xl",
                layout.productLayout === "list" && "flex items-center gap-2 p-1.5",
              )}
            >
              <div
                className={cn(
                  "bg-[var(--menu-surface)]",
                  layout.productLayout === "grid" ? "aspect-[4/3] w-full" : "size-8 shrink-0 rounded-md",
                )}
              />
              {layout.productLayout === "list" ? (
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="h-2 w-3/4 rounded-sm bg-[var(--menu-muted)]/25" />
                  <div className="h-2 w-1/3 rounded-sm bg-[var(--menu-accent)]/30" />
                </div>
              ) : (
                <div className="space-y-1 p-1.5">
                  <div className="h-2 w-full rounded-sm bg-[var(--menu-muted)]/25" />
                  <div className="h-2 w-2/3 rounded-sm bg-[var(--menu-accent)]/30" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
