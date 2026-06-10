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
  store_city: string | null;
  store_state: string | null;
  store_postal_code: string | null;
  /** Cidade, UF, CEP (opcional) e Brasil — para navegação e geocoding */
  store_region: string | null;
  /** Atribui entregador automaticamente ao marcar "aguardando entregador" */
  auto_dispatch_enabled: boolean;
};

export const DEFAULT_MENU_SETTINGS: TenantMenuSettingsDto = {
  min_order_amount: 0,
  pickup_enabled: true,
  delivery_enabled: true,
  default_delivery_fee: 0,
  neighborhood_fees: [],
  coupons: [],
  store_address: null,
  store_city: null,
  store_state: null,
  store_postal_code: null,
  store_region: null,
  auto_dispatch_enabled: false,
};

export function buildStoreRegion(input: {
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
}): string | null {
  const city = input.city?.trim();
  if (!city) return null;
  const parts = [city];
  const state = input.state?.trim();
  if (state) parts.push(state);
  const cep = input.postalCode?.trim().replace(/\D/g, "");
  if (cep && cep.length === 8) {
    parts.push(`${cep.slice(0, 5)}-${cep.slice(5)}`);
  }
  parts.push("Brasil");
  return parts.join(", ");
}

export function mapTenantMenuSettingsRow(row: {
  minOrderAmount: string | null;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  defaultDeliveryFee: string | null;
  neighborhoodFees: string | null;
  coupons: string | null;
  storeAddress: string | null;
  storeCity?: string | null;
  storeState?: string | null;
  storePostalCode?: string | null;
  autoDispatchEnabled?: boolean;
}): TenantMenuSettingsDto {
  const store_city = row.storeCity?.trim() || null;
  const store_state = row.storeState?.trim() || null;
  const store_postal_code = row.storePostalCode?.trim() || null;
  return {
    min_order_amount: Number(row.minOrderAmount ?? 0),
    pickup_enabled: row.pickupEnabled,
    delivery_enabled: row.deliveryEnabled,
    default_delivery_fee: Number(row.defaultDeliveryFee ?? 0),
    neighborhood_fees: parseNeighborhoodFees(row.neighborhoodFees),
    coupons: parseCoupons(row.coupons),
    store_address: row.storeAddress,
    store_city,
    store_state,
    store_postal_code,
    store_region: buildStoreRegion({
      city: store_city,
      state: store_state,
      postalCode: store_postal_code,
    }),
    auto_dispatch_enabled: row.autoDispatchEnabled ?? false,
  };
}

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
