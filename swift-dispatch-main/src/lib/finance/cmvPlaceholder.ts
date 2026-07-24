/**
 * CMV (Custo da Mercadoria Vendida).
 * Na entrega, `recordCmvOnDelivery` grava financial_cmv_entries; aqui o cálculo
 * agregado usa unit_cost do cardápio ou estimativa de 65% da receita.
 */

export type CmvLinePlaceholder = {
  order_id: string;
  menu_item_id?: string | null;
  quantity: number;
  unit_cost: number | null;
  source: "order_line" | "manual" | "inventory";
};

export function estimateCmvFromRevenue(productRevenue: number, marginRate = 0.35): number {
  if (productRevenue <= 0) return 0;
  return Number((productRevenue * (1 - marginRate)).toFixed(2));
}

export function computeCmvFromLineItems(
  lineItems: Array<{ menu_item_id: string | null; quantity: number }>,
  menuUnitCosts: Map<string, number>,
  fallbackProductRevenue: number,
): { cmvTotal: number; source: "menu" | "estimate"; itemsWithCost: number; itemsWithoutCost: number } {
  let cmv = 0;
  let withCost = 0;
  let withoutCost = 0;

  for (const line of lineItems) {
    const unitCost =
      line.menu_item_id != null ? menuUnitCosts.get(line.menu_item_id) : undefined;
    if (unitCost != null && unitCost > 0) {
      cmv += unitCost * line.quantity;
      withCost += line.quantity;
    } else {
      withoutCost += line.quantity;
    }
  }

  if (withCost > 0 && withoutCost === 0) {
    return {
      cmvTotal: Number(cmv.toFixed(2)),
      source: "menu",
      itemsWithCost: withCost,
      itemsWithoutCost: 0,
    };
  }

  if (withCost > 0 && withoutCost > 0) {
    // Itens sem custo: completa com estimativa proporcional da receita (evita subestimar CMV).
    const totalQty = withCost + withoutCost;
    const uncoveredShare = withoutCost / totalQty;
    const estimatedPart = estimateCmvFromRevenue(fallbackProductRevenue * uncoveredShare);
    return {
      cmvTotal: Number((cmv + estimatedPart).toFixed(2)),
      source: "menu",
      itemsWithCost: withCost,
      itemsWithoutCost: withoutCost,
    };
  }

  return {
    cmvTotal: estimateCmvFromRevenue(fallbackProductRevenue),
    source: "estimate",
    itemsWithCost: 0,
    itemsWithoutCost: withoutCost,
  };
}
