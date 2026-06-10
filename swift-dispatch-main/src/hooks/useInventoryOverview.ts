import { useEffect, useMemo, useState } from "react";
import { listMenuAdminFn } from "@/functions/menu";
import {
  buildInventoryOverview,
  type InventoryMenuItem,
  type InventoryOverview,
} from "@/lib/finance/inventorySummary";

export function useInventoryOverview(tenantId: string | undefined): {
  overview: InventoryOverview;
  items: InventoryMenuItem[];
  loading: boolean;
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

    void listMenuAdminFn({ data: { tenantId } })
      .then((menu) => {
        const flat: InventoryMenuItem[] = [];
        for (const cat of menu.categories) {
          for (const item of cat.items) {
            flat.push({
              id: item.id,
              name: item.name,
              price: item.price,
              unit_cost: item.unit_cost,
              stock_quantity: item.stock_quantity,
              stock_min: item.stock_min,
              available: item.available,
            });
          }
        }
        if (!cancelled) setItems(flat);
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

  return { overview, items, loading };
}
