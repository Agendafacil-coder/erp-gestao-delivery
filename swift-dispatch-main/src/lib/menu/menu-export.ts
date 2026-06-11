import type { PublicMenuPayload } from "@/functions/menu";

function escapeCsvCell(value: string, delimiter: string): string {
  if (value.includes(delimiter) || value.includes('"') || value.includes("\n") || value.includes("\r")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatPriceBRL(price: number): string {
  return price.toFixed(2).replace(".", ",");
}

function formatBool(value: boolean): string {
  return value ? "sim" : "nao";
}

/** Gera CSV compatível com `parseMenuImportCsv` (delimitador `;`). */
export function buildMenuExportCsv(menu: PublicMenuPayload, delimiter: ";" | "," = ";"): string {
  const headers = [
    "categoria",
    "nome",
    "preco",
    "descricao",
    "estoque",
    "estoque_minimo",
    "destaque",
    "combo",
    "bebida",
    "disponivel",
  ];

  const lines = [headers.join(delimiter)];

  for (const cat of [...menu.categories].sort((a, b) => a.sort_order - b.sort_order)) {
    for (const item of [...cat.items].sort((a, b) => a.sort_order - b.sort_order)) {
      const row = [
        cat.name,
        item.name,
        formatPriceBRL(item.price),
        item.description ?? "",
        item.stock_quantity != null ? String(item.stock_quantity) : "",
        String(item.stock_min ?? 0),
        formatBool(item.is_featured),
        formatBool(item.is_combo),
        formatBool(item.is_drink),
        formatBool(item.available),
      ].map((cell) => escapeCsvCell(cell, delimiter));

      lines.push(row.join(delimiter));
    }
  }

  return lines.join("\n");
}

export function downloadMenuCsv(menu: PublicMenuPayload, filename?: string): void {
  const csv = buildMenuExportCsv(menu);
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download =
    filename ?? `cardapio-${menu.tenant.slug}-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}
