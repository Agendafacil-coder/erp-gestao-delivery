import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { ReportDatePreset } from "@/lib/ops/operationalReports";

const PRESETS: Array<{ id: ReportDatePreset; label: string }> = [
  { id: "today", label: "Hoje" },
  { id: "yesterday", label: "Ontem" },
  { id: "last7", label: "Últimos 7 dias" },
  { id: "month", label: "Mês atual" },
  { id: "custom", label: "Personalizado" },
];

type Props = {
  preset: ReportDatePreset;
  from: string;
  to: string;
  onPresetChange: (preset: ReportDatePreset) => void;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
};

export function OperationalDateFilter({
  preset,
  from,
  to,
  onPresetChange,
  onFromChange,
  onToChange,
}: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onPresetChange(p.id)}
            className={cn(
              "px-3 py-2 min-h-[2.5rem] rounded-lg text-xs font-medium border transition",
              preset === p.id
                ? "border-primary/50 bg-primary/10 text-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      {preset === "custom" && (
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-end gap-3 w-full sm:w-auto">
          <div className="space-y-1 flex-1 min-w-[10rem]">
            <Label className="text-[10px] uppercase text-muted-foreground">De</Label>
            <Input
              type="date"
              value={from}
              onChange={(e) => onFromChange(e.target.value)}
              className="w-full text-xs font-mono"
            />
          </div>
          <div className="space-y-1 flex-1 min-w-[10rem]">
            <Label className="text-[10px] uppercase text-muted-foreground">Até</Label>
            <Input
              type="date"
              value={to}
              onChange={(e) => onToChange(e.target.value)}
              className="w-full text-xs font-mono"
            />
          </div>
        </div>
      )}
    </div>
  );
}
