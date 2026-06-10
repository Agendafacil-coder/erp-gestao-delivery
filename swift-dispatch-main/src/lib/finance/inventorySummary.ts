export type InventoryMenuItem = {
  id: string;
  name: string;
  price: number;
  unit_cost: number | null;
  stock_quantity: number | null;
  stock_min: number;
  available: boolean;
};

export type InventoryOverview = {
  totalProducts: number;
  withUnitCost: number;
  withoutUnitCost: number;
  costCoveragePct: number;
  trackedStock: number;
  lowStock: InventoryMenuItem[];
  missingCost: InventoryMenuItem[];
};

export function buildInventoryOverview(items: InventoryMenuItem[]): InventoryOverview {
  const totalProducts = items.length;
  const withUnitCost = items.filter((i) => i.unit_cost != null && i.unit_cost > 0).length;
  const withoutUnitCost = totalProducts - withUnitCost;
  const costCoveragePct =
    totalProducts > 0 ? Math.round((withUnitCost / totalProducts) * 100) : 0;

  const trackedStock = items.filter((i) => i.stock_quantity != null).length;

  const lowStock = items.filter((i) => {
    if (i.stock_quantity == null) return false;
    return i.stock_quantity <= (i.stock_min ?? 0);
  });

  const missingCost = items.filter((i) => i.unit_cost == null || i.unit_cost <= 0);

  return {
    totalProducts,
    withUnitCost,
    withoutUnitCost,
    costCoveragePct,
    trackedStock,
    lowStock,
    missingCost,
  };
}

export function marginPct(price: number, unitCost: number | null): number | null {
  if (unitCost == null || unitCost <= 0 || price <= 0) return null;
  return Math.round(((price - unitCost) / price) * 100);
}
