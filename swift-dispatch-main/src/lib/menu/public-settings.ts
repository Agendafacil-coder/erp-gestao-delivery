export type NeighborhoodFee = {
  name: string;
  fee: number;
};

export type MenuCoupon = {
  code: string;
  label: string;
  type: "percent" | "fixed";
  value: number;
  min_subtotal?: number;
};

export type TenantMenuSettingsDto = {
  min_order_amount: number;
  pickup_enabled: boolean;
  delivery_enabled: boolean;
  default_delivery_fee: number;
  neighborhood_fees: NeighborhoodFee[];
  coupons: MenuCoupon[];
  store_address: string | null;
};

export const DEFAULT_MENU_SETTINGS: TenantMenuSettingsDto = {
  min_order_amount: 0,
  pickup_enabled: true,
  delivery_enabled: true,
  default_delivery_fee: 0,
  neighborhood_fees: [],
  coupons: [],
  store_address: null,
};

export function parseNeighborhoodFees(raw: string | null): NeighborhoodFee[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as NeighborhoodFee[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function parseCoupons(raw: string | null): MenuCoupon[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as MenuCoupon[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function resolveDeliveryFee(
  settings: TenantMenuSettingsDto,
  neighborhood: string | undefined,
): number {
  if (!neighborhood?.trim()) return settings.default_delivery_fee;
  const key = neighborhood.trim().toLowerCase();
  const match = settings.neighborhood_fees.find((n) => n.name.toLowerCase() === key);
  return match?.fee ?? settings.default_delivery_fee;
}

export function applyCoupon(
  subtotal: number,
  coupon: MenuCoupon | undefined,
): { discount: number; label: string | null } {
  if (!coupon) return { discount: 0, label: null };
  if (coupon.min_subtotal != null && subtotal < coupon.min_subtotal) {
    return { discount: 0, label: null };
  }
  const discount =
    coupon.type === "percent"
      ? Math.round(subtotal * (coupon.value / 100) * 100) / 100
      : Math.min(coupon.value, subtotal);
  return { discount, label: coupon.label };
}

export function findCoupon(
  settings: TenantMenuSettingsDto,
  code: string | undefined,
): MenuCoupon | undefined {
  if (!code?.trim()) return undefined;
  const key = code.trim().toUpperCase();
  return settings.coupons.find((c) => c.code.toUpperCase() === key);
}
