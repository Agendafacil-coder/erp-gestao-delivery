import type { LocalAlert, LocalDriver, LocalOrder } from "@/lib/db/localDb";
import type { AutomationEvent } from "@/lib/ops/detectAutomationEvents";

export type OpsSnapshot = {
  orders: LocalOrder[];
  drivers: LocalDriver[];
  alerts: LocalAlert[];
  automationEvents: AutomationEvent[];
  ts: number;
};
