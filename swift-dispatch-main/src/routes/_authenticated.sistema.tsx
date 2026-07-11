import { OpsPage } from "@/components/ops/OpsPage";
import { OpsPageHeader } from "@/components/ops/OpsPageHeader";
import { SystemPagesGuide } from "@/components/ops/SystemPagesGuide";
import { AutomacoesSection } from "@/components/sistema/AutomacoesSection";
import { AuditoriaSection } from "@/components/sistema/AuditoriaSection";
import { ConfigsSection } from "@/components/sistema/ConfigsSection";
import { SistemaAlertsBanner } from "@/components/sistema/SistemaAlertsBanner";
import { WhatsappSection } from "@/components/sistema/WhatsappSection";
import { useAuthAccess } from "@/hooks/useAuthAccess";
import { useSystemAlerts } from "@/hooks/useSystemAlerts";
import { useTenant } from "@/hooks/useTenant";
import {
  defaultSistemaAba,
  parseSistemaAba,
  validateSistemaSearch,
  type AutomacoesAba,
  type ConfigsAba,
  type SistemaAba,
  type WhatsappAba,
} from "@/lib/sistema/search";
import {
  accessibleSistemaSections,
  canAccessSistema,
  canAccessSistemaSection,
  defaultSistemaSection,
  type SistemaSection,
} from "@/lib/sistema/sections";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Settings2 } from "lucide-react";
import { useEffect } from "react";

export const Route = createFileRoute("/_authenticated/sistema")({
  validateSearch: validateSistemaSearch,
  component: SistemaPage,
});

function SistemaPage() {
  const { role } = useAuthAccess();
  const { current } = useTenant();
  const navigate = useNavigate({ from: Route.fullPath });
  const search = Route.useSearch();
  const { secao, aba } = search;

  const allowedSections = accessibleSistemaSections(role);
  const { alerts } = useSystemAlerts(current?.id, role);

  useEffect(() => {
    if (!canAccessSistema(role)) return;

    if (!canAccessSistemaSection(role, secao)) {
      const fallback = defaultSistemaSection(role);
      const fallbackAba = defaultSistemaAba(fallback);
      void navigate({
        search: fallbackAba ? { secao: fallback, aba: fallbackAba } : { secao: fallback },
        replace: true,
      });
      return;
    }

    if (secao === "auditoria") {
      if (aba) void navigate({ search: { secao }, replace: true });
      return;
    }

    const parsedAba = parseSistemaAba(secao, aba) ?? defaultSistemaAba(secao);
    if (parsedAba && parsedAba !== aba) {
      void navigate({ search: { secao, aba: parsedAba }, replace: true });
    }
  }, [role, secao, aba, navigate]);

  const setSecao = (next: SistemaSection) => {
    const nextAba = defaultSistemaAba(next);
    void navigate({
      search: nextAba ? { secao: next, aba: nextAba } : { secao: next },
    });
  };

  const setAba = (nextAba: SistemaAba) => {
    void navigate({ search: { secao, aba: nextAba } });
  };

  const navigateStatus = (nextSecao: SistemaSection, nextAba?: SistemaAba) => {
    const resolved = nextAba ?? defaultSistemaAba(nextSecao);
    void navigate({
      search: resolved ? { secao: nextSecao, aba: resolved } : { secao: nextSecao },
    });
  };

  const whatsappAba = (parseSistemaAba("whatsapp", aba) ?? "api") as WhatsappAba;
  const automacoesAba = (parseSistemaAba("automacoes", aba) ?? "ifood") as AutomacoesAba;
  const configsAba = (parseSistemaAba("configs", aba) ?? "loja") as ConfigsAba;

  return (
    <OpsPage
      className={
        secao === "auditoria"
          ? "!space-y-0 min-h-0 flex flex-col gap-6"
          : "space-y-6 max-h-[calc(100dvh-8rem)] overflow-y-auto"
      }
    >
      <OpsPageHeader
        subtitle="Ajustes da loja"
        icon={Settings2}
        iconClassName="text-primary"
        title="Sistema"
        description="Configure a loja, o WhatsApp e os apps de delivery."
        className="pb-2 shrink-0"
      />

      <SistemaAlertsBanner
        alerts={alerts.filter((a) => a.secao !== secao)}
        onNavigate={navigateStatus}
        className="shrink-0"
      />

      <SystemPagesGuide
        current={secao}
        onChange={setSecao}
        available={allowedSections}
        className="shrink-0"
      />

      {secao === "whatsapp" && canAccessSistemaSection(role, "whatsapp") ? (
        <WhatsappSection aba={whatsappAba} onAbaChange={setAba} />
      ) : null}

      {secao === "automacoes" && canAccessSistemaSection(role, "automacoes") ? (
        <AutomacoesSection aba={automacoesAba} onAbaChange={setAba} />
      ) : null}

      {secao === "auditoria" && canAccessSistemaSection(role, "auditoria") ? (
        <AuditoriaSection />
      ) : null}

      {secao === "configs" && canAccessSistemaSection(role, "configs") ? (
        <ConfigsSection aba={configsAba} onAbaChange={setAba} />
      ) : null}
    </OpsPage>
  );
}
