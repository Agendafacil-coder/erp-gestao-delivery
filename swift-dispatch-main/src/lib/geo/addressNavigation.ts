/** Região padrão quando o endereço não traz cidade/UF (operações em SP). */
export const DEFAULT_NAV_REGION = "São Paulo, SP, Brasil";

export type NavigationAddressInput = {
  address: string;
  neighborhood?: string | null;
  cityRegion?: string | null;
};

/** Endereço completo para busca em Google Maps / Waze / geocoding. */
export function buildNavigationAddress(input: NavigationAddressInput): string {
  const raw = input.address.trim();
  if (!raw) return input.cityRegion?.trim() || DEFAULT_NAV_REGION;

  const nb = input.neighborhood?.trim();
  const region = input.cityRegion?.trim() || DEFAULT_NAV_REGION;
  const rawLower = raw.toLowerCase();
  const parts: string[] = [];

  if (nb && !rawLower.includes(nb.toLowerCase())) {
    parts.push(raw, nb);
  } else {
    parts.push(raw);
  }

  const joined = parts.join(", ");
  const joinedLower = joined.toLowerCase();
  const hasRegionHint =
    joinedLower.includes("são paulo") ||
    joinedLower.includes("sao paulo") ||
    joinedLower.includes("brasil") ||
    joinedLower.includes("brazil") ||
    /\b[a-z]{2}\b/.test(joinedLower.split(",").pop()?.trim() ?? "");

  if (!hasRegionHint) {
    parts.push(region);
  }

  return parts.join(", ");
}

export function hasUsableNavigationAddress(address?: string | null): boolean {
  return Boolean(address?.trim() && address.trim().length >= 5);
}
