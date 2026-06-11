import { pushServerAutomationEvent } from "./automationEventBus";

export function logAutomationNewOrder(
  tenantId: string,
  orderId: string,
  code: string,
  customerName: string,
  source?: string,
): void {
  pushServerAutomationEvent(tenantId, {
    id: `new-${orderId}`,
    ruleId: "ops-alerts",
    message: `[NOVO] Pedido ${code} recebido · ${customerName}${source ? ` (${source})` : ""}`,
    level: "info",
  });
}

export function logAutomationIfoodPoll(tenantId: string, processed: number): void {
  if (processed <= 0) return;
  pushServerAutomationEvent(tenantId, {
    id: `ifood-poll-${Math.floor(Date.now() / 30000)}`,
    ruleId: "ifood-poll",
    message: `[iFOOD] ${processed} evento(s) importado(s)`,
    level: "info",
  });
}

export function logAutomationDriverAssigned(
  tenantId: string,
  orderId: string,
  code: string,
  driverName: string,
): void {
  pushServerAutomationEvent(tenantId, {
    id: `assign-${orderId}`,
    ruleId: "driver-push",
    message: `[PUSH] ${code} → ${driverName}`,
    level: "info",
  });
}

export function logAutomationAutoDispatch(
  tenantId: string,
  orderId: string,
  code: string,
  driverName: string,
): void {
  pushServerAutomationEvent(tenantId, {
    id: `auto-dispatch-${orderId}`,
    ruleId: "auto-dispatch",
    message: `[DESPACHO] ${code} auto-atribuído → ${driverName}`,
    level: "success",
  });
}
