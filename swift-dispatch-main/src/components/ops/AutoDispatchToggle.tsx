import { Cpu } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type AutoDispatchToggleProps = {
  enabled: boolean;
  loading?: boolean;
  saving?: boolean;
  onToggle: (next: boolean) => void;
  label?: string;
};

export function AutoDispatchToggle({
  enabled,
  loading = false,
  saving = false,
  onToggle,
  label = "Despacho automático",
}: AutoDispatchToggleProps) {
  const busy = loading || saving;

  const handleToggle = () => {
    if (!busy) onToggle(!enabled);
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          role="button"
          tabIndex={busy ? -1 : 0}
          onClick={handleToggle}
          onKeyDown={(e) => {
            if (busy) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleToggle();
            }
          }}
          aria-pressed={enabled}
          aria-disabled={busy}
          aria-label={`${label}: ${enabled ? "ligado" : "desligado"}`}
          className={cn(
            "erp-btn-secondary justify-between sm:justify-start min-w-0 cursor-pointer",
            enabled &&
              "border-primary/35 bg-primary/[0.06] shadow-[inset_0_0_0_1px_oklch(0.52_0.14_265/0.12)]",
            busy && "pointer-events-none opacity-60",
          )}
        >
          <Cpu className="size-4 text-primary shrink-0" />
          <span className="text-left flex-1 min-w-0">
            <span className="block">{label}</span>
            <span className="block text-[11px] font-normal text-muted-foreground">
              {enabled ? "Atribuição automática" : "Sessão de entregadores"}
            </span>
          </span>
          <span
            aria-hidden
            className={cn(
              "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 border-transparent shadow-sm transition-colors scale-90 sm:scale-100",
              enabled ? "bg-primary" : "bg-muted-foreground/30",
            )}
          >
            <span
              className={cn(
                "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform",
                enabled ? "translate-x-4" : "translate-x-0",
              )}
            />
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        {enabled
          ? "Pedidos em aguardando entregador são atribuídos automaticamente."
          : "Use Despachar fila na aba Entregadores para atribuição manual em lote."}
      </TooltipContent>
    </Tooltip>
  );
}
