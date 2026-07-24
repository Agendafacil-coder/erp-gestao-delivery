import { useEffect, useMemo, useState } from "react";
import { listMenuAdminFn } from "@/functions/menu";
import { listRecipeUnitCostsFn } from "@/functions/recipes";
import {
  buildInventoryOverview,
  type InventoryMenuItem,
  type InventoryOverview,
} from "@/lib/finance/inventorySummary";

function flattenMenu(
  menu: Awaited<ReturnType<typeof listMenuAdminFn>>,
  recipeCosts: Record<string, number>,
): InventoryMenuItem[] {
  const flat: InventoryMenuItem[] = [];
  for (const cat of menu.categories) {
    for (const item of cat.items) {
      const recipeCost = recipeCosts[item.id];
      const unitCost =
        item.unit_cost != null && item.unit_cost > 0
          ? item.unit_cost
          : recipeCost != null && recipeCost > 0
            ? recipeCost
            : item.unit_cost;
      flat.push({
        id: item.id,
        name: item.name,
        price: item.price,
        unit_cost: unitCost,
        stock_quantity: item.stock_quantity,
        stock_min: item.stock_min,
        available: item.available,
      });
    }
  }
  return flat;
}

export function useInventoryOverview(tenantId: string | undefined): {
  overview: InventoryOverview;
  items: InventoryMenuItem[];
  loading: boolean;
  reload: () => void;
} {
  const [items, setItems] = useState<InventoryMenuItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!tenantId) {
      setItems([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void Promise.all([
      listMenuAdminFn({ data: { tenantId } }),
      listRecipeUnitCostsFn({ data: { tenantId } }).catch(() => ({}) as Record<string, number>),
    ])
      .then(([menu, recipeMap]) => {
        if (!cancelled) setItems(flattenMenu(menu, recipeMap));
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  const overview = useMemo(() => buildInventoryOverview(items), [items]);

  const reload = () => {
    if (!tenantId) return;
    setLoading(true);
    void Promise.all([
      listMenuAdminFn({ data: { tenantId } }),
      listRecipeUnitCostsFn({ data: { tenantId } }).catch(() => ({}) as Record<string, number>),
    ])
      .then(([menu, recipeMap]) => {
        setItems(flattenMenu(menu, recipeMap));
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  return { overview, items, loading, reload };
}
