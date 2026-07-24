import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toLocalDateKey } from "@/lib/finance/calculations";

type Props = {
  from: string;
  to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
};

export function FinancialDateFilter({ from, to, onFromChange, onToChange }: Props) {
  return (
    <div className="flex flex-wrap items-end gap-3 erp-card p-4">
      <div className="space-y-1.5">
        <Label className="erp-section-label">De</Label>
        <Input
          type="date"
          value={from}
          onChange={(e) => onFromChange(e.target.value)}
          className="h-9 w-[150px] text-sm tabular-nums"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="erp-section-label">Até</Label>
        <Input
          type="date"
          value={to}
          onChange={(e) => onToChange(e.target.value)}
          className="h-9 w-[150px] text-sm tabular-nums"
        />
      </div>
    </div>
  );
}

/**
 * Dia civil local (não UTC). Em BRT, `toISOString().slice(0,10)` muda de dia às 21h —
 * fechamento e filtros financeiros devem seguir o calendário da loja.
 */
export function todayIsoDate(): string {
  return toLocalDateKey(new Date());
}

export function monthStartIsoDate(): string {
  const d = new Date();
  return toLocalDateKey(new Date(d.getFullYear(), d.getMonth(), 1));
}
