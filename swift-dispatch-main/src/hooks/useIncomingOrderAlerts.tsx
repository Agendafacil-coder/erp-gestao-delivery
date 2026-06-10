import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useOps } from "@/hooks/useOps";
import { normalizeOrderStatus } from "@/lib/ops/orderWorkflow";
import { soundService } from "@/lib/services/SoundService";
import { NewOrderToast } from "@/components/ops/NewOrderToast";
import type { LocalOrder } from "@/lib/repositories";

/**
 * Detecta pedidos novos no stream e exibe toast com ação de aceitar (estilo SaaS).
 */
export function useIncomingOrderAlerts(enabled = true) {
  const { orders, applyOrderAction } = useOps();
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
      showToast(order, applyOrderAction);
    }
  }, [orders, enabled, applyOrderAction]);
}

function showToast(
  order: LocalOrder,
  applyOrderAction: (id: string, action: "enviar_cozinha") => Promise<void>,
) {
  toast.custom(
    (t) => (
      <NewOrderToast
        order={order}
        onAccept={async () => {
          try {
            await applyOrderAction(order.id, "enviar_cozinha");
            toast.success(`Pedido ${order.code} aceito!`, { icon: "✓" });
            toast.dismiss(t);
          } catch {
            /* applyOrderAction já exibe erro */
          }
        }}
        onDismiss={() => toast.dismiss(t)}
      />
    ),
    { duration: 20000, position: "top-center" },
  );
}
