import type { OrderStatus } from "@/lib/ops/mock";
import {
  DELAYED_BADGE_CLASS,
  STATUS_BADGE_CLASS,
  STATUS_LABEL,
  isOrderDelayed,
} from "@/lib/ops/statusTheme";
import { cn } from "@/lib/utils";

type StatusBadgeProps = {
  status: OrderStatus;
  /** Se informado, exibe badge "Atrasado" quando SLA estourado */
  elapsedMin?: number;
  slaMin?: number;
  showDot?: boolean;
  className?: string;
  label?: string;
};

export function StatusBadge({
  status,
  elapsedMin,
  slaMin,
  showDot = true,
  className,
  label,
}: StatusBadgeProps) {
  const delayed =
    elapsedMin !== undefined && slaMin !== undefined && isOrderDelayed(elapsedMin, slaMin);

  if (delayed) {
    return (
      <span className={cn(DELAYED_BADGE_CLASS, className)}>
        {showDot && <span className="status-badge-dot" aria-hidden />}
        Atrasado
      </span>
    );
  }

  return (
    <span className={cn(STATUS_BADGE_CLASS[status], className)}>
      {showDot && <span className="status-badge-dot" aria-hidden />}
      {label ?? STATUS_LABEL[status]}
    </span>
  );
}
