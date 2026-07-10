import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import type { SystemAlert } from "@/hooks/useSystemAlerts";
import type { SistemaAba } from "@/lib/sistema/search";
import type { SistemaSection } from "@/lib/sistema/sections";
import { cn } from "@/lib/utils";

type Props = {
  alerts: SystemAlert[];
  onNavigate: (secao: SistemaSection, aba?: SistemaAba) => void;
  className?: string;
};

/** Compacto: 1 linha com contagem; lista só ao expandir. */
export function SistemaAlertsBanner({ alerts, onNavigate, className }: Props) {
  const [open, setOpen] = useState(false);

  if (!alerts.length) return null;

  const first = alerts[0];
  const extra = alerts.length - 1;

  return (
    <div
      className={cn("rounded-2xl border border-warning/25 bg-warning/5", className)}
      role="status"
      aria-label="Ajustes pendentes"
    >
      <button
        type="button"
        onClick={() => {
          if (alerts.length === 1) {
            onNavigate(first.secao, first.aba);
            return;
          }
          setOpen((v) => !v);
        }}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-warning/10"
      >
        <AlertTriangle className="size-4 shrink-0 text-warning" aria-hidden />
        <span className="flex-1 text-sm text-foreground leading-snug">
          {alerts.length === 1 ? (
            first.message
          ) : (
            <>
              <span className="font-medium">{alerts.length} ajustes pendentes</span>
              <span className="text-muted-foreground"> — {first.message}</span>
            </>
          )}
        </span>
        {alerts.length === 1 ? (
          <span className="inline-flex shrink-0 items-center gap-0.5 text-xs font-medium text-warning">
            {first.actionLabel}
            <ChevronRight className="size-3.5" aria-hidden />
          </span>
        ) : (
          <span className="inline-flex shrink-0 items-center gap-0.5 text-xs font-medium text-warning">
            {open ? "Ocultar" : extra > 0 ? `Ver todos` : "Abrir"}
            <ChevronDown
              className={cn("size-3.5 transition", open && "rotate-180")}
              aria-hidden
            />
          </span>
        )}
      </button>

      {open && alerts.length > 1 ? (
        <ul className="border-t border-warning/15 divide-y divide-warning/15">
          {alerts.map((alert) => (
            <li key={alert.id}>
              <button
                type="button"
                onClick={() => onNavigate(alert.secao, alert.aba)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-warning/10"
              >
                <span className="flex-1 text-sm text-foreground leading-snug">{alert.message}</span>
                <span className="inline-flex shrink-0 items-center gap-0.5 text-xs font-medium text-warning">
                  {alert.actionLabel}
                  <ChevronRight className="size-3.5" aria-hidden />
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
