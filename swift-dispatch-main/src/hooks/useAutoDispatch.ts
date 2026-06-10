import { useCallback, useEffect, useState } from "react";
import { getStoreSettingsFn } from "@/functions/storeSettings";
import { updateAutoDispatchFn } from "@/functions/autoDispatchSettings";
import {
  getLocalAutoDispatchEnabled,
  updateLocalAutoDispatch,
} from "@/lib/ops/autoDispatchSettings";
import { USE_POSTGRES } from "@/lib/repositories";
import { toast } from "sonner";

export function useAutoDispatch(tenantId: string | undefined, onChanged?: () => void) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!tenantId) {
      setEnabled(false);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        if (USE_POSTGRES) {
          const settings = await getStoreSettingsFn({ data: { tenantId } });
          if (!cancelled) setEnabled(settings.auto_dispatch_enabled);
        } else {
          if (!cancelled) setEnabled(getLocalAutoDispatchEnabled(tenantId));
        }
      } catch {
        if (!cancelled) setEnabled(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  const toggle = useCallback(
    async (next: boolean) => {
      if (!tenantId || saving) return;
      setSaving(true);
      try {
        let assigned = 0;
        if (USE_POSTGRES) {
          const result = await updateAutoDispatchFn({ data: { tenantId, enabled: next } });
          setEnabled(result.settings.auto_dispatch_enabled);
          assigned = result.assigned;
        } else {
          assigned = updateLocalAutoDispatch(tenantId, next);
          setEnabled(next);
        }

        if (next) {
          if (assigned > 0) {
            toast.success(
              assigned === 1
                ? "Despacho automático ativo · 1 pedido atribuído"
                : `Despacho automático ativo · ${assigned} pedidos atribuídos`,
            );
          } else {
            toast.success("Despacho automático ativado");
          }
        } else {
          toast.info("Despacho automático desativado · use a sessão de entregadores");
        }

        onChanged?.();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Não foi possível alterar o despacho automático";
        toast.error(msg);
      } finally {
        setSaving(false);
      }
    },
    [tenantId, saving, onChanged],
  );

  return { enabled, loading, saving, toggle };
}
