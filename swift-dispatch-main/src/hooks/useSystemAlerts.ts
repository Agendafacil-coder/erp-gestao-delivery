import { useCallback, useEffect, useMemo, useState } from "react";
import { getStoreSettingsFn } from "@/functions/storeSettings";
import { getPaymentProviderModeFn } from "@/functions/paymentSettings";
import { getTenantIntegrationChecksFn } from "@/functions/integrationHealth";
import { resolveReadinessDestination } from "@/lib/sistema/readinessLinks";
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
  const [storeIssues, setStoreIssues] = useState<
    Array<{ id: string; message: string; aba: SistemaAba }>
  >([]);
  const [paymentMock, setPaymentMock] = useState(false);
  const [integrationIssues, setIntegrationIssues] = useState<
    Array<{ id: string; message: string; aba: SistemaAba }>
  >([]);

  const load = useCallback(async () => {
    if (!tenantId) {
      setStoreIssues([]);
      setPaymentMock(false);
      setIntegrationIssues([]);
      return;
    }

    const tasks: Promise<void>[] = [];

    if (canAccessSistemaSection(role, "configs")) {
      tasks.push(
        getStoreSettingsFn({ data: { tenantId } })
          .then((settings) => {
            const issues: Array<{ id: string; message: string; aba: SistemaAba }> = [];
            if (!settings.store_city?.trim() || !settings.store_state?.trim()) {
              issues.push({
                id: "region",
                message: "Falta cidade e estado da loja (para entrega e mapa).",
                aba: "loja",
              });
            }
            if (!settings.store_address?.trim()) {
              issues.push({
                id: "address",
                message: "Falta o endereço da loja.",
                aba: "loja",
              });
            }
            if (!settings.delivery_enabled && !settings.pickup_enabled) {
              issues.push({
                id: "fulfillment",
                message: "Ligue entrega ou retirada — senão o cardápio não aceita pedido.",
                aba: "loja",
              });
            }
            setStoreIssues(issues);
          })
          .catch(() => setStoreIssues([])),
      );

      tasks.push(
        getPaymentProviderModeFn()
          .then((mode) => setPaymentMock(mode.isMock))
          .catch(() => setPaymentMock(false)),
      );
    } else {
      setStoreIssues([]);
      setPaymentMock(false);
    }

    if (canAccessSistemaSection(role, "automacoes")) {
      tasks.push(
        getTenantIntegrationChecksFn({ data: { tenantId } })
          .then((checks) => {
            const issues: Array<{ id: string; message: string; aba: SistemaAba }> = [];
            for (const check of checks) {
              if (check.done) continue;
              const dest = resolveReadinessDestination(check.id);
              const aba =
                dest?.kind === "route" && dest.search.secao === "automacoes"
                  ? dest.search.aba
                  : undefined;
              if (!aba) continue;
              issues.push({
                id: check.id,
                message: check.hint ?? check.label,
                aba,
              });
            }
            setIntegrationIssues(issues);
          })
          .catch(() => setIntegrationIssues([])),
      );
    } else {
      setIntegrationIssues([]);
    }

    await Promise.all(tasks);
  }, [tenantId, role]);

  useEffect(() => {
    void load();
  }, [load]);

  const alerts = useMemo((): SystemAlert[] => {
    const result: SystemAlert[] = [];

    for (const issue of storeIssues) {
      result.push({
        id: `store-${issue.id}`,
        message: issue.message,
        actionLabel: "Corrigir",
        secao: "configs",
        aba: issue.aba,
      });
    }

    if (paymentMock) {
      result.push({
        id: "payment-mock",
        message: "Pagamentos ainda em teste — peça ao suporte para cobrar no site.",
        actionLabel: "Ver checklist",
        secao: "configs",
        aba: "operacao",
      });
    }

    for (const issue of integrationIssues) {
      result.push({
        id: `integration-${issue.id}`,
        message: issue.message,
        actionLabel: "Configurar",
        secao: "automacoes",
        aba: issue.aba,
      });
    }

    return result;
  }, [storeIssues, paymentMock, integrationIssues]);

  return { alerts, refresh: load };
}
