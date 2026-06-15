import { Activity, Bike, Clock, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

type SessionStats = {
  events: number;
  delayed: number;
  inPrep: number;
  activeDrivers: number;
};

const STATS = [
  { key: "events" as const, label: "Eventos na sessão", icon: Activity },
  { key: "delayed" as const, label: "Pedidos em atraso", icon: Clock, tone: "danger" as const },
  { key: "inPrep" as const, label: "Em preparo", icon: Flame, tone: "warning" as const },
  { key: "activeDrivers" as const, label: "Entregadores online", icon: Bike, tone: "success" as const },
];

type Props = {
  stats: SessionStats;
};

export function AutomationStatsRow({ stats }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {STATS.map((stat) => {
        const value = stats[stat.key];
        const toneClass =
          stat.tone === "danger"
            ? value > 0
              ? "text-danger"
              : "text-foreground"
            : stat.tone === "warning"
              ? value > 0
                ? "text-warning"
                : "text-foreground"
              : stat.tone === "success"
                ? "text-success"
                : "text-foreground";

        return (
          <div key={stat.key} className="erp-card p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <stat.icon className="size-3 shrink-0" />
              {stat.label}
            </p>
            <p className={cn("text-xl font-bold mt-1 tabular-nums", toneClass)}>{value}</p>
          </div>
        );
      })}
    </div>
  );
}
