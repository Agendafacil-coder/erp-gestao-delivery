import { Building2 } from "lucide-react";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useTenant } from "@/hooks/useTenant";
import { useUnitView } from "@/hooks/useUnitView";

/** Banner quando multi-loja está ativo e a visão é consolidada. */
export function MultiStoreConsolidatedBanner() {
  const { current } = useTenant();
  const { enabled } = useFeatureFlags(current?.id);
  const { unitId, units } = useUnitView();

  if (!enabled("multi_store")) return null;
  if (units.length <= 1) {
    return (
      <div className="rounded-xl border border-border/50 bg-muted/15 px-4 py-3 text-sm flex gap-3">
        <Building2 className="size-4 shrink-0 text-primary mt-0.5" />
        <div>
          <p className="font-medium text-foreground">Várias unidades ativado</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            Adicione outras lojas à sua conta (mesmo usuário com acesso a mais de um tenant) para
            filtrar e consolidar pedidos e financeiro no seletor de unidades.
          </p>
        </div>
      </div>
    );
  }

  if (unitId !== "all") return null;

  return (
    <div className="rounded-xl border border-primary/25 bg-primary/[0.06] px-4 py-3 text-sm flex gap-3">
      <Building2 className="size-4 shrink-0 text-primary mt-0.5" />
      <div>
        <p className="font-medium text-foreground">Visão consolidada — todas as unidades</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
          Números somam {units.length - 1} loja(s). Use o seletor no menu para ver uma unidade
          isolada.
        </p>
      </div>
    </div>
  );
}
