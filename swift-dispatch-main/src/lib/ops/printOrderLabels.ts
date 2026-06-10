import type { LocalOrder } from "@/lib/db/localDb";
import { STATUS_LABEL, normalizeOrderStatus } from "@/lib/ops/orderWorkflow";

export type OrderLabelLine = {
  name: string;
  quantity: number;
  notes?: string | null;
};

export type OrderLabelPayload = {
  order: LocalOrder;
  lines: OrderLabelLine[];
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

function renderLabel({ order, lines }: OrderLabelPayload, storeName: string): string {
  const status = STATUS_LABEL[normalizeOrderStatus(order.status)] ?? order.status;
  const itemsHtml =
    lines.length > 0
      ? lines
          .map(
            (l) =>
              `<li>${escapeHtml(l.name)} <strong>×${l.quantity}</strong>${l.notes ? ` <em>(${escapeHtml(l.notes)})</em>` : ""}</li>`,
          )
          .join("")
      : `<li>${order.items_count} item(ns)</li>`;

  return `
    <section class="label">
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

export function buildLabelsPrintHtml(payloads: OrderLabelPayload[], storeName: string): string {
  const body = payloads.map((p) => renderLabel(p, storeName)).join('<div class="label-cut"></div>');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Etiquetas</title>
  <style>
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
  </style>
</head>
<body>${body}</body>
</html>`;
}

export function printOrderLabels(payloads: OrderLabelPayload[], storeName: string): void {
  if (payloads.length === 0) return;

  const html = buildLabelsPrintHtml(payloads, storeName);
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

  const cleanup = () => {
    setTimeout(() => {
      if (frame.parentNode) document.body.removeChild(frame);
    }, 500);
  };

  frame.contentWindow?.focus();
  frame.contentWindow?.print();
  cleanup();
}
