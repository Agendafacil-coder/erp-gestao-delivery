import { useEffect, useMemo, useState } from "react";
import type { LocalOrder } from "@/lib/db/localDb";
import { filterRevenueOrdersInRange } from "@/lib/finance/calculations";
import { computeCmvFromLineItems } from "@/lib/finance/cmvPlaceholder";
import { listMenuAdminFn } from "@/functions/menu";
import { listRecipeUnitCostsFn } from "@/functions/recipes";
import { summarizeCmvEntriesFn } from "@/functions/finance-cmv";
import { orderRepository } from "@/lib/repositories";
import type { FinancialDateRange } from "@/lib/finance/types";

export type CmvComputation = {
  cmvTotal: number;
  source: "menu" | "estimate" | "recorded";
  itemsWithCost: number;
  itemsWithoutCost: number;
  /** Pedidos com CMV gravado na entrega (quando source = recorded) */
  ordersWithCmv?: number;
  /** False until menu costs and line items for the period have been fetched. */
  ready: boolean;
};

export function useFinancialCmv(
  tenantId: string | undefined,
  orders: LocalOrder[],
  range: FinancialDateRange,
): CmvComputation {
  const [lineItems, setLineItems] = useState<
    Array<{ order_id: string; menu_item_id: string | null; quantity: number }>
  >([]);
  const [menuCosts, setMenuCosts] = useState<Map<string, number>>(new Map());
  const [recipeCosts, setRecipeCosts] = useState<Map<string, number>>(new Map());
  const [recorded, setRecorded] = useState<{
    total: number;
    entryCount: number;
    ordersWithCmv: number;
    itemsWithCost: number;
    itemsWithoutCost: number;
  } | null>(null);
  const [lineItemsReady, setLineItemsReady] = useState(false);
  const [menuCostsReady, setMenuCostsReady] = useState(false);
  const [recordedReady, setRecordedReady] = useState(false);

  const revenueOrderIds = useMemo(() => {
    return filterRevenueOrdersInRange(orders, range).map((o) => o.id);
  }, [orders, range.from, range.to]);

  const orderIdsKey = revenueOrderIds.join(",");

  useEffect(() => {
    if (!tenantId || !range.from || !range.to) {
      setRecorded(null);
      setRecordedReady(true);
      return;
    }
    setRecordedReady(false);
    let cancelled = false;
    void summarizeCmvEntriesFn({
      data: { tenantId, from: range.from, to: range.to },
    })
      .then((summary) => {
        if (!cancelled) {
          setRecorded({
            total: summary.recordedTotal,
            entryCount: summary.entryCount,
            ordersWithCmv: summary.ordersWithCmv,
            itemsWithCost: summary.itemsWithCost,
            itemsWithoutCost: summary.itemsWithoutCost,
          });
          setRecordedReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRecorded(null);
          setRecordedReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [tenantId, range.from, range.to]);

  useEffect(() => {
    if (!tenantId || revenueOrderIds.length === 0) {
      setLineItems([]);
      setLineItemsReady(true);
      return;
    }

    setLineItemsReady(false);
    let cancelled = false;

    void (async () => {
      try {
        const batches = await Promise.all(
          revenueOrderIds
            .slice(0, 80)
            .map((orderId) => orderRepository.listOrderLineItems(orderId, tenantId)),
        );
        const merged: Array<{
          order_id: string;
          menu_item_id: string | null;
          quantity: number;
        }> = [];
        batches.forEach((items, idx) => {
          const orderId = revenueOrderIds[idx];
          for (const item of items) {
            merged.push({
              order_id: orderId,
              menu_item_id: item.menu_item_id ?? null,
              quantity: item.quantity,
            });
          }
        });
        if (!cancelled) {
          setLineItems(merged);
          setLineItemsReady(true);
        }
      } catch {
        if (!cancelled) {
          setLineItems([]);
          setLineItemsReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tenantId, orderIdsKey, revenueOrderIds]);

  useEffect(() => {
    if (!tenantId) {
      setMenuCosts(new Map());
      setRecipeCosts(new Map());
      setMenuCostsReady(false);
      return;
    }
    setMenuCostsReady(false);
    let cancelled = false;
    void Promise.all([
      listMenuAdminFn({ data: { tenantId } }),
      listRecipeUnitCostsFn({ data: { tenantId } }),
    ])
      .then(([menu, recipeMap]) => {
        const map = new Map<string, number>();
        for (const cat of menu.categories) {
          for (const item of cat.items) {
            if (item.unit_cost != null && item.unit_cost > 0) {
              map.set(item.id, item.unit_cost);
            }
          }
        }
        const recipe = new Map<string, number>();
        for (const [id, cost] of Object.entries(recipeMap)) {
          if (cost > 0) recipe.set(id, cost);
        }
        if (!cancelled) {
          setMenuCosts(map);
          setRecipeCosts(recipe);
          setMenuCostsReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMenuCosts(new Map());
          setRecipeCosts(new Map());
          setMenuCostsReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  return useMemo(() => {
    const ready = lineItemsReady && menuCostsReady && recordedReady;

    if (recorded && recorded.entryCount > 0 && recorded.total > 0) {
      return {
        cmvTotal: recorded.total,
        source: "recorded" as const,
        itemsWithCost: recorded.itemsWithCost,
        itemsWithoutCost: recorded.itemsWithoutCost,
        ordersWithCmv: recorded.ordersWithCmv,
        ready,
      };
    }

    const revenueOrders = filterRevenueOrdersInRange(orders, range);
    const gross = revenueOrders.reduce((acc, o) => {
      const subtotal =
        o.subtotal_amount ?? Math.max(0, (o.total_amount ?? 0) - (o.delivery_fee ?? 0));
      return acc + Math.max(0, subtotal - (o.discount_amount ?? 0));
    }, 0);
    const mergedCosts = new Map(menuCosts);
    for (const [id, cost] of recipeCosts) {
      mergedCosts.set(id, cost);
    }
    const result = computeCmvFromLineItems(lineItems, mergedCosts, gross);
    return {
      ...result,
      ready,
    };
  }, [
    orders,
    range,
    lineItems,
    menuCosts,
    recipeCosts,
    lineItemsReady,
    menuCostsReady,
    recordedReady,
    recorded,
  ]);
}
