import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  getFeatureFlagsFn,
  updateFeatureFlagsFn,
  getDriverCommissionFn,
  updateDriverCommissionFn,
} from "@/functions/featureFlags";
import {
  FEATURE_FLAG_KEYS,
  FEATURE_FLAG_META,
  type FeatureFlagKey,
  type TenantFeatureFlags,
} from "@/lib/tenant/featureFlags";
import type { DriverCommissionSettings } from "@/lib/drivers/driverCommission";
import { toast } from "sonner";

type Props = {
  tenantId: string;
};

export function FeatureFlagsPanel({ tenantId }: Props) {
  const [flags, setFlags] = useState<TenantFeatureFlags>({});
  const [commission, setCommission] = useState<DriverCommissionSettings>({
    enabled: false,
    type: "fixed",
    value: 5,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const [f, c] = await Promise.all([
          getFeatureFlagsFn({ data: { tenantId } }),
          getDriverCommissionFn({ data: { tenantId } }),
        ]);
        setFlags(f);
        setCommission(c);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Falha ao carregar recursos");
      } finally {
        setLoading(false);
      }
    })();
  }, [tenantId]);

  const toggleFlag = (key: FeatureFlagKey, on: boolean) => {
    setFlags((prev) => ({ ...prev, [key]: on }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const [savedFlags, savedCommission] = await Promise.all([
        updateFeatureFlagsFn({ data: { tenantId, flags } }),
        updateDriverCommissionFn({ data: { tenantId, settings: commission } }),
      ]);
      setFlags(savedFlags);
      setCommission(savedCommission);
      toast.success("Recursos beta salvos");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="erp-card p-5 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Carregando recursos…
      </section>
    );
  }

  const phases = ["Fase 1", "Fase 2", "Fase 3"] as const;

  return (
    <section className="erp-card p-5 space-y-4">
      <div className="flex items-center gap-2 font-medium">
        <Sparkles className="size-4 text-primary" />
        Recursos beta
      </div>
      <p className="text-sm text-muted-foreground">
        Ative funcionalidades gradualmente. Desligado por padrão — não afeta operação atual.
      </p>

      {phases.map((phase) => (
        <div key={phase} className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {phase}
          </p>
          <ul className="space-y-2">
            {FEATURE_FLAG_KEYS.filter((k) => FEATURE_FLAG_META[k].phase === phase).map((key) => (
              <li
                key={key}
                className="flex items-start justify-between gap-3 rounded-xl border border-border/50 bg-muted/10 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{FEATURE_FLAG_META[key].label}</p>
                  <p className="text-xs text-muted-foreground">{FEATURE_FLAG_META[key].description}</p>
                </div>
                <Switch
                  checked={flags[key] === true}
                  onCheckedChange={(on) => toggleFlag(key, on)}
                  className="shrink-0 data-[state=unchecked]:bg-border/80"
                />
              </li>
            ))}
          </ul>
        </div>
      ))}

      {flags.driver_commission ? (
        <div className="rounded-xl border border-border/50 bg-background/80 p-4 space-y-3">
          <p className="text-sm font-medium">Comissão do entregador</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Tipo</label>
              <select
                value={commission.type}
                onChange={(e) =>
                  setCommission((c) => ({
                    ...c,
                    type: e.target.value as "fixed" | "percent",
                  }))
                }
                className="mt-1 w-full h-9 rounded-lg border border-border bg-background px-3 text-sm"
              >
                <option value="fixed">Valor fixo (R$)</option>
                <option value="percent">% da taxa de entrega</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Valor</label>
              <input
                type="number"
                min={0}
                step={commission.type === "percent" ? 1 : 0.5}
                value={commission.value}
                onChange={(e) =>
                  setCommission((c) => ({ ...c, value: Number(e.target.value) || 0 }))
                }
                className="mt-1 w-full h-9 rounded-lg border border-border bg-background px-3 text-sm"
              />
            </div>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        disabled={saving}
        onClick={() => void handleSave()}
        className="erp-btn-primary disabled:opacity-50"
      >
        {saving ? <Loader2 className="size-4 animate-spin" /> : null}
        Salvar recursos beta
      </button>
    </section>
  );
}
