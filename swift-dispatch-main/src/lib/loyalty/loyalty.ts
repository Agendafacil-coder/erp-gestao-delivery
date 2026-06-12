export type LoyaltySettings = {
  enabled: boolean;
  /** Pontos ganhos por R$ 1 pago */
  points_per_real: number;
  /** Pontos necessários para um bloco de resgate */
  redeem_points: number;
  /** Valor em R$ de cada bloco de resgate */
  redeem_value: number;
  /** Máximo do pedido que pode ser pago com pontos (0–1) */
  max_redeem_percent: number;
};

export const DEFAULT_LOYALTY_SETTINGS: LoyaltySettings = {
  enabled: true,
  points_per_real: 1,
  redeem_points: 50,
  redeem_value: 5,
  max_redeem_percent: 0.2,
};

/** Normaliza telefone para chave de carteira (somente dígitos, sem 55). */
export function normalizeLoyaltyPhone(phone: string): string | null {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length > 11) {
    digits = digits.slice(2);
  }
  if (digits.length < 10 || digits.length > 11) return null;
  return digits;
}

export function calculatePointsEarned(
  totalPaid: number,
  settings: LoyaltySettings = DEFAULT_LOYALTY_SETTINGS,
): number {
  if (!settings.enabled || totalPaid <= 0) return 0;
  return Math.floor(totalPaid * settings.points_per_real);
}

export function calculateRedeemDiscount(
  balance: number,
  orderTotalBeforeLoyalty: number,
  useLoyalty: boolean,
  settings: LoyaltySettings = DEFAULT_LOYALTY_SETTINGS,
): { pointsToRedeem: number; discount: number } {
  if (
    !settings.enabled ||
    !useLoyalty ||
    balance < settings.redeem_points ||
    orderTotalBeforeLoyalty <= 0
  ) {
    return { pointsToRedeem: 0, discount: 0 };
  }

  const maxDiscount = orderTotalBeforeLoyalty * settings.max_redeem_percent;
  const maxBlocksByBalance = Math.floor(balance / settings.redeem_points);
  const maxBlocksByCap = Math.floor(maxDiscount / settings.redeem_value);
  const maxBlocksByTotal = Math.floor(orderTotalBeforeLoyalty / settings.redeem_value);
  const blocks = Math.min(maxBlocksByBalance, maxBlocksByCap, maxBlocksByTotal);

  if (blocks <= 0) return { pointsToRedeem: 0, discount: 0 };

  return {
    pointsToRedeem: blocks * settings.redeem_points,
    discount: Math.round(blocks * settings.redeem_value * 100) / 100,
  };
}

export function formatLoyaltyRedeemLabel(
  pointsToRedeem: number,
  discount: number,
  settings: LoyaltySettings = DEFAULT_LOYALTY_SETTINGS,
): string {
  if (pointsToRedeem <= 0) return "";
  const blocks = pointsToRedeem / settings.redeem_points;
  if (blocks === 1) {
    return `Usar ${pointsToRedeem} coins (-R$ ${discount.toFixed(2).replace(".", ",")})`;
  }
  return `Usar ${pointsToRedeem} coins (${blocks}x resgate · -R$ ${discount.toFixed(2).replace(".", ",")})`;
}
