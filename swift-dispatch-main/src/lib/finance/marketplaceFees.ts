/** Taxa média do marketplace a partir do extrato mensal importado. */
export function computeMarketplaceFeeRate(
  grossAmount: number | null | undefined,
  feesAmount: number | null | undefined,
): number | null {
  if (grossAmount == null || feesAmount == null) return null;
  if (!(grossAmount > 0) || !(feesAmount >= 0)) return null;
  return Number((feesAmount / grossAmount).toFixed(4));
}

export function estimateDayMarketplaceFees(
  dayGross: number,
  feeRate: number | null,
): { feesEstimated: number; netEstimated: number } | null {
  if (feeRate == null || !(dayGross > 0)) return null;
  const feesEstimated = Number((dayGross * feeRate).toFixed(2));
  const netEstimated = Number((dayGross - feesEstimated).toFixed(2));
  return { feesEstimated, netEstimated };
}
