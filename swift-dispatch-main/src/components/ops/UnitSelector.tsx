import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUnitView } from "@/hooks/useUnitView";
import { useTenant } from "@/hooks/useTenant";
import { cn } from "@/lib/utils";

type UnitSelectorProps = {
  className?: string;
  /** Estilo compacto para o rodapé da sidebar */
  compact?: boolean;
  /** Sidebar escura */
  onDark?: boolean;
};

/** Troca de unidade/região — só aparece quando há mais de uma opção. */
export function UnitSelector({ className, compact, onDark }: UnitSelectorProps) {
  const { units, unitId, setUnitId } = useUnitView();
  const { current, tenants, switchTenant } = useTenant();

  const handleUnitChange = (id: string) => {
    setUnitId(id);
    if (id !== "all" && tenants.some((t) => t.id === id) && id !== current?.id) {
      void switchTenant(id);
    }
  };

  if (units.length <= 1) {
    return (
      <div
        className={cn(
          "text-sm font-medium truncate",
          onDark ? "text-white/80" : "text-foreground",
          compact && "mt-1",
          className,
        )}
        title={current?.name ?? units[0]?.label}
      >
        {current?.name ?? units[0]?.label ?? "Sem operação"}
      </div>
    );
  }

  return (
    <Select value={unitId} onValueChange={handleUnitChange}>
      <SelectTrigger
        className={cn(
          "w-full h-9 rounded-xl text-sm font-medium shadow-none focus:ring-primary/25",
          onDark ? "border-white/10 bg-white/5 text-white/90" : "border-border/60 bg-muted/80",
          compact && "mt-1 h-8 text-xs",
          className,
        )}
        aria-label="Unidade ou região"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="start" className="rounded-xl">
        {units.map((u) => (
          <SelectItem key={u.id} value={u.id} className="rounded-lg text-sm">
            {u.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
