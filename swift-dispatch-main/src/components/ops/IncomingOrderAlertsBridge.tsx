import { useIncomingOrderAlerts } from "@/hooks/useIncomingOrderAlerts";
import { useOperationalArrivalAlerts } from "@/hooks/useOperationalArrivalAlerts";
import { useAutomationSettings } from "@/hooks/useAutomationSettings";
import { useTenant } from "@/hooks/useTenant";

/** Monta alertas operacionais em qualquer tela autenticada. */
export function IncomingOrderAlertsBridge() {
  const { current } = useTenant();
  const { isEnabled } = useAutomationSettings(current?.id);
  const alertsOn = isEnabled("ops-alerts");

  useIncomingOrderAlerts(alertsOn);
  useOperationalArrivalAlerts(alertsOn);
  return null;
}
