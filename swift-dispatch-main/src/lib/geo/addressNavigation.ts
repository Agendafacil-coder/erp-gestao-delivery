export type NavigationAddressInput = {
  address: string;
  neighborhood?: string | null;
  postalCode?: string | null;
  /** Ex.: "Aguaí, SP, 13860-000, Brasil" — vindo das configurações da loja */
  cityRegion?: string | null;
  city?: string | null;
  state?: string | null;
};

/** Formata CEP brasileiro para exibição (#####-###). */
export function formatBrazilPostalCode(value?: string | null): string {
  const digits = (value ?? "").replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

/** Normaliza CEP para armazenamento (8 dígitos) ou null se vazio. */
export function parseOptionalPostalCode(raw?: string | null): string | null {
  const digits = raw?.replace(/\D/g, "") ?? "";
  if (!digits) return null;
  if (digits.length !== 8) {
    throw new Error("CEP inválido — use 8 dígitos ou deixe em branco");
  }
  return digits;
}

function addressIncludesRegion(
  address: string,
  city?: string | null,
  state?: string | null,
): boolean {
  const lower = address.toLowerCase();
  if (city?.trim() && lower.includes(city.trim().toLowerCase())) return true;
  if (state?.trim()) {
    const uf = state.trim().toLowerCase();
    if (new RegExp(`\\b${uf}\\b`).test(lower)) return true;
  }
  return lower.includes("brasil") || lower.includes("brazil");
}

function addressIncludesPostalCode(address: string, postalCode?: string | null): boolean {
  const digits = postalCode?.replace(/\D/g, "");
  if (!digits || digits.length !== 8) return false;
  return address.replace(/\D/g, "").includes(digits);
}

/** Endereço completo para busca em Google Maps / Waze / geocoding. */
export function buildNavigationAddress(input: NavigationAddressInput): string {
  const raw = input.address.trim();
  const cityRegion = input.cityRegion?.trim() || null;
  const city = input.city?.trim() || null;
  const state = input.state?.trim() || null;

  if (!raw) return cityRegion ?? "";

  const nb = input.neighborhood?.trim();
  const rawLower = raw.toLowerCase();
  const parts: string[] = [];

  if (nb && !rawLower.includes(nb.toLowerCase())) {
    parts.push(raw, nb);
  } else {
    parts.push(raw);
  }

  const cep = formatBrazilPostalCode(input.postalCode);
  const joinedBeforeCep = parts.join(", ");
  if (cep.length === 9 && !addressIncludesPostalCode(joinedBeforeCep, input.postalCode)) {
    parts.push(cep);
  }

  const joined = parts.join(", ");
  const joinedLower = joined.toLowerCase();
  const hasConfiguredCity = Boolean(city && joinedLower.includes(city.toLowerCase()));

  if (cityRegion && !hasConfiguredCity) {
    parts.push(cityRegion);
  } else if (!cityRegion && !addressIncludesRegion(joined, city, state)) {
    if (!joinedLower.includes("brasil") && !joinedLower.includes("brazil")) {
      parts.push("Brasil");
    }
  }

  return parts.join(", ");
}

export function hasUsableNavigationAddress(address?: string | null): boolean {
  return Boolean(address?.trim() && address.trim().length >= 5);
}
