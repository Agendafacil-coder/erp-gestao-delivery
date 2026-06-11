import { eq } from "drizzle-orm";
import { getDb } from "@/db/connection.server";
import { schema } from "@/db";
import type { LocalDriver, LocalOrder } from "@/lib/db/localDb";
import { isOrderDelayed } from "@/lib/ops/dashboardMetrics";
import { pushServerAutomationEvent } from "@/lib/ops/automationEventBus";
import { normalizeOrderStatus } from "@/lib/ops/orderWorkflow";
import { DEFAULT_SLA_SETTINGS, type SlaSettings } from "@/lib/ops/slaSettings";
import { isAutomationEnabled } from "@/lib/ops/automationSettings";
import type { AutomationSettings } from "@/lib/ops/automationSettings";
import { loadTenantAutomationSettings } from "@/lib/ops/loadAutomationSettings";
import { parseSlaSettingsJson } from "@/lib/ops/slaSettingsDb";

const MIN_INTERVAL_MS = 30_000;
const lastRunByTenant = new Map<string, number>();
const kitchenHotByTenant = new Map<string, boolean>();
const delayedByOrderKey = new Map<string, boolean>();

export async function loadTenantSlaSettings(tenantId: string): Promise<SlaSettings> {
  try {
    const db = getDb();
    const [row] = await db
      .select({ slaSettings: schema.tenantMenuSettings.slaSettings })
      .from(schema.tenantMenuSettings)
      .where(eq(schema.tenantMenuSettings.tenantId, tenantId))
      .limit(1);

    return row?.slaSettings ? parseSlaSettingsJson(row.slaSettings) : DEFAULT_SLA_SETTINGS;
  } catch {
    return DEFAULT_SLA_SETTINGS;
  }
}

export function runServerAutomationDetection(input: {
  tenantId: string;
  orders: LocalOrder[];
  drivers: LocalDriver[];
  slaSettings: SlaSettings;
  automationSettings?: AutomationSettings;
  now?: number;
}): void {
  const now = input.now ?? Date.now();
  const { tenantId, orders, drivers, slaSettings } = input;
  const toggles = input.automationSettings;
  const on = (ruleId: string) => !toggles || isAutomationEnabled(toggles, ruleId);

  for (const order of orders) {
    const key = `${tenantId}:${order.id}`;
    const st = normalizeOrderStatus(order.status);
    const delayed = st !== "entregue" && st !== "cancelado" && isOrderDelayed(order, now);
    const wasDelayed = delayedByOrderKey.get(key) ?? false;

    if (on("sla-delay") && delayed && !wasDelayed) {
      pushServerAutomationEvent(tenantId, {
        id: `sla-${order.id}-${Math.floor(now / 60000)}`,
        ruleId: "sla-delay",
        message: `[ATRASO] ${order.code} fora do prazo · ${order.customer_name}`,
        level: "warning",
      });
    }

    if (!delayed || st === "entregue" || st === "cancelado") {
      delayedByOrderKey.delete(key);
    } else {
      delayedByOrderKey.set(key, true);
    }
  }

  const inPrep = orders.filter((o) => normalizeOrderStatus(o.status) === "em_preparo").length;
  const kitchenIsHot = inPrep >= slaSettings.kitchenBottleneckMin;
  const wasHot = kitchenHotByTenant.get(tenantId) ?? false;

  if (on("kitchen-bottleneck") && kitchenIsHot && !wasHot) {
    pushServerAutomationEvent(tenantId, {
      id: `kitchen-${Math.floor(now / 60000)}`,
      ruleId: "kitchen-bottleneck",
      message: `[COZINHA] Gargalo: ${inPrep} pedidos em preparo (limiar ${slaSettings.kitchenBottleneckMin})`,
      level: "warning",
    });
  }

  kitchenHotByTenant.set(tenantId, kitchenIsHot);

  const idleDrivers = drivers.filter(
    (d) => d.status === "disponivel" && (d.active_orders ?? 0) === 0,
  );
  const waitingDispatch = orders.some(
    (o) => normalizeOrderStatus(o.status) === "aguardando_entregador",
  );
  if (on("ops-alerts") && idleDrivers.length >= 2 && waitingDispatch) {
    pushServerAutomationEvent(tenantId, {
      id: `idle-${Math.floor(now / 300000)}`,
      ruleId: "ops-alerts",
      message: `[DESPACHO] ${idleDrivers.length} entregador(es) ocioso(s) · pedidos aguardando rota`,
      level: "info",
    });
  }
}

/** Detecta SLA/cozinha no servidor e persiste no event bus (throttle 30s/tenant). */
export async function detectServerAutomationMetrics(
  tenantId: string,
  orders: LocalOrder[],
  drivers: LocalDriver[],
): Promise<void> {
  const now = Date.now();
  if (now - (lastRunByTenant.get(tenantId) ?? 0) < MIN_INTERVAL_MS) return;
  lastRunByTenant.set(tenantId, now);

  const [slaSettings, automationSettings] = await Promise.all([
    loadTenantSlaSettings(tenantId),
    loadTenantAutomationSettings(tenantId),
  ]);
  runServerAutomationDetection({ tenantId, orders, drivers, slaSettings, automationSettings, now });
}

/** Apenas para testes */
export function resetServerAutomationDetectorState(tenantId?: string): void {
  if (tenantId) {
    lastRunByTenant.delete(tenantId);
    kitchenHotByTenant.delete(tenantId);
    for (const key of [...delayedByOrderKey.keys()]) {
      if (key.startsWith(`${tenantId}:`)) delayedByOrderKey.delete(key);
    }
    return;
  }
  lastRunByTenant.clear();
  kitchenHotByTenant.clear();
  delayedByOrderKey.clear();
}
