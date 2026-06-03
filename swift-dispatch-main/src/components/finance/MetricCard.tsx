import type { LucideIcon } from "lucide-react";
import { formatBRL } from "@/lib/finance/calculations";
import { StatCard } from "@/components/design/StatCard";

type Props = {
  label: string;
  value: number | string;
  sub?: string;
  icon: LucideIcon;
  tone?: "default" | "success" | "warning" | "danger";
  formatMoney?: boolean;
};

const variantMap = {
  default: "default",
  success: "default",
  warning: "warning",
  danger: "danger",
} as const;

export function MetricCard({ label, value, sub, icon, tone = "default", formatMoney }: Props) {
  const display =
    typeof value === "number" && formatMoney ? formatBRL(value) : value;

  return (
    <StatCard
      label={label}
      value={display}
      hint={sub}
      icon={icon}
      variant={variantMap[tone]}
    />
  );
}
