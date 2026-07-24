import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Link } from "@tanstack/react-router";

type Props = {
  source: "menu" | "estimate" | "recorded";
  itemsWithoutCost?: number;
  ordersWithCmv?: number;
  /** Avoid flashing the estimate warning before CMV data has loaded. */
  ready?: boolean;
};

export function CmvEstimateBanner({
  source,
  itemsWithoutCost,
  ordersWithCmv,
  ready = true,
}: Props) {
  if (!ready) return null;

  const incomplete = (itemsWithoutCost ?? 0) > 0;

  if (source === "recorded" && !incomplete) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm">
        <CheckCircle2 className="size-4 shrink-0 text-success mt-0.5" />
        <div className="min-w-0 space-y-1">
          <p className="font-medium text-foreground">CMV real das entregas</p>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Usando {ordersWithCmv ?? 0} pedido(s) com custo gravado na entrega (ficha técnica ou
            custo unitário do cardápio).
          </p>
        </div>
      </div>
    );
  }

  if (source === "menu" && !incomplete) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm">
        <CheckCircle2 className="size-4 shrink-0 text-success mt-0.5" />
        <div className="min-w-0 space-y-1">
          <p className="font-medium text-foreground">CMV do cardápio / ficha técnica</p>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Custo calculado com preço de custo ou ingredientes cadastrados nos produtos vendidos.
          </p>
        </div>
      </div>
    );
  }

  if (source === "menu" && incomplete) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
        <AlertTriangle className="size-4 shrink-0 text-warning mt-0.5" />
        <div className="min-w-0 space-y-1">
          <p className="font-medium text-foreground">CMV parcial — parte estimada</p>
          <p className="text-muted-foreground">
            {itemsWithoutCost} produto(s) vendido(s) sem custo cadastrado. Para esses itens usamos
            estimativa de 65% da receita proporcional. Cadastre o custo no cardápio ou a ficha
            técnica em Gestão → Custos.
          </p>
          <Link to="/cardapio" className="text-primary font-medium hover:underline text-xs">
            Ir para o cardápio →
          </Link>
        </div>
      </div>
    );
  }

  if (source === "recorded" && incomplete) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
        <AlertTriangle className="size-4 shrink-0 text-warning mt-0.5" />
        <div className="min-w-0 space-y-1">
          <p className="font-medium text-foreground">CMV gravado com lacunas</p>
          <p className="text-muted-foreground text-xs leading-relaxed">
            {ordersWithCmv ?? 0} pedido(s) com CMV na entrega, mas {itemsWithoutCost} item(ns) sem
            custo. Complete fichas técnicas ou custo unitário para fechar a margem.
          </p>
          <Link to="/cardapio" className="text-primary font-medium hover:underline text-xs">
            Ir para o cardápio →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
      <AlertTriangle className="size-4 shrink-0 text-warning mt-0.5" />
      <div className="min-w-0 space-y-1">
        <p className="font-medium text-foreground">Custo estimado dos produtos (65% do faturamento)</p>
        <p className="text-muted-foreground">
          {incomplete
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
