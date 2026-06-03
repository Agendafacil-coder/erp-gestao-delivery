import { useEffect, useRef } from "react";
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
    <div className="sticky top-11 z-20 border-b border-black/[0.06] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      <div
        ref={scrollRef}
        className={cn(
          "mx-auto flex w-full gap-2 overflow-x-auto px-4 py-2.5 scrollbar-none",
          MENU_PAGE_MAX,
        )}
      >
        <TabButton
          id={ALL_CATEGORIES_ID}
          label="Todos"
          active={activeId === ALL_CATEGORIES_ID}
          onSelect={onSelect}
        />
        {categories.map((cat) => (
          <TabButton
            key={cat.id}
            id={cat.id}
            label={cat.name}
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
  active,
  onSelect,
}: {
  id: string;
  label: string;
  active: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      data-cat={id}
      onClick={() => onSelect(id)}
      className={cn(
        "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-[#1c1c1e] text-white"
          : "bg-[#f0f0f2] text-[#555] active:bg-[#e5e5e8]",
      )}
    >
      {label}
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
        { rootMargin: "-88px 0px -60% 0px", threshold: 0 },
      );
      obs.observe(el);
      observers.push(obs);
    }

    return () => observers.forEach((o) => o.disconnect());
  }, [categoryIds, setActiveId, enabled]);
}
