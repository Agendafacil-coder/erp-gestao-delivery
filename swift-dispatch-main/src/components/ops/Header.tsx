import {
  Bell,
  LogOut,
  Monitor,
  ShieldCheck,
  AlertOctagon,
  Activity,
  Info,
  Menu,
} from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { useI18n } from "@/hooks/useI18n";
import { useOps } from "@/hooks/useOps";
import { useUnitView } from "@/hooks/useUnitView";
import { useOpsLayout } from "@/hooks/useOpsLayout";
import { computeOperationalStats } from "@/lib/ops/operationalStats";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/ops/ThemeToggle";
import { pathnameToNavKey } from "@/lib/roles";
import { useIsMobile } from "@/hooks/use-mobile";

export function OpsHeader() {
  const { tick, orders, drivers } = useOps();
  const [now, setNow] = useState<string>("--:--:--");
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { locale, setLocale, t } = useI18n();
  const unitView = useUnitView();
  const isMobile = useIsMobile();
  const { mobileNavOpen, toggleMobileNav, tvMode, setTvMode, setMobileNavOpen } = useOpsLayout();
  const showMobileMenuBtn = isMobile && !mobileNavOpen;

  const scopedOrders = useMemo(
    () => unitView.filterOrders(orders),
    [orders, unitView],
  );
  const scopedDrivers = useMemo(
    () => unitView.filterDrivers(scopedOrders, drivers),
    [scopedOrders, drivers, unitView],
  );

  const stats = useMemo(
    () => computeOperationalStats(scopedOrders, scopedDrivers),
    [scopedOrders, scopedDrivers, tick],
  );

  const navKey = pathnameToNavKey(location.pathname);
  const pageTitle = navKey ? t("nav", navKey) : "Delivery OS";
  const displayName =
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Operador";

  useEffect(() => {
    const fmt = () =>
      new Date().toLocaleTimeString(locale, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    setNow(fmt());
    const id = setInterval(() => setNow(fmt()), 1000);
    return () => clearInterval(id);
  }, [locale]);

  useEffect(() => {
    setMobileNavOpen(false);
    setTvMode(false);
  }, [location.pathname, setMobileNavOpen, setTvMode]);

  useEffect(() => {
    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      }
    };
  }, []);

  const toggleTvMode = () => {
    const next = !tvMode;
    setTvMode(next);
    if (next) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const kpiItems = (
    <>
      <HeaderKpi label="Ativos" value={String(stats.activeCount)} />
      <HeaderKpi
        label="Atrasados"
        value={String(stats.delayedCount)}
        highlight={stats.delayedCount > 0}
      />
      <HeaderKpi
        label="Críticos"
        value={String(stats.criticalCount)}
        highlight={stats.criticalCount > 0}
      />
      <HeaderKpi
        label="Entregadores"
        value={`${stats.onlineCount}/${stats.totalDrivers}`}
      />
    </>
  );

  return (
    <TooltipProvider delayDuration={200}>
      <header className="ops-topbar sticky top-0 z-40">
        <div className="ops-topbar-row">
          <div className="ops-topbar-start">
            {showMobileMenuBtn ? (
              <button
                type="button"
                className="ops-icon-btn shrink-0"
                onClick={toggleMobileNav}
                aria-label="Abrir menu"
              >
                <Menu className="size-5" />
              </button>
            ) : null}

            <div className="min-w-0 flex-1">
              <h1 className="font-display text-sm sm:text-base font-semibold tracking-tight text-foreground truncate leading-tight">
                {pageTitle}
              </h1>
            </div>

            <div className={`ops-health-pill hidden md:inline-flex ${stats.statusTone}`}>
              {stats.systemStatus === "saudavel" ? (
                <ShieldCheck className="size-3 shrink-0" aria-hidden />
              ) : stats.systemStatus === "critico" ? (
                <AlertOctagon className="size-3 shrink-0" aria-hidden />
              ) : (
                <Activity className="size-3 shrink-0" aria-hidden />
              )}
              <span className="hidden lg:inline max-w-[8rem] truncate">{stats.statusLabel}</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="rounded-full p-0.5 opacity-80 hover:opacity-100 -mr-0.5"
                    aria-label="Detalhes do status operacional"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Info className="size-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs p-3 text-left">
                  <p className="font-medium text-sm mb-1.5">{stats.healthSummary}</p>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                    {stats.healthReasons.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </TooltipContent>
              </Tooltip>
            </div>

            <span className="text-[11px] text-muted-foreground hidden md:inline tabular-nums erp-chip py-1 px-2 shrink-0">
              {now}
            </span>
          </div>

          <div className="ops-topbar-kpis ops-topbar-kpis--desktop">
            <div className="ops-kpi-group" role="group" aria-label="Indicadores operacionais">
              {kpiItems}
            </div>
          </div>

          <div className="ops-topbar-end">
            <div className="ops-topbar-toolbar">
              <ThemeToggle />
              <button
                type="button"
                onClick={toggleTvMode}
                title="Modo TV / tela cheia"
                className={`ops-icon-btn ${tvMode ? "ops-icon-btn--active" : ""}`}
              >
                <Monitor className="size-4" />
              </button>

              <div className="hidden sm:flex items-center gap-px px-0.5">
                {(["pt-BR", "en", "es"] as const).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setLocale(lang)}
                    className={`text-[10px] min-w-[1.75rem] h-7 rounded-lg font-semibold transition ${
                      locale === lang
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
                    }`}
                  >
                    {lang === "pt-BR" ? "PT" : lang === "en" ? "EN" : "ES"}
                  </button>
                ))}
              </div>

              <button type="button" className="ops-icon-btn relative" aria-label="Notificações">
                <Bell className="size-4" />
                {stats.delayedCount > 0 && (
                  <span className="absolute top-1 right-1 size-2 rounded-full bg-danger border-2 border-card" />
                )}
              </button>
            </div>

            <div className="ops-user-chip hidden md:flex" title={displayName}>
              <span className="ops-user-chip-name">{displayName}</span>
              <div
                className="ops-user-avatar bg-primary flex items-center justify-center text-[10px] font-semibold uppercase text-primary-foreground"
                aria-hidden
              >
                {(user?.email || "OP").slice(0, 2)}
              </div>
            </div>

            <button
              type="button"
              onClick={async () => {
                await signOut();
                navigate({ to: "/login" });
              }}
              title="Sair"
              className="ops-icon-btn hover:border-danger/40 hover:text-danger shrink-0"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>

        <div className="ops-topbar-kpis ops-topbar-kpis--mobile">
          <span className="text-[10px] text-muted-foreground tabular-nums erp-chip py-1 px-2 shrink-0 sm:hidden">
            {now}
          </span>
          <div className="ops-kpi-group flex-1 min-w-0" role="group" aria-label="Indicadores operacionais">
            <HeaderKpi label="Ativos" value={String(stats.activeCount)} compact />
            <HeaderKpi
              label="Atrasados"
              value={String(stats.delayedCount)}
              highlight={stats.delayedCount > 0}
              compact
            />
            <HeaderKpi label="Críticos" value={String(stats.criticalCount)} compact />
            <HeaderKpi
              label="Online"
              value={`${stats.onlineCount}/${stats.totalDrivers}`}
              compact
            />
          </div>
        </div>
      </header>
    </TooltipProvider>
  );
}

function HeaderKpi({
  label,
  value,
  highlight,
  compact,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={`ops-kpi ${highlight ? "ops-kpi--danger" : ""} ${compact ? "ops-kpi--compact shrink-0" : ""}`}
    >
      <span className="ops-kpi-label">{label}</span>
      <span className="ops-kpi-value">{value}</span>
    </div>
  );
}
