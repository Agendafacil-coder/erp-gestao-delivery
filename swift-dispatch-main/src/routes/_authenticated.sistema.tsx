import { OpsPage } from "@/components/ops/OpsPage";
import { OpsPageHeader } from "@/components/ops/OpsPageHeader";
import { SystemPagesGuide } from "@/components/ops/SystemPagesGuide";
import { AutomacoesSection } from "@/components/sistema/AutomacoesSection";
import { AuditoriaSection } from "@/components/sistema/AuditoriaSection";
import { ConfigsSection } from "@/components/sistema/ConfigsSection";
import { WhatsappSection } from "@/components/sistema/WhatsappSection";
import { useAuthAccess } from "@/hooks/useAuthAccess";
import {
  accessibleSistemaSections,
  canAccessSistema,
  canAccessSistemaSection,
  defaultSistemaSection,
  parseSistemaSection,
  type SistemaSection,
} from "@/lib/sistema/sections";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Settings2 } from "lucide-react";
import { useEffect } from "react";

export const Route = createFileRoute("/_authenticated/sistema")({
  validateSearch: (search: Record<string, unknown>) => ({
    secao: parseSistemaSection(search.secao),
  }),
  component: SistemaPage,
});

function SistemaPage() {
  const { role } = useAuthAccess();
  const navigate = useNavigate({ from: Route.fullPath });
  const { secao } = Route.useSearch();

  const allowedSections = accessibleSistemaSections(role);

  useEffect(() => {
    if (!canAccessSistema(role)) return;
    if (!canAccessSistemaSection(role, secao)) {
      void navigate({
        search: { secao: defaultSistemaSection(role) },
        replace: true,
      });
    }
  }, [role, secao, navigate]);

  const setSecao = (next: SistemaSection) => {
    void navigate({ search: { secao: next } });
  };

  return (
    <OpsPage
      className={
        secao === "auditoria"
          ? "!space-y-0 min-h-0 flex flex-col gap-6"
          : "space-y-6 max-h-[calc(100dvh-8rem)] overflow-y-auto"
      }
    >
      <OpsPageHeader
        subtitle="Administração e integrações"
        icon={Settings2}
        iconClassName="text-primary"
        title="Sistema"
        description="WhatsApp, automações, auditoria e configurações da loja — tudo organizado em um hub com navegação rápida."
        className="pb-2 shrink-0"
      />

      <SystemPagesGuide
        current={secao}
        onChange={setSecao}
        available={allowedSections}
        className="shrink-0"
      />

      {secao === "whatsapp" && canAccessSistemaSection(role, "whatsapp") ? (
        <WhatsappSection />
      ) : null}

      {secao === "automacoes" && canAccessSistemaSection(role, "automacoes") ? (
        <AutomacoesSection />
      ) : null}

      {secao === "auditoria" && canAccessSistemaSection(role, "auditoria") ? (
        <AuditoriaSection />
      ) : null}

      {secao === "configs" && canAccessSistemaSection(role, "configs") ? (
        <ConfigsSection />
      ) : null}
    </OpsPage>
  );
}
