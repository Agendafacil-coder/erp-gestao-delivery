import type { LocalDriver, LocalOrder } from "@/lib/db/localDb";
import { isOrderDelayed } from "@/lib/ops/dashboardMetrics";
import { normalizeOrderStatus } from "@/lib/ops/orderWorkflow";
import type { SlaSettings } from "@/lib/ops/slaSettings";

export type AutomationEvent = {
  id: string;
  at: string;
  ruleId: string;
  message: string;
  level: "info" | "warning" | "success";
};

function fmtTime(d = new Date()) {
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function detectAutomationEvents(input: {
  orders: LocalOrder[];
  drivers: LocalDriver[];
  prevById: Map<string, LocalOrder>;
  slaSettings: SlaSettings;
  kitchenWasHot: boolean;
  /** Postgres: geofence/pedidos/auto-complete já logam no servidor */
  skipServerHandled?: boolean;
  isRuleEnabled?: (ruleId: string) => boolean;
  now?: number;
}): { events: AutomationEvent[]; kitchenIsHot: boolean } {
  const now = input.now ?? Date.now();
  const events: AutomationEvent[] = [];
  const on = (ruleId: string) => input.isRuleEnabled?.(ruleId) !== false;

  for (const order of input.orders) {
    const prev = input.prevById.get(order.id);
    const st = normalizeOrderStatus(order.status);

    if (on("ops-alerts") && !input.skipServerHandled && !prev && st === "novo") {
      events.push({
        id: `new-${order.id}`,
        at: fmtTime(),
        ruleId: "ops-alerts",
        message: `[NOVO] Pedido ${order.code} recebido · ${order.customer_name}`,
        level: "info",
      });
    }

    if (
      on("sla-delay") &&
      !input.skipServerHandled &&
      isOrderDelayed(order, now) &&
      prev &&
      !isOrderDelayed(prev, now)
    ) {
      events.push({
        id: `sla-${order.id}-${Math.floor(now / 60000)}`,
        at: fmtTime(),
        ruleId: "sla-delay",
        message: `[SLA] ${order.code} em atraso · ${order.customer_name}`,
        level: "warning",
      });
    }

    if (
      on("geofence-arrived") &&
      !input.skipServerHandled &&
      order.arrived_at &&
      prev &&
      !prev.arrived_at &&
      st === "em_rota_entrega"
    ) {
      events.push({
        id: `arrived-${order.id}`,
        at: fmtTime(),
        ruleId: "geofence-arrived",
        message: `[GEOFENCE] ${order.code} — entregador chegou ao destino (<100 m)`,
        level: "success",
      });
    }

    if (
      on("auto-complete") &&
      !input.skipServerHandled &&
      prev &&
      st === "entregue" &&
      normalizeOrderStatus(prev.status) === "em_rota_entrega" &&
      (prev.arrived_at || order.arrived_at)
    ) {
      events.push({
        id: `complete-${order.id}`,
        at: fmtTime(),
        ruleId: "auto-complete",
        message: `[ENTREGA] ${order.code} finalizado · ${order.customer_name}`,
        level: "success",
      });
    }
  }

  const inPrep = input.orders.filter((o) => normalizeOrderStatus(o.status) === "em_preparo").length;
  const kitchenIsHot = inPrep >= input.slaSettings.kitchenBottleneckMin;
  if (
    on("kitchen-bottleneck") &&
    !input.skipServerHandled &&
    kitchenIsHot &&
    !input.kitchenWasHot
  ) {
    events.push({
      id: `kitchen-${Math.floor(now / 60000)}`,
      at: fmtTime(),
      ruleId: "kitchen-bottleneck",
      message: `[COZINHA] Gargalo: ${inPrep} pedidos em preparo (limiar ${input.slaSettings.kitchenBottleneckMin})`,
      level: "warning",
    });
  }

  const idleDrivers = input.drivers.filter(
    (d) => d.status === "disponivel" && (d.active_orders ?? 0) === 0,
  );
  if (
    on("ops-alerts") &&
    !input.skipServerHandled &&
    idleDrivers.length >= 2 &&
    input.orders.some((o) => normalizeOrderStatus(o.status) === "aguardando_entregador")
  ) {
    const key = `idle-${Math.floor(now / 300000)}`;
    if (!events.some((e) => e.id === key)) {
      events.push({
        id: key,
        at: fmtTime(),
        ruleId: "ops-alerts",
        message: `[DESPACHO] ${idleDrivers.length} entregador(es) ocioso(s) · pedidos aguardando rota`,
        level: "info",
      });
    }
  }

  return { events, kitchenIsHot };
}
