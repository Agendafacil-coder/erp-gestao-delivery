/**
 * Fila leve de impressão térmica (cliente).
 * Serializa jobs ESC/POS para não abrir várias portas ao mesmo tempo.
 */

type ThermalJob = {
  id: string;
  lines: string[];
  resolve: (ok: boolean) => void;
};

const queue: ThermalJob[] = [];
let draining = false;

async function drainQueue(
  printFn: (lines: string[]) => Promise<boolean>,
): Promise<void> {
  if (draining) return;
  draining = true;
  try {
    while (queue.length > 0) {
      const job = queue.shift()!;
      try {
        const ok = await printFn(job.lines);
        job.resolve(ok);
      } catch {
        job.resolve(false);
      }
    }
  } finally {
    draining = false;
  }
}

export function enqueueThermalPrint(
  lines: string[],
  printFn: (lines: string[]) => Promise<boolean>,
): Promise<boolean> {
  return new Promise((resolve) => {
    queue.push({
      id: `tp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      lines,
      resolve,
    });
    void drainQueue(printFn);
  });
}

export function thermalQueueLength(): number {
  return queue.length + (draining ? 1 : 0);
}
