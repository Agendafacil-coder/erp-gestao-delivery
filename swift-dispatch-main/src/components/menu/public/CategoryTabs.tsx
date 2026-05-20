import { useEffect, useRef } from "react";

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

  const tabClass = (active: boolean) =>
    `relative shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all ${
      active ? "bg-[#1c1c1e] text-white" : "text-[#666] hover:bg-[#f0f0f2]"
    }`;

  return (
    <div className="sticky top-12 z-20 border-b border-black/[0.06] bg-white/95 shadow-[0_4px_12px_rgba(0,0,0,0.04)] backdrop-blur-md">
      <div
        ref={scrollRef}
        className="mx-auto flex max-w-lg gap-1 overflow-x-auto px-3 py-2.5 scrollbar-none"
      >
        <button
          type="button"
          data-cat={ALL_CATEGORIES_ID}
          onClick={() => onSelect(ALL_CATEGORIES_ID)}
          className={tabClass(activeId === ALL_CATEGORIES_ID)}
        >
          Todos
          {activeId === ALL_CATEGORIES_ID ? (
            <span className="absolute -bottom-2.5 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-[#ea1d2c]" />
          ) : null}
        </button>

        {categories.map((cat) => {
          const active = cat.id === activeId;
          return (
            <button
              key={cat.id}
              type="button"
              data-cat={cat.id}
              onClick={() => onSelect(cat.id)}
              className={tabClass(active)}
            >
              {cat.name}
              {active ? (
                <span className="absolute -bottom-2.5 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-[#ea1d2c]" />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
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
        { rootMargin: "-100px 0px -55% 0px", threshold: 0 },
      );
      obs.observe(el);
      observers.push(obs);
    }

    return () => observers.forEach((o) => o.disconnect());
  }, [categoryIds, setActiveId, enabled]);
}
