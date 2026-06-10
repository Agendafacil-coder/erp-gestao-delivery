import { useTenant } from "@/hooks/useTenant";
import { formatBRL } from "@/lib/menu/format";

type Props = {
  revenueToday: number;
  ordersToday: number;
  pendingKitchen?: number;
};

function greetingForHour(h: number): string {
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export function DashboardGreeting({ revenueToday, ordersToday, pendingKitchen = 0 }: Props) {
  const { current } = useTenant();
  const now = new Date();
  const greeting = greetingForHour(now.getHours());
  const dateLabel = now.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="sm:col-span-2 lg:col-span-2 rounded-2xl border border-border/50 bg-card p-5 sm:p-6 shadow-[var(--shadow-card)]">
        <p className="text-xs font-medium text-muted-foreground capitalize">{dateLabel}</p>
        <h2 className="mt-1 font-display text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          {greeting}, {current?.name ?? "sua operação"}
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
          Visão geral da operação em tempo real.
        </p>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card p-4 sm:p-5 shadow-[var(--shadow-card)]">
        <p className="text-xs font-medium text-muted-foreground">Vendas hoje</p>
        <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
          {formatBRL(revenueToday)}
        </p>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card p-4 sm:p-5 shadow-[var(--shadow-card)]">
        <p className="text-xs font-medium text-muted-foreground">Pedidos hoje</p>
        <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
          {ordersToday}
        </p>
        {pendingKitchen > 0 ? (
          <p className="mt-2 text-xs font-medium text-primary">
            {pendingKitchen} na cozinha agora
          </p>
        ) : null}
      </div>
    </div>
  );
}
