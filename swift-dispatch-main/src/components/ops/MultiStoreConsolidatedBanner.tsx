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

  // Flag on but only one tenant — explain how multi-store access works.
  if (units.length <= 1) {
    return (
      <div className="rounded-xl border border-border/50 bg-muted/15 px-4 py-3 text-sm flex gap-3">
        <Building2 className="size-4 shrink-0 text-primary mt-0.5" />
        <div>
          <p className="font-medium text-foreground">Várias unidades ativado</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            Este usuário ainda só acessa uma loja. Para consolidar, o mesmo login precisa ter
            permissão em mais de um tenant — o seletor de unidades aparece no menu lateral.
          </p>
        </div>
      </div>
    );
  }

  if (unitId !== "all") return null;

  // `units` includes the synthetic "all" option — count only real stores.
  const storeCount = units.filter((u) => u.id !== "all").length;

  return (
    <div className="rounded-xl border border-primary/25 bg-primary/[0.06] px-4 py-3 text-sm flex gap-3">
      <Building2 className="size-4 shrink-0 text-primary mt-0.5" />
      <div>
        <p className="font-medium text-foreground">Visão consolidada — todas as unidades</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
          Números somam {storeCount} loja(s). Use o seletor no menu para ver uma unidade isolada.
        </p>
      </div>
    </div>
  );
}
