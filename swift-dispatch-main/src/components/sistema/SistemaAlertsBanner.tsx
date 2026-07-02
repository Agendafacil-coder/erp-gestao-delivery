import { AlertTriangle, ChevronRight } from "lucide-react";
import type { SystemAlert } from "@/hooks/useSystemAlerts";
import type { SistemaAba } from "@/lib/sistema/search";
import type { SistemaSection } from "@/lib/sistema/sections";
import { cn } from "@/lib/utils";

type Props = {
  alerts: SystemAlert[];
  onNavigate: (secao: SistemaSection, aba?: SistemaAba) => void;
  className?: string;
};

/** Só aparece quando há algo que o operador precisa resolver. */
export function SistemaAlertsBanner({ alerts, onNavigate, className }: Props) {
  if (!alerts.length) return null;

  return (
    <div
      className={cn("rounded-2xl border border-warning/25 bg-warning/5 divide-y divide-warning/15", className)}
      role="alert"
      aria-label="Ações pendentes"
    >
      {alerts.map((alert) => (
        <button
          key={alert.id}
          type="button"
          onClick={() => onNavigate(alert.secao, alert.aba)}
          className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-warning/10"
        >
          <AlertTriangle className="size-4 shrink-0 text-warning" aria-hidden />
          <span className="flex-1 text-sm text-foreground leading-snug">{alert.message}</span>
          <span className="inline-flex shrink-0 items-center gap-0.5 text-xs font-medium text-warning">
            {alert.actionLabel}
            <ChevronRight className="size-3.5" aria-hidden />
          </span>
        </button>
      ))}
    </div>
  );
}
