import type { LucideIcon } from "lucide-react";
import { formatBRL } from "@/lib/finance/calculations";

type Props = {
  label: string;
  value: number | string;
  sub?: string;
  icon: LucideIcon;
  tone?: "default" | "success" | "warning" | "danger";
  formatMoney?: boolean;
};

const toneClass = {
  default: "text-foreground",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
};

export function MetricCard({ label, value, sub, icon: Icon, tone = "default", formatMoney }: Props) {
  const display =
    typeof value === "number" && formatMoney ? formatBRL(value) : value;

  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
      <div className="flex justify-between items-center text-muted-foreground">
        <span className="text-[10px] uppercase font-mono tracking-wider">{label}</span>
        <Icon className={`size-4 ${toneClass[tone]}`} />
      </div>
      <div className="text-xl font-black text-foreground font-mono tabular-nums">{display}</div>
      {sub && <div className="text-[10px] text-muted-foreground font-mono">{sub}</div>}
    </div>
  );
}
