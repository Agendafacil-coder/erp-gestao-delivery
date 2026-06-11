import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useOps } from "@/hooks/useOps";
import { normalizeOrderStatus } from "@/lib/ops/orderWorkflow";
import { soundService } from "@/lib/services/SoundService";
import { NewOrderToast } from "@/components/ops/NewOrderToast";
import type { LocalOrder } from "@/lib/repositories";

/**
 * Detecta pedidos novos no stream e exibe notificação (sem aceite manual).
 * O pedido permanece em "novo" até a cozinha iniciar o preparo no KDS.
 */
export function useIncomingOrderAlerts(enabled = true) {
  const { orders } = useOps();
  const seenRef = useRef<Set<string>>(new Set());
  const bootstrappedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    if (!bootstrappedRef.current) {
      for (const o of orders) seenRef.current.add(o.id);
      if (orders.length > 0) bootstrappedRef.current = true;
      return;
    }

    const incoming = orders.filter(
      (o) => !seenRef.current.has(o.id) && normalizeOrderStatus(o.status) === "novo",
    );

    for (const order of incoming) {
      seenRef.current.add(order.id);
      soundService.playNewOrder();
      showToast(order);
    }
  }, [orders, enabled]);
}

function showToast(order: LocalOrder) {
  toast.custom(
    (t) => <NewOrderToast order={order} onDismiss={() => toast.dismiss(t)} />,
    { duration: 20000, position: "top-center" },
  );
}
