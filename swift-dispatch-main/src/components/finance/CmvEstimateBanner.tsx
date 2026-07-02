import { AlertTriangle } from "lucide-react";
import { Link } from "@tanstack/react-router";

type Props = {
  source: "menu" | "estimate";
  itemsWithoutCost?: number;
  /** Avoid flashing the estimate warning before CMV data has loaded. */
  ready?: boolean;
};

export function CmvEstimateBanner({ source, itemsWithoutCost, ready = true }: Props) {
  if (!ready || source !== "estimate") return null;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
      <AlertTriangle className="size-4 shrink-0 text-warning mt-0.5" />
      <div className="min-w-0 space-y-1">
        <p className="font-medium text-foreground">Custo estimado dos produtos (65% do faturamento)</p>
        <p className="text-muted-foreground">
          {itemsWithoutCost && itemsWithoutCost > 0
            ? `${itemsWithoutCost} produtos vendidos sem preço de custo cadastrado. `
            : "Nenhum produto com custo cadastrado no período. "}
          Cadastre o custo no cardápio ou os ingredientes de cada prato em Gestão → Custos para ver
          a margem real.
        </p>
        <Link to="/cardapio" className="text-primary font-medium hover:underline text-xs">
          Ir para o cardápio →
        </Link>
      </div>
    </div>
  );
}
