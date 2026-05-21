import {
  Bell,
  LogOut,
  Monitor,
  ShieldCheck,
  AlertOctagon,
  Activity,
  Info,
} from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { useI18n } from "@/hooks/useI18n";
import { useOps } from "@/hooks/useOps";
import { useUnitView } from "@/hooks/useUnitView";
import { computeOperationalStats } from "@/lib/ops/operationalStats";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/ops/ThemeToggle";

export function OpsHeader({ tick }: { tick: number }) {
  const [now, setNow] = useState<string>("--:--:--");
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { locale, setLocale } = useI18n();
  const { orders, drivers } = useOps();
  const { units, unitId, setUnitId } = useUnitView();
  const [isTvMode, setIsTvMode] = useState(false);

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

  const setSidebarVisible = (visible: boolean) => {
    const sidebar = document.querySelector("aside");
    const footer = document.querySelector("footer");
    if (visible) {
      sidebar?.classList.remove("hidden");
      sidebar?.classList.add("lg:flex");
      footer?.classList.remove("hidden");
    } else {
      sidebar?.classList.add("hidden");
      sidebar?.classList.remove("lg:flex");
      footer?.classList.add("hidden");
    }
  };

  const toggleTvMode = () => {
    const nextVal = !isTvMode;
    setIsTvMode(nextVal);
    setSidebarVisible(!nextVal);
    if (nextVal) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  // Restaura menu ao trocar de rota ou sair da tela (evita sidebar sumir no Kanban/KDS)
  useEffect(() => {
    setIsTvMode(false);
    setSidebarVisible(true);
  }, [location.pathname]);

  useEffect(() => {
    return () => {
      setSidebarVisible(true);
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      }
    };
  }, []);

  return (
    <TooltipProvider delayDuration={200}>
      <header className="h-14 border-b border-border bg-sidebar flex items-center justify-between gap-3 px-4 lg:px-6 sticky top-0 z-30">
        <div className="flex items-center gap-3 shrink-0 min-w-0">
          <select
            value={unitId}
            onChange={(e) => setUnitId(e.target.value)}
            className="max-w-[200px] truncate bg-background border border-border rounded-lg text-sm text-foreground px-3 py-2 cursor-pointer outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            aria-label="Unidade ou região"
          >
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label}
              </option>
            ))}
          </select>

          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium shrink-0 ${stats.statusTone}`}
          >
            {stats.systemStatus === "saudavel" ? (
              <ShieldCheck className="size-3.5 shrink-0" />
            ) : stats.systemStatus === "critico" ? (
              <AlertOctagon className="size-3.5 shrink-0" />
            ) : (
              <Activity className="size-3.5 shrink-0" />
            )}
            <span className="hidden sm:inline">{stats.statusLabel}</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="rounded-full p-0.5 opacity-80 hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Por que este status?"
                >
                  <Info className="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className="max-w-xs bg-popover text-popover-foreground border border-border p-3 text-left"
              >
                <p className="font-medium text-sm mb-1.5">{stats.healthSummary}</p>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                  {stats.healthReasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </TooltipContent>
            </Tooltip>
          </div>

          <span className="text-xs text-muted-foreground hidden md:inline bg-muted/50 px-2 py-1 rounded-md border border-border shrink-0 tabular-nums">
            {now}
          </span>
        </div>

        <div className="hidden lg:flex items-center gap-2 flex-1 justify-center max-w-md">
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

        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle />
          <button
            type="button"
            onClick={toggleTvMode}
            title="Modo TV / tela cheia"
            className={`size-9 rounded-lg border flex items-center justify-center transition-all ${
              isTvMode
                ? "bg-primary/20 border-primary text-primary-glow"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <Monitor className="size-4" />
          </button>

          <div className="hidden sm:flex items-center gap-0.5 p-0.5 rounded-lg border border-border bg-surface/40">
            {(["pt-BR", "en", "es"] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setLocale(lang)}
                title={
                  lang === locale
                    ? "Idioma padrão salvo neste navegador"
                    : `Usar ${lang === "pt-BR" ? "português" : lang === "en" ? "inglês" : "espanhol"}`
                }
                className={`text-[10px] px-2 py-1 rounded-md transition-all font-medium ${
                  locale === lang
                    ? "bg-primary/15 text-primary-glow border border-primary/25"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {lang === "pt-BR" ? "PT" : lang === "en" ? "EN" : "ES"}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="relative size-9 rounded-lg border border-border hover:border-border-strong flex items-center justify-center"
            aria-label="Notificações"
          >
            <Bell className="size-4" />
            {stats.delayedCount > 0 && (
              <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-danger" />
            )}
          </button>

          <div className="flex items-center gap-2 pl-2 border-l border-border">
            <div className="text-right hidden xl:block max-w-[120px]">
              <div className="text-xs font-semibold truncate">
                {user?.user_metadata?.full_name || user?.email || "Operador"}
              </div>
            </div>
            <div className="size-9 rounded-full bg-primary flex items-center justify-center text-xs font-bold uppercase text-primary-foreground">
              {(user?.email || "OP").slice(0, 2)}
            </div>
            <button
              type="button"
              onClick={async () => {
                await signOut();
                navigate({ to: "/login" });
              }}
              title="Sair"
              className="size-9 rounded-lg border border-border hover:border-danger/40 hover:text-danger flex items-center justify-center text-muted-foreground"
            >
              <LogOut className="size-4" />
            </button>
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
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`px-3 py-1.5 rounded-lg border flex flex-col items-center min-w-[72px] transition-colors ${
        highlight
          ? "border-danger/30 bg-danger/5"
          : "border-border bg-muted/30 hover:bg-muted/50"
      }`}
    >
      <span className="text-[11px] text-muted-foreground leading-none">{label}</span>
      <span
        className={`text-sm font-bold font-mono mt-0.5 leading-none ${
          highlight ? "text-danger" : "text-foreground"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
