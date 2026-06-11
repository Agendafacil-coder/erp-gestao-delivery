import { parsePriceInput } from "@/lib/menu/admin-state";

export type VariationFormRow = {
  name: string;
  price: string;
};

export type AddonFormRow = {
  name: string;
  price: string;
  groupName: string;
  required: boolean;
  maxQuantity: string;
  isSuggested: boolean;
};

export function parseVariationForms(rows: VariationFormRow[]) {
  const parsed: { name: string; price: number }[] = [];
  for (const row of rows) {
    const name = row.name.trim();
    if (!name) continue;
    const price = parsePriceInput(row.price);
    if (price === null) return { error: `Preço inválido na variação "${name}"` as const };
    parsed.push({ name, price });
  }
  return { variations: parsed };
}

export function parseAddonForms(rows: AddonFormRow[]) {
  const parsed: {
    name: string;
    price: number;
    groupName: string;
    required: boolean;
    maxQuantity: number;
    isSuggested: boolean;
  }[] = [];
  for (const row of rows) {
    const name = row.name.trim();
    if (!name) continue;
    const price = parsePriceInput(row.price);
    if (price === null) return { error: `Preço inválido no adicional "${name}"` as const };
    const maxRaw = row.maxQuantity.trim();
    const maxQuantity = maxRaw ? parseInt(maxRaw.replace(/\D/g, ""), 10) : 1;
    if (Number.isNaN(maxQuantity) || maxQuantity < 1) {
      return { error: `Quantidade máxima inválida em "${name}"` as const };
    }
    parsed.push({
      name,
      price,
      groupName: row.groupName.trim() || "Adicionais",
      required: row.required,
      maxQuantity,
      isSuggested: row.isSuggested,
    });
  }
  return { addons: parsed };
}
