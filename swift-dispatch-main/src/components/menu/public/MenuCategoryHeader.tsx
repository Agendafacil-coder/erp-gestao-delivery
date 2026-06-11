import type { MenuLayoutId } from "@/lib/menu/public-settings";

type MenuCategoryHeaderProps = {
  name: string;
  itemCount: number;
  layoutId: MenuLayoutId;
};

export function MenuCategoryHeader({ name, itemCount, layoutId }: MenuCategoryHeaderProps) {
  const countLabel = `${itemCount} ${itemCount === 1 ? "item" : "itens"}`;

  if (layoutId === "clean") {
    return (
      <div className="mb-3 border-b border-[var(--menu-border)] pb-2.5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="menu-section-title text-base">{name}</h2>
          <span className="text-[11px] font-medium text-[var(--menu-muted)]">{countLabel}</span>
        </div>
      </div>
    );
  }

  if (layoutId === "gallery") {
    return (
      <div className="mb-4 flex items-center gap-3">
        <span className="h-6 w-1 shrink-0 rounded-full bg-[var(--menu-gradient)]" />
        <div className="min-w-0 flex-1">
          <h2 className="menu-section-title text-lg">{name}</h2>
          <p className="menu-section-subtitle">{countLabel}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-3.5 flex items-center gap-2.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--menu-accent)]/12 text-sm font-bold text-[var(--menu-accent)]">
        {name.charAt(0).toUpperCase()}
      </span>
      <div>
        <h2 className="menu-section-title">{name}</h2>
        <p className="menu-section-subtitle">{countLabel}</p>
      </div>
    </div>
  );
}
