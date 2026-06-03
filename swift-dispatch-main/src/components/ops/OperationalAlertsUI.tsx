import {
  AlertOctagon,
  AlertTriangle,
  Ban,
  Bike,
  Clock,
  CreditCard,
  Flame,
  Info,
  MessageCircle,
  Package,
  Receipt,
} from "lucide-react";
import type { OperationalAlert, OperationalAlertType, AlertLevel } from "@/lib/ops/operationalAlerts";
import { ALERT_TYPE_META, alertShortLabel } from "@/lib/ops/operationalAlerts";
import { ALERT_COLOR } from "@/lib/ops/mock";

const TYPE_ICON: Record<OperationalAlertType, typeof AlertTriangle> = {
  pedido_atrasado: Clock,
  cozinha_sobrecarregada: Flame,
  entregador_demorando: Bike,
  pedido_sem_entregador: Package,
  produto_sem_custo: Receipt,
  pedido_cancelado: Ban,
  cliente_reclamou: MessageCircle,
  pagamento_pendente: CreditCard,
};

const LEVEL_ICON = {
  crit: AlertOctagon,
  high: AlertTriangle,
  med: AlertTriangle,
  low: Info,
} as const;

type AlertRowProps = {
  alert: OperationalAlert;
  compact?: boolean;
  showType?: boolean;
};

export function OperationalAlertRow({ alert, compact, showType = true }: AlertRowProps) {
  const TypeIcon = TYPE_ICON[alert.type] ?? AlertTriangle;
  const LevelIcon = LEVEL_ICON[alert.level] ?? Info;

  return (
    <div
      className={`rounded-lg border border-border border-l-[3px] pl-3 pr-3 py-2 ${ALERT_COLOR[alert.level]} ${
        compact ? "py-1.5" : "py-2.5"
      }`}
    >
      <div className="flex items-start gap-2">
        <TypeIcon className={`shrink-0 mt-0.5 ${compact ? "size-3.5" : "size-4"}`} />
        <div className="min-w-0 flex-1">
          <div className={`font-semibold leading-tight ${compact ? "text-xs" : "text-sm"}`}>
            {alert.title}
          </div>
          {!compact && (
            <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{alert.detail}</div>
          )}
          {showType && compact && (
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {ALERT_TYPE_META[alert.type].label}
            </div>
          )}
        </div>
        <LevelIcon className="size-3.5 shrink-0 opacity-50" aria-hidden />
        {alert.agoMin > 0 && !compact ? (
          <span className="text-[10px] text-muted-foreground shrink-0">{alert.agoMin} min</span>
        ) : null}
      </div>
    </div>
  );
}

type BadgeProps = {
  type: OperationalAlertType;
  level?: AlertLevel;
};

export function OperationalAlertBadge({ type, level = "high" }: BadgeProps) {
  const Icon = TYPE_ICON[type] ?? AlertTriangle;
  const tone =
    level === "crit" || level === "high"
      ? "bg-danger/12 text-danger border-danger/25"
      : level === "med"
        ? "bg-warning/12 text-warning border-warning/25"
        : "bg-muted/80 text-muted-foreground border-border";

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-semibold uppercase tracking-wide ${tone}`}
    >
      <Icon className="size-3 shrink-0" />
      {alertShortLabel(type)}
    </span>
  );
}

type StripProps = {
  alerts: OperationalAlert[];
  compact?: boolean;
  empty?: React.ReactNode;
};

export function OperationalAlertsStrip({ alerts, compact, empty }: StripProps) {
  if (alerts.length === 0) {
    return empty ?? null;
  }
  return (
    <div className={compact ? "space-y-1" : "space-y-2"}>
      {alerts.map((a) => (
        <OperationalAlertRow key={a.id} alert={a} compact={compact} showType={!compact} />
      ))}
    </div>
  );
}

type BannerProps = {
  alerts: OperationalAlert[];
};

/** Faixa resumida para KDS / topo de seção */
export function OperationalAlertsBanner({ alerts }: BannerProps) {
  if (alerts.length === 0) return null;

  const crit = alerts.filter((a) => a.level === "crit" || a.level === "high").length;

  return (
    <div
      className={`rounded-xl border px-3 py-2.5 flex flex-wrap items-center gap-2 ${
        crit > 0
          ? "border-danger/35 bg-danger/8"
          : "border-warning/35 bg-warning/8"
      }`}
    >
      <AlertTriangle
        className={`size-4 shrink-0 ${crit > 0 ? "text-danger" : "text-warning"}`}
      />
      <span className="text-xs font-semibold text-foreground">
        {alerts.length} alerta{alerts.length !== 1 ? "s" : ""} operacional
        {alerts.length !== 1 ? "is" : ""}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {alerts.slice(0, 4).map((a) => (
          <OperationalAlertBadge key={a.id} type={a.type} level={a.level} />
        ))}
        {alerts.length > 4 ? (
          <span className="text-[10px] text-muted-foreground self-center">
            +{alerts.length - 4}
          </span>
        ) : null}
      </div>
    </div>
  );
}
