import { describe, expect, it } from "vitest";
import { computeDreGerencial } from "./dre";
import type { FinancialSummary } from "./types";
import { emptyPaymentBreakdown } from "./paymentMethods";

function baseSummary(overrides: Partial<FinancialSummary> = {}): FinancialSummary {
  return {
    dailyRevenue: 1000,
    periodRevenue: 10000,
    monthlyRevenue: 10000,
    paidOrdersCount: 40,
    paidOrdersTotal: 9000,
    pendingOrdersCount: 2,
    pendingOrdersTotal: 1000,
    deliveryFeesReceived: 800,
    paymentBreakdown: emptyPaymentBreakdown(),
    channelBreakdown: [],
    salonRevenue: 2000,
    deliveryRevenue: 8000,
    cancelledOrdersCount: 1,
    cancelledRevenue: 50,
    manualExpenses: 500,
    fixedCosts: 1200,
    variableCosts: 300,
    totalExpenses: 2000,
    estimatedProfit: 4500,
    deliveredOrdersCount: 42,
    cmvTotal: 3500,
    cmvSource: "menu",
    grossProductRevenue: 9200,
    ...overrides,
  };
}

describe("computeDreGerencial", () => {
  it("monta DRE com lucro bruto e resultado líquido", () => {
    const dre = computeDreGerencial(baseSummary());
    expect(dre.receitaBruta).toBe(10000);
    expect(dre.cmv).toBe(3500);
    expect(dre.lucroBruto).toBe(6500);
    expect(dre.despesasOperacionais).toBe(2000);
    expect(dre.resultadoLiquido).toBe(4500);
    expect(dre.margemBrutaPct).toBe(65);
    expect(dre.margemLiquidaPct).toBe(45);
    expect(dre.lines.some((l) => l.key === "resultado")).toBe(true);
  });

  it("trata prejuízo", () => {
    const dre = computeDreGerencial(
      baseSummary({ periodRevenue: 1000, cmvTotal: 800, totalExpenses: 500 }),
    );
    expect(dre.lucroBruto).toBe(200);
    expect(dre.resultadoLiquido).toBe(-300);
    expect(dre.lines.find((l) => l.key === "resultado")?.tone).toBe("negative");
  });
});
