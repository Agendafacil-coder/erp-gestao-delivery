import { useState } from "react";
import { Eye, RotateCcw, Settings2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  ALL_DASHBOARD_KPI_IDS,
  ALL_DASHBOARD_SECTION_IDS,
  widgetLabel,
  type DashboardWidgetId,
} from "@/lib/ops/dashboardVisibilityConfig";

type Props = {
  isVisible: (id: DashboardWidgetId) => boolean;
  toggle: (id: DashboardWidgetId) => void;
  showAll: () => void;
  resetToDefault: () => void;
  hiddenCount: number;
};

function WidgetCheckbox({
  id,
  checked,
  onToggle,
}: {
  id: DashboardWidgetId;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm cursor-pointer rounded-md px-2 py-1.5 hover:bg-muted/50">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="rounded border-border"
      />
      <span className="leading-snug">{widgetLabel(id)}</span>
    </label>
  );
}

export function DashboardVisibilityPicker({
  isVisible,
  toggle,
  showAll,
  resetToDefault,
  hiddenCount,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {hiddenCount > 0 ? (
        <span className="text-[11px] text-muted-foreground">
          {hiddenCount} {hiddenCount === 1 ? "item oculto" : "itens ocultos"}
        </span>
      ) : null}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border/80 hover:bg-surface/60 transition-colors"
          >
            <Settings2 className="size-3.5" />
            Personalizar painel
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 sm:w-80 p-0 max-h-[min(70vh,520px)] flex flex-col">
          <div className="p-3 border-b border-border shrink-0">
            <p className="text-sm font-semibold">O que exibir no painel</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Desmarque para ocultar indicadores ou seções. A preferência fica salva neste navegador.
            </p>
          </div>
          <div className="overflow-y-auto flex-1 p-3 space-y-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
                Indicadores
              </p>
              <div className="space-y-0.5">
                {ALL_DASHBOARD_KPI_IDS.map((id) => (
                  <WidgetCheckbox
                    key={id}
                    id={id}
                    checked={isVisible(id)}
                    onToggle={() => toggle(id)}
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
                Seções
              </p>
              <div className="space-y-0.5">
                {ALL_DASHBOARD_SECTION_IDS.map((id) => (
                  <WidgetCheckbox
                    key={id}
                    id={id}
                    checked={isVisible(id)}
                    onToggle={() => toggle(id)}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="p-3 border-t border-border flex flex-wrap gap-2 shrink-0">
            <button
              type="button"
              onClick={showAll}
              className="text-xs flex items-center gap-1 px-2 py-1 rounded-md border border-border hover:bg-muted/50"
            >
              <Eye className="size-3" />
              Mostrar todos
            </button>
            <button
              type="button"
              onClick={resetToDefault}
              className="text-xs flex items-center gap-1 px-2 py-1 rounded-md border border-border hover:bg-muted/50 text-muted-foreground"
            >
              <RotateCcw className="size-3" />
              Restaurar padrão
            </button>
          </div>
          <p className="px-3 pb-3 text-[10px] text-muted-foreground shrink-0">
            Pelo menos um item deve permanecer visível.
          </p>
        </PopoverContent>
      </Popover>
    </div>
  );
}
