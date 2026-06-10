import { useCallback, useEffect, useState } from "react";
import {
  getSlaSettingsFn,
  resetSlaSettingsFn,
  saveSlaSettingsFn,
} from "@/functions/slaSettings";
import {
  DEFAULT_SLA_SETTINGS,
  getSlaSettings,
  resetSlaSettingsLocal,
  saveSlaSettingsLocal,
  setSlaSettingsCache,
  type SlaSettings,
} from "@/lib/ops/slaSettings";
import { USE_POSTGRES } from "@/lib/repositories";
import { toast } from "sonner";

export function useSlaSettings(tenantId: string | undefined, onChanged?: () => void) {
  const [settings, setSettings] = useState<SlaSettings>(DEFAULT_SLA_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!tenantId) {
      setSettings(DEFAULT_SLA_SETTINGS);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      if (USE_POSTGRES) {
        const remote = await getSlaSettingsFn({ data: { tenantId } });
        setSlaSettingsCache(tenantId, remote);
        setSettings(remote);
      } else {
        setSettings(getSlaSettings(tenantId));
      }
    } catch {
      setSettings(getSlaSettings(tenantId));
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  const apply = useCallback(
    async (next: SlaSettings) => {
      if (!tenantId || saving) return;
      setSaving(true);
      try {
        let saved: SlaSettings;
        if (USE_POSTGRES) {
          saved = await saveSlaSettingsFn({ data: { tenantId, settings: next } });
        } else {
          saved = saveSlaSettingsLocal(tenantId, next);
        }
        setSlaSettingsCache(tenantId, saved);
        setSettings(saved);
        toast.success("Parâmetros SLA aplicados — insights atualizados.");
        onChanged?.();
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Erro ao salvar parâmetros SLA");
      } finally {
        setSaving(false);
      }
    },
    [tenantId, saving, onChanged],
  );

  const reset = useCallback(async () => {
    if (!tenantId || saving) return;
    setSaving(true);
    try {
      let defaults: SlaSettings;
      if (USE_POSTGRES) {
        defaults = await resetSlaSettingsFn({ data: { tenantId } });
      } else {
        defaults = resetSlaSettingsLocal(tenantId);
      }
      setSlaSettingsCache(tenantId, defaults);
      setSettings(defaults);
      toast.info("Parâmetros restaurados para o padrão.");
      onChanged?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao restaurar parâmetros");
    } finally {
      setSaving(false);
    }
  }, [tenantId, saving, onChanged]);

  return { settings, setSettings, loading, saving, apply, reset, reload: load };
}
