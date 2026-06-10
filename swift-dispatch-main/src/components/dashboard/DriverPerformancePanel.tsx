import { Link } from "@tanstack/react-router";
import { ArrowRight, Bike } from "lucide-react";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import type { DriverPerformanceRow } from "@/lib/ops/dashboardMetrics";

const STATUS_LABEL: Record<DriverPerformanceRow["status"], string> = {
  disponivel: "Disponível",
  em_rota: "Em rota",
  pausado: "Pausado",
  offline: "Offline",
};

type Props = {
  drivers: DriverPerformanceRow[];
};

export function DriverPerformancePanel({ drivers }: Props) {
  const active = drivers.filter((d) => d.status !== "offline");

  return (
    <section className="rounded-2xl border border-border/50 bg-card shadow-[var(--shadow-card)] flex flex-col min-w-0">
      <header className="flex flex-wrap items-center gap-3 px-5 py-4 sm:px-6 border-b border-border/40">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="size-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <Bike className="size-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold text-sm">Desempenho dos entregadores</h2>
            <p className="text-xs text-muted-foreground">
              {active.length} ativo(s) na operação
            </p>
          </div>
        </div>
        <Link
          to="/entregador"
          className="text-xs text-primary font-medium inline-flex items-center gap-1 hover:underline shrink-0 min-h-[2.75rem] sm:min-h-0"
        >
          Gerenciar
          <ArrowRight className="size-3" />
        </Link>
      </header>
      <div className="p-3 sm:p-4">
        <ResponsiveTable
          rows={drivers}
          rowKey={(d) => d.id}
          emptyMessage="Nenhum entregador cadastrado."
          columns={[
            {
              key: "rank",
              header: "#",
              hideOnMobile: true,
              headerClassName: "pl-4 w-10",
              cellClassName: "pl-4 text-muted-foreground font-mono",
              render: (_, i) => i + 1,
            },
            {
              key: "name",
              header: "Entregador",
              mobilePrimary: true,
              cellClassName: "font-medium",
              render: (d) => d.name,
            },
            {
              key: "status",
              header: "Status",
              render: (d) => (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full border inline-flex ${
                    d.status === "offline"
                      ? "text-muted-foreground border-border"
                      : "text-primary border-primary/30 bg-primary/10"
                  }`}
                >
                  {STATUS_LABEL[d.status]}
                </span>
              ),
            },
            {
              key: "active",
              header: "Em rota",
              headerClassName: "text-right pr-4",
              cellClassName: "text-right pr-4 tabular-nums font-semibold",
              render: (d) => d.activeOrders,
            },
          ]}
        />
      </div>
    </section>
  );
}
