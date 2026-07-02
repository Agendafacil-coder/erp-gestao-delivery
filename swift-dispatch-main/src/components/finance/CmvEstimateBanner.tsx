import { AlertTriangle } from "lucide-react";
import { Link } from "@tanstack/react-router";

type Props = {
  source: "menu" | "estimate";
  itemsWithoutCost?: number;
};

export function CmvEstimateBanner({ source, itemsWithoutCost }: Props) {
  if (source !== "estimate") return null;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
      <AlertTriangle className="size-4 shrink-0 text-warning mt-0.5" />
      <div className="min-w-0 space-y-1">
        <p className="font-medium text-foreground">CMV estimado (65% da receita)</p>
        <p className="text-muted-foreground">
          {itemsWithoutCost && itemsWithoutCost > 0
            ? `${itemsWithoutCost} itens vendidos sem custo unitário cadastrado. `
            : "Nenhum produto com custo unitário no período. "}
          Cadastre o custo no cardápio ou monte a ficha técnica em Financeiro → CMV para ver margem
          real.
        </p>
        <Link to="/cardapio" className="text-primary font-medium hover:underline text-xs">
          Ir para o cardápio →
        </Link>
      </div>
    </div>
  );
}
