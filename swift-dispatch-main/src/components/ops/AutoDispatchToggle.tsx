import { Cpu } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={() => !busy && onToggle(!enabled)}
          disabled={busy}
          aria-pressed={enabled}
          aria-label={`${label}: ${enabled ? "ligado" : "desligado"}`}
          className={cn(
            "erp-btn-secondary justify-between sm:justify-start min-w-0",
            enabled && "border-primary/35 bg-primary/[0.06] shadow-[inset_0_0_0_1px_oklch(0.52_0.14_265/0.12)]",
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
          <Switch
            checked={enabled}
            onCheckedChange={onToggle}
            disabled={busy}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "shrink-0 scale-90 sm:scale-100",
              "data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted-foreground/30",
            )}
            aria-hidden
            tabIndex={-1}
          />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        {enabled
          ? "Pedidos em aguardando entregador são atribuídos automaticamente."
          : "Use Despachar fila na aba Entregadores para atribuição manual em lote."}
      </TooltipContent>
    </Tooltip>
  );
}
