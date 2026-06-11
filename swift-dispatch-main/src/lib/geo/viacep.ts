import { formatBrazilPostalCode } from "@/lib/geo/addressNavigation";

export type BrazilCepLookup = {
  postalCode: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  complement: string;
};

/** Consulta CEP na API pública ViaCEP (Brasil). */
export async function lookupBrazilCep(raw: string): Promise<BrazilCepLookup | null> {
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 8) return null;

  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    if (!res.ok) return null;

    const data = (await res.json()) as {
      erro?: boolean;
      cep?: string;
      logradouro?: string;
      bairro?: string;
      localidade?: string;
      uf?: string;
      complemento?: string;
    };

    if (data.erro) return null;

    return {
      postalCode: formatBrazilPostalCode(digits),
      street: data.logradouro?.trim() ?? "",
      neighborhood: data.bairro?.trim() ?? "",
      city: data.localidade?.trim() ?? "",
      state: data.uf?.trim() ?? "",
      complement: data.complemento?.trim() ?? "",
    };
  } catch {
    return null;
  }
}

/** Tenta casar o bairro retornado pelo CEP com a lista configurada na loja. */
export function matchConfiguredNeighborhood(
  bairro: string,
  configured: { name: string }[],
): string | null {
  const key = bairro.trim().toLowerCase();
  if (!key) return null;

  const exact = configured.find((n) => n.name.trim().toLowerCase() === key);
  if (exact) return exact.name;

  const partial = configured.find((n) => {
    const name = n.name.trim().toLowerCase();
    return key.includes(name) || name.includes(key);
  });
  return partial?.name ?? null;
}
