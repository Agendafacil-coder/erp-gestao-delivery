import type { LocalOrder } from "@/lib/db/localDb";
import { STATUS_LABEL, normalizeOrderStatus } from "@/lib/ops/orderWorkflow";
import type { PrintFormat } from "@/lib/ops/printSettings";
import { clampCopies } from "@/lib/ops/printSettings";

export type OrderLabelLine = {
  name: string;
  quantity: number;
  notes?: string | null;
};

export type OrderLabelPayload = {
  order: LocalOrder;
  lines: OrderLabelLine[];
};

export type PrintOptions = {
  format?: PrintFormat;
  copies?: number;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatPlacedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function renderItemsList(lines: OrderLabelLine[], order: LocalOrder, kitchen: boolean): string {
  if (lines.length > 0) {
    return lines
      .map((l) => {
        const note =
          l.notes?.trim() ?
            `<div class="item-note">${escapeHtml(l.notes.trim())}</div>`
          : "";
        return `<li class="item-row">
          <span class="item-qty">×${l.quantity}</span>
          <span class="item-name">${escapeHtml(l.name)}</span>
          ${note}
        </li>`;
      })
      .join("");
  }
  return `<li class="item-row"><span class="item-name">${order.items_count} item(ns)</span></li>`;
}

function renderDeliveryLabel({ order, lines }: OrderLabelPayload, storeName: string): string {
  const status = STATUS_LABEL[normalizeOrderStatus(order.status)] ?? order.status;
  const itemsHtml = renderItemsList(lines, order, false);

  return `
    <section class="label label--delivery">
      <header class="label__head">
        <span class="label__store">${escapeHtml(storeName)}</span>
        <span class="label__time">${formatPlacedAt(order.placed_at)}</span>
      </header>
      <div class="label__code">${escapeHtml(order.code)}</div>
      <div class="label__meta">
        <div><strong>${escapeHtml(order.customer_name)}</strong></div>
        <div class="label__address">${escapeHtml(order.address)}</div>
        ${order.customer_phone ? `<div>${escapeHtml(order.customer_phone)}</div>` : ""}
      </div>
      <ul class="label__items">${itemsHtml}</ul>
      <footer class="label__foot">
        <span>${escapeHtml(order.channel)} · ${escapeHtml(status)}</span>
        <span class="label__scan">Leia: ${escapeHtml(order.code)}</span>
      </footer>
    </section>
  `;
}

function renderKitchenTicket({ order, lines }: OrderLabelPayload, storeName: string): string {
  const itemsHtml = renderItemsList(lines, order, true);
  const orderNotes = order.notes?.trim()
    ? `<div class="label__order-notes">⚠ ${escapeHtml(order.notes.trim())}</div>`
    : "";

  return `
    <section class="label label--kitchen">
      <header class="label__head label__head--kitchen">
        <span class="label__badge">COMANDA COZINHA</span>
        <span class="label__time">${formatPlacedAt(order.placed_at)}</span>
      </header>
      <div class="label__store-kitchen">${escapeHtml(storeName)}</div>
      <div class="label__code label__code--kitchen">${escapeHtml(order.code)}</div>
      <div class="label__meta-kitchen">
        <strong>${escapeHtml(order.customer_name)}</strong>
        <span>${escapeHtml(order.channel)} · ${order.items_count} itens · ${order.sla_minutes} min</span>
      </div>
      ${orderNotes}
      <ul class="label__items label__items--kitchen">${itemsHtml}</ul>
      <footer class="label__foot label__foot--kitchen">
        <span class="label__scan">Leia código: ${escapeHtml(order.code)}</span>
      </footer>
    </section>
  `;
}

function renderLabel(payload: OrderLabelPayload, storeName: string, format: PrintFormat): string {
  return format === "kitchen"
    ? renderKitchenTicket(payload, storeName)
    : renderDeliveryLabel(payload, storeName);
}

function buildStyles(format: PrintFormat): string {
  const kitchenExtras =
    format === "kitchen"
      ? `
    .label__head--kitchen { margin-bottom: 1mm; }
    .label__badge {
      font-size: 8pt;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    .label__store-kitchen {
      font-size: 9pt;
      font-weight: 700;
      margin-bottom: 1mm;
    }
    .label__code--kitchen {
      font-size: 28pt;
      margin-bottom: 2mm;
    }
    .label__meta-kitchen {
      font-size: 9pt;
      line-height: 1.35;
      margin-bottom: 2mm;
      display: flex;
      flex-direction: column;
      gap: 0.5mm;
    }
    .label__order-notes {
      font-size: 10pt;
      font-weight: 700;
      border: 2px solid #111;
      padding: 2mm;
      margin-bottom: 2mm;
      line-height: 1.3;
    }
    .label__items--kitchen {
      font-size: 11pt;
      line-height: 1.45;
      list-style: none;
      padding-left: 0;
    }
    .item-row {
      display: block;
      margin-bottom: 2mm;
      padding-bottom: 1.5mm;
      border-bottom: 1px dashed #ccc;
    }
    .item-qty {
      font-weight: 900;
      font-size: 13pt;
      margin-right: 2mm;
    }
    .item-name { font-weight: 700; }
    .item-note {
      margin-top: 1mm;
      font-size: 9pt;
      font-weight: 700;
      font-style: italic;
    }
    .label__foot--kitchen { margin-top: 2mm; }
  `
      : "";

  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    @page { size: 80mm auto; margin: 4mm; }
    body {
      font-family: "Segoe UI", system-ui, sans-serif;
      color: #111;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .label {
      width: 72mm;
      padding: 3mm 2mm;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .label-cut {
      border-top: 1px dashed #bbb;
      margin: 2mm 0;
      page-break-after: always;
    }
    .label__head {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 2mm;
      font-size: 9pt;
      color: #444;
      margin-bottom: 2mm;
    }
    .label__store { font-weight: 700; color: #111; }
    .label__code {
      font-size: 22pt;
      font-weight: 800;
      letter-spacing: 0.02em;
      line-height: 1.1;
      margin-bottom: 2mm;
      font-family: ui-monospace, monospace;
    }
    .label__meta {
      font-size: 9pt;
      line-height: 1.35;
      margin-bottom: 2mm;
    }
    .label__address { margin-top: 0.5mm; }
    .label__items {
      font-size: 8.5pt;
      line-height: 1.4;
      padding-left: 4mm;
      margin-bottom: 2mm;
    }
    .label__foot {
      display: flex;
      flex-direction: column;
      gap: 1mm;
      font-size: 8pt;
      color: #555;
      border-top: 1px solid #ddd;
      padding-top: 2mm;
    }
    .label__scan {
      font-family: ui-monospace, monospace;
      font-weight: 600;
      letter-spacing: 0.08em;
    }
    ${kitchenExtras}
  `;
}

export function buildLabelsPrintHtml(
  payloads: OrderLabelPayload[],
  storeName: string,
  options: PrintOptions = {},
): string {
  const format = options.format ?? "delivery";
  const copies = clampCopies(options.copies ?? 1);

  const sections: string[] = [];
  for (let c = 0; c < copies; c++) {
    for (const payload of payloads) {
      if (sections.length > 0) sections.push('<div class="label-cut"></div>');
      sections.push(renderLabel(payload, storeName, format));
    }
  }

  const title = format === "kitchen" ? "Comandas cozinha" : "Etiquetas entrega";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>${buildStyles(format)}</style>
</head>
<body>${sections.join("")}</body>
</html>`;
}

function runBrowserPrint(html: string): void {
  const frame = document.createElement("iframe");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  frame.setAttribute("aria-hidden", "true");
  document.body.appendChild(frame);

  const doc = frame.contentDocument ?? frame.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(frame);
    throw new Error("Não foi possível abrir a visualização de impressão.");
  }

  doc.open();
  doc.write(html);
  doc.close();

  frame.contentWindow?.focus();
  frame.contentWindow?.print();

  setTimeout(() => {
    if (frame.parentNode) document.body.removeChild(frame);
  }, 500);
}

export function printOrderLabels(
  payloads: OrderLabelPayload[],
  storeName: string,
  options: PrintOptions = {},
): void {
  if (payloads.length === 0) return;
  runBrowserPrint(buildLabelsPrintHtml(payloads, storeName, options));
}

/** Abre pré-visualização em nova aba (útil antes de imprimir). */
export function openPrintPreview(
  payloads: OrderLabelPayload[],
  storeName: string,
  options: PrintOptions = {},
): Window | null {
  if (payloads.length === 0) return null;
  const html = buildLabelsPrintHtml(payloads, storeName, options);
  const win = window.open("", "_blank", "noopener,noreferrer,width=420,height=720");
  if (!win) throw new Error("Permita pop-ups para ver a pré-visualização.");
  win.document.write(html);
  win.document.close();
  return win;
}
