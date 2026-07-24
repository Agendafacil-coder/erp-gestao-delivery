import type { FinancialSummary } from "./types";

export type DreLine = {
  key: string;
  label: string;
  amount: number;
  /** Indentação visual (0 = receita bruta, 1 = dedução, 2 = resultado) */
  level: 0 | 1 | 2;
  /** Destaque de resultado (lucro/prejuízo) */
  emphasis?: "result" | "subtotal";
  tone?: "neutral" | "positive" | "negative";
};

export type DreGerencial = {
  lines: DreLine[];
  receitaBruta: number;
  cmv: number;
  lucroBruto: number;
  despesasOperacionais: number;
  resultadoLiquido: number;
  margemBrutaPct: number | null;
  margemLiquidaPct: number | null;
};

/**
 * DRE gerencial simplificado a partir do resumo financeiro existente.
 * Estrutura alinhada ao que donos esperam (Saipos / food service):
 * Receita → (−) CMV → Lucro bruto → (−) Despesas → Resultado.
 */
export function computeDreGerencial(summary: FinancialSummary): DreGerencial {
  const receitaBruta = summary.periodRevenue;
  const cmv = summary.cmvTotal;
  const lucroBruto = Number((receitaBruta - cmv).toFixed(2));
  const despesasOperacionais = summary.totalExpenses;
  const resultadoLiquido = Number((lucroBruto - despesasOperacionais).toFixed(2));

  const margemBrutaPct =
    receitaBruta > 0 ? Number(((lucroBruto / receitaBruta) * 100).toFixed(1)) : null;
  const margemLiquidaPct =
    receitaBruta > 0 ? Number(((resultadoLiquido / receitaBruta) * 100).toFixed(1)) : null;

  const lines: DreLine[] = [
    {
      key: "receita",
      label: "Receita bruta de vendas",
      amount: receitaBruta,
      level: 0,
      emphasis: "subtotal",
    },
    {
      key: "delivery_fees",
      label: "  · Taxas de entrega recebidas",
      amount: summary.deliveryFeesReceived,
      level: 1,
    },
    {
      key: "product_revenue",
      label: "  · Venda de produtos (líquida)",
      amount: summary.grossProductRevenue,
      level: 1,
    },
    {
      key: "cmv",
      label: "(−) CMV — custo da mercadoria vendida",
      amount: -cmv,
      level: 1,
      tone: "negative",
    },
    {
      key: "lucro_bruto",
      label: "Lucro bruto",
      amount: lucroBruto,
      level: 0,
      emphasis: "subtotal",
      tone: lucroBruto >= 0 ? "positive" : "negative",
    },
    {
      key: "despesas_manual",
      label: "(−) Despesas do período",
      amount: -summary.manualExpenses,
      level: 1,
      tone: "negative",
    },
    {
      key: "despesas_fixos",
      label: "(−) Custos fixos (pro rata)",
      amount: -summary.fixedCosts,
      level: 1,
      tone: "negative",
    },
    {
      key: "despesas_variaveis",
      label: "(−) Custos variáveis (pro rata)",
      amount: -summary.variableCosts,
      level: 1,
      tone: "negative",
    },
    {
      key: "resultado",
      label: "Resultado líquido do período",
      amount: resultadoLiquido,
      level: 0,
      emphasis: "result",
      tone: resultadoLiquido >= 0 ? "positive" : "negative",
    },
  ];

  return {
    lines,
    receitaBruta,
    cmv,
    lucroBruto,
    despesasOperacionais,
    resultadoLiquido,
    margemBrutaPct,
    margemLiquidaPct,
  };
}
