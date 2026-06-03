import { useEffect, useState } from "react";
import { Clock, MapPin, Phone, User, X, History } from "lucide-react";
import type { LocalDriver, LocalOrder } from "@/lib/db/localDb";
import { fmtBRL } from "@/lib/ops/mock";
import { StatusBadge } from "@/components/ops/StatusBadge";
import { OrderActions } from "@/components/ops/OrderActions";
import { OrderLineItems } from "@/components/ops/OrderLineItems";
import {
  getElapsedMinutes,
  getEstimatedDeadline,
  isOrderDelayed,
  normalizeOrderStatus,
  STATUS_LABEL,
  type OrderStatus,
} from "@/lib/ops/orderWorkflow";
import { listOrderEventsFn, type OrderAuditEvent } from "@/functions/orders";
import { USE_POSTGRES } from "@/lib/repositories";
import { localDb, type LocalOrderEvent } from "@/lib/db/localDb";
import { useOps } from "@/hooks/useOps";
import { useOrderOperationalAlerts } from "@/hooks/useOperationalAlerts";
import { OperationalAlertsStrip } from "@/components/ops/OperationalAlertsUI";

const PAYMENT_LABEL: Record<string, string> = {
  pix: "PIX",
  card: "Cartão",
  on_delivery: "Na entrega",
  dinheiro: "Dinheiro",
};

type Props = {
  order: LocalOrder;
  drivers: LocalDriver[];
  driverName?: string | null;
  tenantId: string;
  onClose: () => void;
};

export function OrderDetailPanel({ order, drivers, driverName, tenantId, onClose }: Props) {
  const { orders, alerts: storedAlerts } = useOps();
  const orderAlerts = useOrderOperationalAlerts(order.id, {
    orders,
    drivers,
    storedAlerts,
  });
  const elapsed = getElapsedMinutes(order.placed_at);
  const deadline = getEstimatedDeadline(order.placed_at, order.sla_minutes);
  const delayed = isOrderDelayed(order.placed_at, order.sla_minutes);
  const subtotal = order.subtotal_amount ?? order.total_amount;
  const deliveryFee = order.delivery_fee ?? 0;
  const discount = order.discount_amount ?? 0;

  const [history, setHistory] = useState<OrderAuditEvent[]>([]);

  useEffect(() => {
    void (async () => {
      if (USE_POSTGRES) {
        const events = await listOrderEventsFn({
          data: { tenantId, orderId: order.id, limit: 20 },
        });
        setHistory(events);
        return;
      }
      const local = localDb.get<LocalOrderEvent>("order_events");
      setHistory(
        local
          .filter((e) => e.order_id === order.id)
          .map((e) => ({
            id: e.id,
            orderId: e.order_id,
            orderCode: e.order_code,
            fromStatus: e.from_status,
            toStatus: e.to_status,
            note: e.note,
            createdAt: e.created_at,
          }))
          .slice(0, 20),
      );
    })();
  }, [order.id, tenantId]);

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div>
          <div className="font-mono text-sm font-semibold">{order.code}</div>
          <StatusBadge
            status={order.status as OrderStatus}
            elapsedMin={elapsed}
            slaMin={order.sla_minutes}
          />
        </div>
        <button type="button" onClick={onClose} className="ops-icon-btn size-9" aria-label="Fechar">
          <X className="size-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {orderAlerts.length > 0 ? (
          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Alertas
            </h3>
            <OperationalAlertsStrip alerts={orderAlerts} />
          </section>
        ) : delayed ? (
          <div className="rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger font-medium flex items-center gap-2">
            <Clock className="size-4 shrink-0" />
            Pedido atrasado — {elapsed} min (SLA {order.sla_minutes} min)
          </div>
        ) : null}

        <section className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cliente</h3>
          <div className="flex items-center gap-2 text-sm">
            <User className="size-4 text-muted-foreground" />
            {order.customer_name}
          </div>
          {order.customer_phone && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="size-4" />
              {order.customer_phone}
            </div>
          )}
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="size-4 shrink-0 mt-0.5" />
            {order.address}
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Valores</h3>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
            <dt className="text-muted-foreground">Produtos</dt>
            <dd className="text-right font-mono tabular-nums">{fmtBRL(subtotal)}</dd>
            <dt className="text-muted-foreground">Taxa entrega</dt>
            <dd className="text-right font-mono tabular-nums">{fmtBRL(deliveryFee)}</dd>
            <dt className="text-muted-foreground">Desconto</dt>
            <dd className="text-right font-mono tabular-nums text-success">-{fmtBRL(discount)}</dd>
            <dt className="font-medium">Total</dt>
            <dd className="text-right font-mono font-semibold tabular-nums">{fmtBRL(order.total_amount)}</dd>
          </dl>
          <p className="text-xs text-muted-foreground">
            Pagamento: {PAYMENT_LABEL[order.payment_method ?? ""] ?? order.payment_method ?? "—"}
            {order.payment_status ? (
              <span
                className={
                  order.payment_status === "pendente"
                    ? " text-warning font-medium"
                    : order.payment_status === "pago"
                      ? " text-success"
                      : ""
                }
              >
                {" "}
                · {order.payment_status === "pendente" ? "Pendente" : order.payment_status === "pago" ? "Pago" : order.payment_status}
              </span>
            ) : null}
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Itens</h3>
          <OrderLineItems orderId={order.id} tenantId={tenantId} itemsCount={order.items_count} />
          {order.notes?.trim() && (
            <p className="text-xs rounded-lg bg-warning/10 border border-warning/20 p-2 text-warning">
              Obs: {order.notes.trim()}
            </p>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Operação</h3>
          <dl className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Entrada</span>
              <span className="tabular-nums">
                {new Date(order.placed_at).toLocaleString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Prazo estimado</span>
              <span className="tabular-nums">
                {deadline.toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tempo decorrido</span>
              <span className={`tabular-nums ${delayed ? "text-danger font-medium" : ""}`}>
                {elapsed} min
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Entregador</span>
              <span>{driverName ?? (order.driver_id ? "Atribuído" : "—")}</span>
            </div>
          </dl>
        </section>

        <section className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ações</h3>
          <OrderActions order={order} drivers={drivers} onDone={onClose} />
        </section>

        <section className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <History className="size-3.5" />
            Histórico
          </h3>
          {history.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sem movimentações registradas.</p>
          ) : (
            <ul className="space-y-2">
              {history.map((ev) => (
                <li key={ev.id} className="text-xs border-l-2 border-primary/30 pl-2.5 py-0.5">
                  <span className="text-muted-foreground tabular-nums">
                    {new Date(ev.createdAt).toLocaleString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                      day: "2-digit",
                      month: "2-digit",
                    })}
                  </span>
                  <div className="mt-0.5">
                    {ev.fromStatus ? (
                      <>
                        {STATUS_LABEL[normalizeOrderStatus(ev.fromStatus)]} →{" "}
                        <strong>{STATUS_LABEL[normalizeOrderStatus(ev.toStatus)]}</strong>
                      </>
                    ) : (
                      <strong>{STATUS_LABEL[normalizeOrderStatus(ev.toStatus)]}</strong>
                    )}
                    {ev.note && <span className="text-muted-foreground"> · {ev.note}</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
