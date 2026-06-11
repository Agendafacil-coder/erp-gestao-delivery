import { useCallback, useEffect, useState } from "react";
import {
  getAutomationSettings,
  isAutomationEnabled,
  saveAutomationSettingsLocal,
  setAutomationSettingsCache,
  type AutomationSettings,
} from "@/lib/ops/automationSettings";
import { USE_POSTGRES } from "@/lib/repositories";
import { toast } from "sonner";

export function useAutomationSettings(tenantId: string | undefined) {
  const [settings, setSettings] = useState<AutomationSettings>(() =>
    getAutomationSettings(tenantId),
  );
  const [loading, setLoading] = useState(!!tenantId && USE_POSTGRES);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!tenantId) {
      setSettings(getAutomationSettings());
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        if (USE_POSTGRES) {
          const { getAutomationSettingsFn } = await import("@/functions/automationSettings");
          const remote = await getAutomationSettingsFn({ data: { tenantId } });
          if (!cancelled) {
            setAutomationSettingsCache(tenantId, remote);
            setSettings(remote);
          }
        } else if (!cancelled) {
          setSettings(getAutomationSettings(tenantId));
        }
      } catch {
        if (!cancelled) setSettings(getAutomationSettings(tenantId));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  const setRuleEnabled = useCallback(
    async (ruleId: string, enabled: boolean) => {
      if (!tenantId || saving) return;

      const next: AutomationSettings = {
        enabled: { ...settings.enabled, [ruleId]: enabled },
      };

      setSaving(true);
      try {
        if (USE_POSTGRES) {
          const { saveAutomationSettingsFn } = await import("@/functions/automationSettings");
          const saved = await saveAutomationSettingsFn({ data: { tenantId, settings: next } });
          setAutomationSettingsCache(tenantId, saved);
          setSettings(saved);
        } else {
          const saved = saveAutomationSettingsLocal(tenantId, next);
          setSettings(saved);
        }
        toast.success(enabled ? "Automação ativada" : "Automação pausada");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Não foi possível salvar";
        toast.error(msg);
      } finally {
        setSaving(false);
      }
    },
    [tenantId, saving, settings.enabled],
  );

  const isEnabled = useCallback(
    (ruleId: string) => isAutomationEnabled(settings, ruleId),
    [settings],
  );

  return { settings, loading, saving, setRuleEnabled, isEnabled };
}
