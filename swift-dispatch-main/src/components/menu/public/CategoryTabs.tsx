import { useEffect, useRef } from "react";
import { categoryEmoji } from "@/lib/menu/format";
import { MENU_PAGE_MAX } from "@/components/menu/public/menu-layout";
import { cn } from "@/lib/utils";

export const ALL_CATEGORIES_ID = "all";

type CategoryTabsProps = {
  categories: Array<{ id: string; name: string }>;
  activeId: string;
  onSelect: (id: string) => void;
};

export function CategoryTabs({ categories, activeId, onSelect }: CategoryTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current?.querySelector(`[data-cat="${activeId}"]`);
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [activeId]);

  return (
    <div className="sticky top-12 z-20 border-b border-[var(--menu-border)] bg-[var(--menu-bg)]/88 backdrop-blur-xl">
      <div
        ref={scrollRef}
        className={cn(
          "mx-auto flex w-full gap-2 overflow-x-auto px-4 py-3 scrollbar-none",
          MENU_PAGE_MAX,
        )}
      >
        <TabButton
          id={ALL_CATEGORIES_ID}
          label="Início"
          emoji="✨"
          active={activeId === ALL_CATEGORIES_ID}
          onSelect={onSelect}
        />
        {categories.map((cat) => (
          <TabButton
            key={cat.id}
            id={cat.id}
            label={cat.name}
            emoji={categoryEmoji(cat.name)}
            active={cat.id === activeId}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

function TabButton({
  id,
  label,
  emoji,
  active,
  onSelect,
}: {
  id: string;
  label: string;
  emoji: string;
  active: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      data-cat={id}
      onClick={() => onSelect(id)}
      className={cn(
        "menu-tab flex shrink-0 items-center gap-1.5",
        active ? "menu-tab--active shadow-[var(--menu-glow)]" : "menu-tab--idle",
      )}
    >
      <span className="text-sm leading-none" aria-hidden>
        {emoji}
      </span>
      <span className="max-w-[8rem] truncate">{label}</span>
    </button>
  );
}

/** Atualiza aba ativa ao rolar — só no modo "Todos" */
export function useCategorySpy(
  categoryIds: string[],
  setActiveId: (id: string) => void,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled || !categoryIds.length) return;

    const observers: IntersectionObserver[] = [];

    for (const id of categoryIds) {
      const el = document.getElementById(`menu-cat-${id}`);
      if (!el) continue;

      const obs = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              setActiveId(id);
              break;
            }
          }
        },
        { rootMargin: "-96px 0px -60% 0px", threshold: 0 },
      );
      obs.observe(el);
      observers.push(obs);
    }

    return () => observers.forEach((o) => o.disconnect());
  }, [categoryIds, setActiveId, enabled]);
}
