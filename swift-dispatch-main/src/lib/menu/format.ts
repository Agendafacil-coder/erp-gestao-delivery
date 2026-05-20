export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function categoryEmoji(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("bebida") || n.includes("drink")) return "🥤";
  if (n.includes("sobremesa") || n.includes("doce")) return "🍰";
  if (n.includes("pizza")) return "🍕";
  if (n.includes("salada")) return "🥗";
  if (n.includes("combo")) return "🍱";
  return "🍔";
}
