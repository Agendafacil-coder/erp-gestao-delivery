import { Link } from "@tanstack/react-router";
import { ArrowRight, Bike, Star } from "lucide-react";
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
    <section className="erp-card flex flex-col">
      <header className="erp-card-header">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Bike className="size-4 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-sm">Desempenho dos entregadores</h2>
            <p className="text-xs text-muted-foreground">
              {active.length} ativo(s) na operação
            </p>
          </div>
        </div>
        <Link
          to="/entregador"
          className="text-xs text-primary font-medium flex items-center gap-1 hover:underline"
        >
          Gerenciar
          <ArrowRight className="size-3" />
        </Link>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[480px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
              <th className="text-left font-medium px-4 py-2">Entregador</th>
              <th className="text-left font-medium px-2 py-2">Status</th>
              <th className="text-right font-medium px-2 py-2">Em rota</th>
              <th className="text-right font-medium px-4 py-2">Avaliação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {drivers.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  Nenhum entregador cadastrado.
                </td>
              </tr>
            ) : (
              drivers.map((d) => (
                <tr key={d.id} className="hover:bg-muted/20">
                  <td className="px-4 py-2.5 font-medium">{d.name}</td>
                  <td className="px-2 py-2.5">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full border ${
                        d.status === "offline"
                          ? "text-muted-foreground border-border"
                          : "text-primary border-primary/30 bg-primary/10"
                      }`}
                    >
                      {STATUS_LABEL[d.status]}
                    </span>
                  </td>
                  <td className="px-2 py-2.5 text-right tabular-nums font-semibold">
                    {d.activeOrders}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className="inline-flex items-center gap-0.5 text-xs tabular-nums">
                      <Star className="size-3 text-warning fill-warning" />
                      {d.rating > 0 ? d.rating.toFixed(1) : "—"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
