import { OpsPage } from "@/components/ops/OpsPage";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useTenant } from "@/hooks/useTenant";
import { useOps } from "@/hooks/useOps";
import { useAuthAccess } from "@/hooks/useAuthAccess";
import { OpsPageHeader } from "@/components/ops/OpsPageHeader";
import { ManagementPagesGuide } from "@/components/ops/ManagementPagesGuide";
import { FinanceiroSection } from "@/components/gestao/FinanceiroSection";
import { IndicadoresPanel } from "@/components/gestao/IndicadoresPanel";
import { RelatoriosPanel } from "@/components/gestao/RelatoriosPanel";
import {
  accessibleGestaoSections,
  canAccessGestao,
  canAccessGestaoSection,
  defaultGestaoSection,
  parseGestaoSection,
  type GestaoSection,
} from "@/lib/gestao/sections";
import { parseFinanceTab, type FinanceTab } from "@/lib/gestao/financeTabs";
import { LayoutDashboard } from "lucide-react";

export const Route = createFileRoute("/_authenticated/financeiro")({
  validateSearch: (search: Record<string, unknown>) => {
    const secao = parseGestaoSection(search.secao);
    const aba = secao === "financeiro" ? parseFinanceTab(search.aba) : undefined;
    return aba ? { secao, aba } : { secao };
  },
  component: GestaoPage,
});

function GestaoPage() {
  const { current } = useTenant();
  const { orders } = useOps();
  const { role } = useAuthAccess();
  const navigate = useNavigate({ from: Route.fullPath });
  const { secao, aba } = Route.useSearch();

  const allowedSections = accessibleGestaoSections(role);

  useEffect(() => {
    if (!canAccessGestao(role)) {
      return;
    }
    if (!canAccessGestaoSection(role, secao)) {
      void navigate({
        search: { secao: defaultGestaoSection(role) },
        replace: true,
      });
      return;
    }

    if (secao !== "financeiro" && aba) {
      void navigate({ search: { secao }, replace: true });
    }
  }, [role, secao, aba, navigate]);

  const setSecao = (next: GestaoSection) => {
    void navigate({ search: { secao: next } });
  };

  const financeTab = (parseFinanceTab(aba) ?? "resumo") as FinanceTab;
  const setFinanceTab = (tab: FinanceTab) => {
    void navigate({ search: { secao: "financeiro", aba: tab } });
  };

  return (
    <OpsPage className="space-y-6 max-h-[calc(100dvh-8rem)] overflow-y-auto">
      <OpsPageHeader
        subtitle="Financeiro, indicadores e relatórios"
        icon={LayoutDashboard}
        iconClassName="text-primary"
        title="Gestão"
        description="Tudo em um só lugar: controle financeiro, acompanhamento do turno ao vivo e histórico por período."
        className="pb-2"
      />

      <ManagementPagesGuide
        current={secao}
        onChange={setSecao}
        available={allowedSections}
      />

      {secao === "financeiro" && canAccessGestaoSection(role, "financeiro") ? (
        <FinanceiroSection
          tenantId={current?.id}
          tenantSlug={current?.slug}
          orders={orders}
          activeTab={financeTab}
          onTabChange={setFinanceTab}
        />
      ) : null}

      {secao === "indicadores" && canAccessGestaoSection(role, "indicadores") ? (
        <IndicadoresPanel />
      ) : null}

      {secao === "relatorios" && canAccessGestaoSection(role, "relatorios") ? (
        <RelatoriosPanel />
      ) : null}
    </OpsPage>
  );
}
