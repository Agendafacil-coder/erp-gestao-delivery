import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getKitchenPausedIds, setKitchenPaused } from "@/lib/ops/kitchenPause";
import { OpsPage } from "@/components/ops/OpsPage";
import { EmptyState } from "@/components/ops/StateViews";
import { useTenant } from "@/hooks/useTenant";
import { useOps } from "@/hooks/useOps";
import { useOperationalAlerts } from "@/hooks/useOperationalAlerts";
import { getOrderAlerts } from "@/lib/ops/operationalAlerts";
import {
  OperationalAlertBadge,
  OperationalAlertsBanner,
} from "@/components/ops/OperationalAlertsUI";
import { alertRepository } from "@/lib/repositories";
import { useI18n } from "@/hooks/useI18n";
import { toast } from "sonner";
import {
  Clock,
  Flame,
  Check,
  Play,
  Pause,
  AlertCircle,
  Coffee,
  AlertTriangle,
} from "lucide-react";
import { soundService } from "@/lib/services/SoundService";
import { OrderLineItems } from "@/components/ops/OrderLineItems";
import { isKitchenActive, normalizeOrderStatus } from "@/lib/ops/orderWorkflow";

export const Route = createFileRoute("/_authenticated/kds")({
  component: KdsPage,
});

function KdsFilterPill({
  active,
  onClick,
  children,
  tone = "primary",
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  tone?: "primary" | "warning";
}) {
  const activeStyles =
    tone === "warning"
      ? "bg-warning/15 text-warning border-warning/30"
      : "bg-primary/10 text-primary border-primary/30";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2 min-h-[2.5rem] rounded-full border text-xs font-medium transition cursor-pointer ${
        active ? activeStyles : "bg-muted/60 border-border text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function KdsStatCard({
  icon,
  iconClass,
  label,
  value,
}: {
  icon: React.ReactNode;
  iconClass: string;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3.5 shadow-sm flex items-center gap-3">
      <div className={`size-9 rounded-xl flex items-center justify-center shrink-0 ${iconClass}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs font-medium text-muted-foreground leading-snug">{label}</div>
        <div className="text-xl font-semibold text-foreground tabular-nums tracking-tight mt-0.5">
          {value}
        </div>
      </div>
    </div>
  );
}

function KdsPage() {
  const { current } = useTenant();
  const { t } = useI18n();
  const { orders, drivers, alerts, tick, applyOrderAction, fetchData } = useOps();
  const { kitchen } = useOperationalAlerts({ orders, drivers, storedAlerts: alerts });
  const [filter, setFilter] = useState<"todos" | "preparo" | "novo">("todos");
  const [selectedIssueOrder, setSelectedIssueOrder] = useState<string | null>(null);
  const [pausedIds, setPausedIds] = useState<Set<string>>(() => new Set());

  const refreshPaused = useCallback(() => {
    if (current?.id) setPausedIds(getKitchenPausedIds(current.id));
  }, [current?.id]);

  useEffect(() => {
    refreshPaused();
  }, [refreshPaused, orders.length]);

  const togglePause = (orderId: string, code: string, paused: boolean) => {
    if (!current?.id) return;
    setKitchenPaused(current.id, orderId, paused);
    refreshPaused();
    toast.info(
      paused
        ? `Pedido ${code} pausado na cozinha.`
        : `Pedido ${code} retomado.`,
    );
  };

  const activeCount = orders.filter((o) => isKitchenActive(o.status)).length;
  const novoCount = orders.filter((o) => normalizeOrderStatus(o.status) === "novo").length;
  const prepCount = orders.filter((o) => normalizeOrderStatus(o.status) === "em_preparo").length;

  const readyTodayCount = orders.filter((o) => {
    const placed = new Date(o.placed_at);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (placed < today) return false;
    return ["aguardando_entregador", "em_rota_entrega", "entregue"].includes(
      normalizeOrderStatus(o.status),
    );
  }).length;

  const avgPrepMinutes = (() => {
    const inPrep = orders.filter((o) => normalizeOrderStatus(o.status) === "em_preparo");
    if (!inPrep.length) return null;
    const total = inPrep.reduce((sum, o) => {
      const elapsed = Math.max(
        0,
        Math.floor((Date.now() - new Date(o.placed_at).getTime()) / 60000),
      );
      return sum + elapsed;
    }, 0);
    return Math.round(total / inPrep.length);
  })();

  const kdsOrders = useMemo(() => {
    return orders
      .filter((o) => {
        if (!isKitchenActive(o.status)) return false;
        const norm = normalizeOrderStatus(o.status);
        if (filter === "preparo") return norm === "em_preparo";
        if (filter === "novo") return norm === "novo";
        return true;
      })
      .sort((a, b) => {
        const pMap: Record<string, number> = { critica: 4, alta: 3, normal: 2, baixa: 1 };
        const aVal = pMap[a.priority] || 2;
        const bVal = pMap[b.priority] || 2;
        if (bVal !== aVal) return bVal - aVal;
        return new Date(a.placed_at).getTime() - new Date(b.placed_at).getTime();
      });
  }, [orders, filter]);

  const handleStartPrep = async (orderId: string, code: string) => {
    try {
      await applyOrderAction(orderId, "enviar_cozinha");
      soundService.playNewOrder();
      toast.success(`Pedido ${code} em preparo.`, { icon: "👨‍🍳" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const handleFinishPrep = async (orderId: string, code: string) => {
    try {
      if (current?.id) setKitchenPaused(current.id, orderId, false);
      refreshPaused();
      await applyOrderAction(orderId, "finalizar_preparo");
      soundService.playAutoDispatch();
      toast.success(`Pedido ${code} finalizado — aguardando entregador.`, { icon: "🍽️" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const handleReportIssue = async (orderCode: string, issueLabel: string) => {
    setSelectedIssueOrder(null);
    if (current?.id) {
      await alertRepository.createAlert({
        tenant_id: current.id,
        level: "high",
        title: `Problema na cozinha · ${orderCode}`,
        detail: `[RECLAMAÇÃO] ${issueLabel}`,
        agoMin: 0,
      });
    }
    await fetchData();
    toast.error(`Alerta registrado: ${issueLabel}`, { icon: "🚨" });
  };

  return (
    <OpsPage>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="size-2 rounded-full bg-danger animate-pulse shrink-0" aria-hidden />
                  <span className="text-xs font-medium text-danger">{t("kds", "monitorLabel")}</span>
                </div>
                <p className="erp-page-subtitle">{t("kds", "subtitle")}</p>
                <h1 className="erp-page-title mt-1">
                  {t("kds", "title")}{" "}
                  <span className="text-gradient">{t("kds", "highlight")}</span>
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <KdsFilterPill active={filter === "todos"} onClick={() => setFilter("todos")}>
                  {t("kds", "filterAll")} ({activeCount})
                </KdsFilterPill>
                <KdsFilterPill active={filter === "novo"} onClick={() => setFilter("novo")}>
                  {t("kds", "filterToStart")} ({novoCount})
                </KdsFilterPill>
                <KdsFilterPill
                  active={filter === "preparo"}
                  onClick={() => setFilter("preparo")}
                  tone="warning"
                >
                  {t("kds", "filterInPrep")} ({prepCount})
                </KdsFilterPill>
              </div>
            </div>

            {kitchen.length > 0 ? <OperationalAlertsBanner alerts={kitchen} /> : null}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KdsStatCard
                icon={<Flame className="size-5 text-danger animate-pulse" />}
                iconClass="bg-danger/10"
                label={t("kds", "statCritical")}
                value={kdsOrders.filter((o) => o.priority === "critica").length}
              />
              <KdsStatCard
                icon={<Clock className="size-5 text-warning" />}
                iconClass="bg-warning/10"
                label={t("kds", "statAvgPrep")}
                value={avgPrepMinutes != null ? `${avgPrepMinutes}m` : "—"}
              />
              <KdsStatCard
                icon={<Check className="size-5 text-success" />}
                iconClass="bg-success/10"
                label={t("kds", "statReadyToday")}
                value={readyTodayCount}
              />
              <KdsStatCard
                icon={<Coffee className="size-5 text-primary" />}
                iconClass="bg-primary/10"
                label={t("kds", "statCapacity")}
                value={activeCount}
              />
            </div>

            {kdsOrders.length === 0 ? (
              <EmptyState
                icon={Coffee}
                title={t("kds", "emptyTitle")}
                description={t("kds", "emptyDesc")}
                size="lg"
                className="border-solid bg-card shadow-sm"
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {kdsOrders.map((order) => {
                  const cardAlerts = getOrderAlerts(orders, drivers, order.id, {
                    storedAlerts: alerts,
                  }).filter((a) =>
                    ["pedido_atrasado", "cliente_reclamou"].includes(a.type),
                  );
                  const placed = new Date(order.placed_at).getTime();
                  const elapsedSec = Math.max(0, Math.floor((Date.now() - placed) / 1000));
                  const elapsed = Math.floor(elapsedSec / 60);
                  const timerMm = String(Math.floor(elapsedSec / 60)).padStart(2, "0");
                  const timerSs = String(elapsedSec % 60).padStart(2, "0");
                  const remaining = order.sla_minutes - elapsed;
                  const isDelayed = remaining < 0;
                  const isPreparing = normalizeOrderStatus(order.status) === "em_preparo";
                  const isNew = normalizeOrderStatus(order.status) === "novo";
                  const borderAccent = isDelayed
                    ? "border-l-danger"
                    : isPreparing
                      ? "border-l-success"
                      : isNew
                        ? "border-l-primary"
                        : "border-l-border";
                  const slaPct = Math.min(100, (elapsed / order.sla_minutes) * 100);
                  const slaBar =
                    slaPct < 60 ? "bg-success" : slaPct < 90 ? "bg-warning" : "bg-danger";

                  const isPaused = pausedIds.has(order.id);
                  const prioRing = isPaused
                    ? "ring-warning/50"
                    : order.priority === "critica"
                      ? "ring-danger/30"
                      : order.priority === "alta"
                        ? "ring-warning/25"
                        : "ring-transparent";

                  const prioIcon =
                    order.priority === "critica" ? (
                      <Flame className="size-3.5 text-danger" />
                    ) : order.priority === "alta" ? (
                      <AlertTriangle className="size-3.5 text-warning" />
                    ) : null;

                  return (
                    <article
                      key={order.id}
                      className={`kds-order-card relative rounded-2xl border border-border border-l-4 ${borderAccent} bg-card p-3.5 shadow-sm space-y-2.5 transition-all hover:shadow-md hover:border-border-strong ring-1 ${prioRing} ${isPaused ? "opacity-90" : ""} ${isDelayed ? "kds-order-card--late" : ""}`}
                    >
                      {isPreparing && !isPaused ? (
                        <div className="absolute top-2 right-2 z-[5] text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-success/15 text-success border border-success/30">
                          Preparando
                        </div>
                      ) : null}
                      {isPaused && (
                        <div className="absolute top-2 right-2 z-[5] text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-warning/20 text-warning border border-warning/30">
                          Pausado
                        </div>
                      )}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-wrap">
                          <span className="text-sm font-semibold text-foreground tabular-nums tracking-tight">
                            {order.code}
                          </span>
                          {cardAlerts.map((a) => (
                            <OperationalAlertBadge key={a.id} type={a.type} level={a.level} />
                          ))}
                          {order.channel && (
                            <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0">
                              {order.channel}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span
                            className={`font-mono text-lg font-bold tabular-nums leading-none ${
                              isDelayed ? "text-danger" : isPreparing ? "text-success" : "text-foreground"
                            }`}
                          >
                            {timerMm}:{timerSs}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {prioIcon}
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-lg ${
                                isDelayed
                                  ? "text-danger bg-danger/10"
                                  : remaining < 15
                                    ? "text-warning bg-warning/10"
                                    : "text-muted-foreground bg-muted"
                              }`}
                            >
                              <Clock className="size-3 shrink-0" />
                              {isDelayed
                                ? `+${Math.abs(remaining)}m`
                                : `${remaining}m SLA`}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-foreground leading-snug truncate">
                          {order.customer_name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                          {t("kds", "entryAt")}:{" "}
                          {new Date(order.placed_at).toLocaleTimeString(undefined, {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          ({elapsed}m {t("kds", "elapsedMin")})
                        </p>
                      </div>

                      <div className="rounded-xl bg-muted/50 p-2.5 space-y-2">
                        <div className="text-xs font-medium text-muted-foreground">
                          {t("kds", "productsLabel")}
                        </div>
                        {current && (
                          <OrderLineItems
                            orderId={order.id}
                            tenantId={current.id}
                            itemsCount={order.items_count}
                          />
                        )}
                        {order.notes?.trim() ? (
                          <div className="rounded-lg bg-muted/80 border border-border/60 p-2 text-xs text-warning leading-relaxed">
                            ⚠️ {t("kds", "obsPrefix")} {order.notes.trim()}
                          </div>
                        ) : null}
                        <div className="h-1.5 rounded-full bg-border/80 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${slaBar} transition-all duration-500`}
                            style={{ width: `${slaPct}%` }}
                          />
                        </div>
                      </div>

                      <div className="space-y-2 pt-0.5">
                        {normalizeOrderStatus(order.status) === "novo" && !isPaused ? (
                          <button
                            type="button"
                            onClick={() => handleStartPrep(order.id, order.code)}
                            className="w-full min-h-[2.75rem] py-2.5 rounded-xl bg-warning hover:bg-warning/90 text-warning-foreground font-semibold text-sm transition flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <Play className="size-3.5 fill-current" />
                            {t("kds", "startPrep")}
                          </button>
                        ) : normalizeOrderStatus(order.status) === "em_preparo" && !isPaused ? (
                          <button
                            type="button"
                            onClick={() => handleFinishPrep(order.id, order.code)}
                            className="w-full min-h-[2.75rem] py-2.5 rounded-xl bg-success hover:bg-success/90 text-success-foreground font-semibold text-sm transition flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <Check className="size-4" strokeWidth={2.5} />
                            {t("kds", "markReady")}
                          </button>
                        ) : !isPaused ? (
                          <p className="text-center text-xs text-muted-foreground py-2">
                            Pedido fora da fila da cozinha.
                          </p>
                        ) : (
                          <p className="text-center text-xs text-warning py-2">
                            Pedido pausado — retome para continuar o preparo.
                          </p>
                        )}

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedIssueOrder(order.id)}
                            className="flex-1 py-2 rounded-xl border border-danger/30 bg-danger/10 hover:bg-danger/15 text-danger text-xs font-medium transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <AlertCircle className="size-3.5" />
                            {t("kds", "reportIssue")}
                          </button>
                          <button
                            type="button"
                            onClick={() => togglePause(order.id, order.code, !isPaused)}
                            className={`py-2 px-3 rounded-xl border transition flex items-center justify-center cursor-pointer ${
                              isPaused
                                ? "border-warning/40 bg-warning/15 text-warning"
                                : "border-border hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                            }`}
                            title={isPaused ? "Retomar pedido" : t("kds", "pauseOrder")}
                          >
                            <Pause className="size-3.5" />
                          </button>
                        </div>
                      </div>

                      {selectedIssueOrder === order.id && (
                        <div className="absolute inset-0 bg-card/95 backdrop-blur-sm rounded-2xl p-4 flex flex-col justify-between z-10 animate-in fade-in duration-200">
                          <div className="space-y-3 text-center pt-2">
                            <AlertTriangle className="size-8 text-danger mx-auto" />
                            <h4 className="font-medium text-foreground text-sm">{t("kds", "issueTitle")}</h4>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <button
                                type="button"
                                onClick={() =>
                                  void handleReportIssue(order.code, t("kds", "issueMissing"))
                                }
                                className="p-2.5 border border-border rounded-xl text-left text-foreground hover:bg-muted/60 transition font-medium"
                              >
                                {t("kds", "issueMissing")}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  void handleReportIssue(order.code, t("kds", "issueBurned"))
                                }
                                className="p-2.5 border border-border rounded-xl text-left text-foreground hover:bg-muted/60 transition font-medium"
                              >
                                {t("kds", "issueBurned")}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  void handleReportIssue(order.code, t("kds", "issueWrong"))
                                }
                                className="p-2.5 border border-border rounded-xl text-left text-foreground hover:bg-muted/60 transition font-medium"
                              >
                                {t("kds", "issueWrong")}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  void handleReportIssue(order.code, t("kds", "issueOverload"))
                                }
                                className="p-2.5 border border-border rounded-xl text-left text-foreground hover:bg-muted/60 transition font-medium"
                              >
                                {t("kds", "issueOverload")}
                              </button>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedIssueOrder(null)}
                            className="w-full py-2 border border-border rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground"
                          >
                            {t("kds", "cancel")}
                          </button>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
    </OpsPage>
  );
}
