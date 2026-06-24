/**
 * Impressão térmica ESC/POS via Web Serial API (Chrome/Edge).
 * Fallback: retorna false e o caller usa window.print().
 */

export type EscPosPrintMode = "browser" | "thermal";

export function isThermalPrintSupported(): boolean {
  return typeof navigator !== "undefined" && "serial" in navigator;
}

/** Converte texto para bytes ESC/POS básicos (UTF-8) */
function encodeEscPos(lines: string[]): Uint8Array {
  const chunks: number[] = [];
  // Init
  chunks.push(0x1b, 0x40);
  for (const line of lines) {
    const encoded = new TextEncoder().encode(line + "\n");
    chunks.push(...encoded);
  }
  // Feed + partial cut (if supported)
  chunks.push(0x1b, 0x64, 0x03);
  return new Uint8Array(chunks);
}

export async function printEscPos(lines: string[]): Promise<boolean> {
  if (!isThermalPrintSupported()) return false;

  try {
    const port = await (
      navigator as Navigator & {
        serial: {
          requestPort: () => Promise<SerialPort>;
        };
      }
    ).serial.requestPort();

    await port.open({ baudRate: 9600 });
    const writer = port.writable?.getWriter();
    if (!writer) {
      await port.close();
      return false;
    }

    const data = encodeEscPos(lines);
    await writer.write(data);
    writer.releaseLock();
    await port.close();
    return true;
  } catch {
    return false;
  }
}

/** Gera linhas de comanda cozinha para ESC/POS */
export function buildKitchenEscPosLines(input: {
  code: string;
  customerName: string;
  channel: string;
  items: Array<{ name: string; quantity: number; notes?: string | null }>;
  notes?: string | null;
}): string[] {
  const lines = [
    "=== COZINHA ===",
    `#${input.code}`,
    input.customerName,
    input.channel ? `Canal: ${input.channel}` : "",
    "---",
  ];
  for (const item of input.items) {
    lines.push(`${item.quantity}x ${item.name}`);
    if (item.notes?.trim()) lines.push(`  ${item.notes.trim()}`);
  }
  if (input.notes?.trim()) {
    lines.push("---");
    lines.push(`Obs: ${input.notes.trim()}`);
  }
  lines.push("");
  return lines.filter(Boolean);
}
