/**
 * CMV (Custo da Mercadoria Vendida) — estrutura para fase futura com estoque.
 *
 * Quando o módulo de estoque estiver ativo:
 * - Ao entregar pedido, gerar financial_cmv_entries por line item
 * - unit_cost virá do cadastro de insumos / ficha técnica do menu_item
 * - estimatedProfit subtrairá cmvTotal em vez de usar margem fixa
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

  if (withCost > 0) {
    return {
      cmvTotal: Number(cmv.toFixed(2)),
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
