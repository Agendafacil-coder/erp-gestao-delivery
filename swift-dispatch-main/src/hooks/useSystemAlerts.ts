import { useCallback, useEffect, useMemo, useState } from "react";
import { getWhatsappApiConfigFn } from "@/functions/whatsapp";
import { getStoreSettingsFn } from "@/functions/storeSettings";
import { canAccessSistemaSection } from "@/lib/sistema/sections";
import type { SistemaAba } from "@/lib/sistema/search";
import type { SistemaSection } from "@/lib/sistema/sections";
import type { AppRole } from "@/lib/roles";

export type SystemAlert = {
  id: string;
  message: string;
  actionLabel: string;
  secao: SistemaSection;
  aba?: SistemaAba;
};

export function useSystemAlerts(tenantId: string | undefined, role: AppRole | null) {
  const [whatsappOnline, setWhatsappOnline] = useState<boolean | null>(null);
  const [storeIssues, setStoreIssues] = useState<
    Array<{ id: string; message: string; aba: SistemaAba }>
  >([]);

  const load = useCallback(async () => {
    if (!tenantId) {
      setWhatsappOnline(null);
      setStoreIssues([]);
      return;
    }

    const tasks: Promise<void>[] = [];

    if (canAccessSistemaSection(role, "whatsapp")) {
      tasks.push(
        getWhatsappApiConfigFn({ data: { tenantId } })
          .then((cfg) => setWhatsappOnline(cfg.enabled && cfg.apiKeySet))
          .catch(() => setWhatsappOnline(false)),
      );
    } else {
      setWhatsappOnline(null);
    }

    if (canAccessSistemaSection(role, "configs")) {
      tasks.push(
        getStoreSettingsFn({ data: { tenantId } })
          .then((settings) => {
            const issues: Array<{ id: string; message: string; aba: SistemaAba }> = [];
            if (!settings.store_city?.trim() || !settings.store_state?.trim()) {
              issues.push({
                id: "region",
                message: "Informe cidade e UF da loja para calcular entregas e GPS.",
                aba: "loja",
              });
            }
            if (!settings.store_address?.trim()) {
              issues.push({
                id: "address",
                message: "Cadastre o endereço da loja para entregas e rastreio.",
                aba: "loja",
              });
            }
            if (!settings.delivery_enabled && !settings.pickup_enabled) {
              issues.push({
                id: "fulfillment",
                message: "Ative entrega ou retirada — o cardápio não aceita pedidos assim.",
                aba: "loja",
              });
            }
            setStoreIssues(issues);
          })
          .catch(() => setStoreIssues([])),
      );
    } else {
      setStoreIssues([]);
    }

    await Promise.all(tasks);
  }, [tenantId, role]);

  useEffect(() => {
    void load();
  }, [load]);

  const alerts = useMemo((): SystemAlert[] => {
    const result: SystemAlert[] = [];

    if (canAccessSistemaSection(role, "whatsapp") && whatsappOnline === false) {
      result.push({
        id: "whatsapp-demo",
        message: "WhatsApp em modo simulado — clientes e entregadores não recebem mensagens reais.",
        actionLabel: "Conectar API",
        secao: "whatsapp",
        aba: "api",
      });
    }

    for (const issue of storeIssues) {
      result.push({
        id: `store-${issue.id}`,
        message: issue.message,
        actionLabel: "Corrigir",
        secao: "configs",
        aba: issue.aba,
      });
    }

    return result;
  }, [role, whatsappOnline, storeIssues]);

  return { alerts, refresh: load };
}
