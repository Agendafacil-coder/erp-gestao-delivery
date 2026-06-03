import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  from: string;
  to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
};

export function FinancialDateFilter({ from, to, onFromChange, onToChange }: Props) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label className="text-[10px] uppercase text-muted-foreground">De</Label>
        <Input
          type="date"
          value={from}
          onChange={(e) => onFromChange(e.target.value)}
          className="h-8 w-[140px] text-xs font-mono"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-[10px] uppercase text-muted-foreground">Até</Label>
        <Input
          type="date"
          value={to}
          onChange={(e) => onToChange(e.target.value)}
          className="h-8 w-[140px] text-xs font-mono"
        />
      </div>
    </div>
  );
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function monthStartIsoDate(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
