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

export function OpsHeader() {
  const { tick, orders, drivers } = useOps();
  const [now, setNow] = useState<string>("--:--:--");
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { locale, setLocale, t } = useI18n();
  const { units, unitId, setUnitId } = useUnitView();
  const { toggleMobileNav, tvMode, setTvMode, setMobileNavOpen } = useOpsLayout();

  const unitView = useUnitView();
  const scopedOrders = useMemo(
    () => unitView.filterOrders(orders),
    [orders, unitView.unitId, unitView],
  );
  const scopedDrivers = useMemo(
    () => unitView.filterDrivers(scopedOrders, drivers),
    [scopedOrders, drivers, unitView.unitId, unitView],
  );

  const stats = useMemo(
    () => computeOperationalStats(scopedOrders, scopedDrivers),
    [scopedOrders, scopedDrivers, tick],
  );

  const navKey = pathnameToNavKey(location.pathname);
  const pageTitle = navKey ? t("nav", navKey) : "Delivery OS";

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

  return (
    <TooltipProvider delayDuration={200}>
      <header className="ops-topbar sticky top-0 z-40">
        <div className="ops-topbar-row">
          <div className="flex items-center gap-2 min-w-0 shrink-0">
            <button
              type="button"
              className="ops-icon-btn lg:hidden"
              onClick={toggleMobileNav}
              aria-label="Abrir menu"
            >
              <Menu className="size-5" />
            </button>

            <div className="lg:hidden min-w-0">
              <div className="text-sm font-semibold text-foreground truncate leading-tight">
                {pageTitle}
              </div>
              <div className="text-[10px] text-muted-foreground tabular-nums">{now}</div>
            </div>

            <select
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
              className="erp-select max-w-[120px] sm:max-w-[200px] text-xs sm:text-sm shrink min-w-0"
              aria-label="Unidade ou região"
            >
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                </option>
              ))}
            </select>

            <div className={`ops-health-pill hidden md:flex ${stats.statusTone}`}>
              {stats.systemStatus === "saudavel" ? (
                <ShieldCheck className="size-3.5 shrink-0" />
              ) : stats.systemStatus === "critico" ? (
                <AlertOctagon className="size-3.5 shrink-0" />
              ) : (
                <Activity className="size-3.5 shrink-0" />
              )}
              <span className="hidden lg:inline">{stats.statusLabel}</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="rounded-full p-0.5 opacity-80 hover:opacity-100"
                    aria-label="Detalhes do status operacional"
                  >
                    <Info className="size-3.5" />
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

            <span className="text-xs text-muted-foreground hidden xl:inline tabular-nums erp-chip">
              {now}
            </span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 flex-1 justify-center max-w-xl mx-auto">
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
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <ThemeToggle />
            <button
              type="button"
              onClick={toggleTvMode}
              title="Modo TV / tela cheia"
              className={`ops-icon-btn ${tvMode ? "ops-icon-btn--active" : ""}`}
            >
              <Monitor className="size-4" />
            </button>

            <div className="hidden sm:flex items-center gap-0.5 p-1 rounded-2xl bg-muted/50">
              {(["pt-BR", "en", "es"] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setLocale(lang)}
                  className={`text-[10px] px-2.5 py-1 rounded-xl font-medium transition ${
                    locale === lang
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {lang === "pt-BR" ? "PT" : lang === "en" ? "EN" : "ES"}
                </button>
              ))}
            </div>

            <button type="button" className="ops-icon-btn relative" aria-label="Notificações">
              <Bell className="size-4" />
              {stats.delayedCount > 0 && (
                <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-danger border-2 border-card" />
              )}
            </button>

            <div className="hidden sm:block text-right max-w-[100px] xl:max-w-[120px] pl-1">
              <div className="text-xs font-semibold truncate">
                {user?.user_metadata?.full_name || user?.email || "Operador"}
              </div>
            </div>

            <div
              className="size-9 rounded-2xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-xs font-semibold uppercase text-primary-foreground shrink-0 shadow-sm"
              aria-hidden
            >
              {(user?.email || "OP").slice(0, 2)}
            </div>

            <button
              type="button"
              onClick={async () => {
                await signOut();
                navigate({ to: "/login" });
              }}
              title="Sair"
              className="ops-icon-btn hover:border-danger/40 hover:text-danger"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>

        {/* KPI strip mobile / tablet */}
        <div className="ops-topbar-kpis md:hidden flex gap-2 px-3 pb-2 overflow-x-auto">
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
