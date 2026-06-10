import { useIncomingOrderAlerts } from "@/hooks/useIncomingOrderAlerts";

/** Monta detecção de pedidos novos em qualquer tela autenticada. */
export function IncomingOrderAlertsBridge() {
  useIncomingOrderAlerts(true);
  return null;
}
