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
