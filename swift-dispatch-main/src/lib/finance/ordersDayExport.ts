import type { LocalOrder } from "@/lib/db/localDb";
import { channelLabel, normalizeOrderChannel } from "@/lib/orders/channels";
import { isInDateRange } from "@/lib/finance/calculations";

function escapeCsvCell(value: string, delimiter: string): string {
  if (value.includes(delimiter) || value.includes('"') || value.includes("\n") || value.includes("\r")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function money(n: number): string {
  return n.toFixed(2).replace(".", ",");
}

function dayPart(iso: string): { data: string; hora: string } {
  try {
    const d = new Date(iso);
    return {
      data: d.toLocaleDateString("pt-BR"),
      hora: d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    };
  } catch {
    return { data: iso.slice(0, 10), hora: "" };
  }
}

/** Pedidos do dia para o contador (inclui cancelados, marcados na coluna status). */
export function filterOrdersForAccountingDay(orders: LocalOrder[], dayIso: string): LocalOrder[] {
  return orders.filter((o) => isInDateRange(o.placed_at, { from: dayIso, to: dayIso }));
}

export function buildAccountingDayCsv(
  orders: LocalOrder[],
  dayIso: string,
  delimiter: ";" | "," = ";",
): string {
  const rows = filterOrdersForAccountingDay(orders, dayIso);
  const headers = [
    "data",
    "hora",
    "codigo",
    "status",
    "canal",
    "cliente",
    "telefone",
    "pagamento",
    "status_pagamento",
    "subtotal",
    "taxa_entrega",
    "desconto",
    "total",
    "itens_qtd",
    "endereco",
  ];

  const lines = [headers.join(delimiter)];
  for (const o of rows.sort((a, b) => a.placed_at.localeCompare(b.placed_at))) {
    const { data, hora } = dayPart(o.placed_at);
    const channel = channelLabel(normalizeOrderChannel(o.channel));
    const cells = [
      data,
      hora,
      o.code,
      o.status,
      channel,
      o.customer_name,
      o.customer_phone ?? "",
      o.payment_method ?? "",
      o.payment_status ?? "",
      money(o.subtotal_amount ?? Math.max(0, o.total_amount - (o.delivery_fee ?? 0))),
      money(o.delivery_fee ?? 0),
      money(o.discount_amount ?? 0),
      money(o.total_amount ?? 0),
      String(o.items_count ?? 0),
      o.address ?? "",
    ].map((c) => escapeCsvCell(String(c), delimiter));
    lines.push(cells.join(delimiter));
  }

  return lines.join("\n");
}

export function downloadAccountingDayCsv(
  orders: LocalOrder[],
  dayIso: string,
  storeSlug = "loja",
): void {
  const csv = buildAccountingDayCsv(orders, dayIso);
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `export-contabil-${storeSlug}-${dayIso}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}
