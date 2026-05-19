import type { LocalDriver, LocalOrder } from "@/lib/db/localDb";

export type HealthStatus = "saudavel" | "atencao" | "critico";

export type OperationalStats = {
  activeCount: number;
  onlineCount: number;
  totalDrivers: number;
  criticalCount: number;
  delayedCount: number;
  avgEta: number;
  systemStatus: HealthStatus;
  statusLabel: string;
  statusTone: string;
  healthSummary: string;
  healthReasons: string[];
};

export function computeOperationalStats(
  orders: LocalOrder[],
  drivers: LocalDriver[],
): OperationalStats {
  const active = orders.filter((o) => o.status !== "entregue" && o.status !== "cancelado");
  const online = drivers.filter(
    (d) => d.status === "disponivel" || d.status === "em_rota" || d.status === "ocioso",
  );
  const critical = active.filter((o) => o.priority === "critica" || o.priority === "alta");

  let delayedCount = 0;
  orders.forEach((o) => {
    if (o.status === "entregue" || o.status === "cancelado") return;
    const elapsed = Math.max(0, Math.floor((Date.now() - new Date(o.placed_at).getTime()) / 60000));
    if (elapsed > (o.sla_minutes ?? 40)) delayedCount++;
  });

  let systemStatus: HealthStatus = "saudavel";
  let statusLabel = "Operação saudável";
  let statusTone = "text-success border-success/30 bg-success/10";
  const healthReasons: string[] = [];

  if (delayedCount > 3 || critical.length > 2) {
    systemStatus = "critico";
    statusLabel = "Gargalo operacional";
    statusTone = "text-danger border-danger/40 bg-danger/15";
    if (delayedCount > 3) {
      healthReasons.push(`${delayedCount} pedidos passaram do tempo de SLA.`);
    }
    if (critical.length > 2) {
      healthReasons.push(`${critical.length} pedidos com prioridade alta ou crítica.`);
    }
  } else if (delayedCount > 0 || critical.length > 0) {
    systemStatus = "atencao";
    statusLabel = "Atenção na operação";
    statusTone = "text-warning border-warning/35 bg-warning/10";
    if (delayedCount > 0) {
      healthReasons.push(`${delayedCount} pedido(s) atrasado(s) em relação ao SLA.`);
    }
    if (critical.length > 0) {
      healthReasons.push(`${critical.length} pedido(s) prioritário(s) exigem acompanhamento.`);
    }
  } else {
    healthReasons.push("Nenhum pedido ativo está fora do SLA.");
    healthReasons.push(`${online.length} de ${drivers.length} entregadores disponíveis ou em rota.`);
    if (active.length > 0) {
      healthReasons.push(`${active.length} pedido(s) em andamento dentro do esperado.`);
    } else {
      healthReasons.push("Sem pedidos em aberto no momento.");
    }
  }

  const avgEta =
    active.length > 0 ? Math.round(24 + delayedCount * 2.5 - online.length * 0.4) : 0;

  const healthSummary =
    systemStatus === "saudavel"
      ? "A operação está dentro dos parâmetros normais."
      : systemStatus === "atencao"
        ? "Há sinais de pressão na operação — revise os pedidos em risco."
        : "A operação precisa de intervenção imediata no despacho e na cozinha.";

  return {
    activeCount: active.length,
    onlineCount: online.length,
    totalDrivers: drivers.length,
    criticalCount: critical.length,
    delayedCount,
    avgEta,
    systemStatus,
    statusLabel,
    statusTone,
    healthSummary,
    healthReasons,
  };
}
