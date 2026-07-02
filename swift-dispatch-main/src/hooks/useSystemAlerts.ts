import { useCallback, useEffect, useMemo, useState } from "react";
import { getWhatsappApiConfigFn } from "@/functions/whatsapp";
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
  const [whatsappOnline, setWhatsappOnline] = useState<boolean | null>(null);
  const [storeIssues, setStoreIssues] = useState<
    Array<{ id: string; message: string; aba: SistemaAba }>
  >([]);
  const [paymentMock, setPaymentMock] = useState(false);
  const [integrationIssues, setIntegrationIssues] = useState<
    Array<{ id: string; message: string; aba: SistemaAba }>
  >([]);

  const load = useCallback(async () => {
    if (!tenantId) {
      setWhatsappOnline(null);
      setStoreIssues([]);
      setPaymentMock(false);
      setIntegrationIssues([]);
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
                message: "Informe cidade e estado da loja para calcular entrega e mostrar no mapa.",
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

    if (canAccessSistemaSection(role, "configs")) {
      tasks.push(
        getPaymentProviderModeFn()
          .then((mode) => setPaymentMock(mode.isMock))
          .catch(() => setPaymentMock(false)),
      );
    } else {
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

    if (canAccessSistemaSection(role, "whatsapp") && whatsappOnline === false) {
      result.push({
        id: "whatsapp-demo",
        message: "WhatsApp em modo de teste — mensagens reais ainda não são enviadas.",
        actionLabel: "Configurar WhatsApp",
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

    if (paymentMock) {
      result.push({
        id: "payment-mock",
        message:
          "Pagamentos em modo de teste — peça ao suporte para ativar cobrança real no site.",
        actionLabel: "Ver o que falta",
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
  }, [role, whatsappOnline, storeIssues, paymentMock, integrationIssues]);

  return { alerts, refresh: load };
}
