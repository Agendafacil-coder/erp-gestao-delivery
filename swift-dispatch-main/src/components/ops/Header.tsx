import { Bell, Command, LogOut, Search, Activity, Bike, Timer, Flame, DollarSign, ActivitySquare, ShieldCheck, AlertOctagon, Monitor } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "@tanstack/react-router";
import { useI18n } from "@/hooks/useI18n";
import { useOps } from "@/hooks/useOps";
import { fmtBRL } from "@/lib/ops/mock";
import { toast } from "sonner";

export function OpsHeader({ tick }: { tick: number }) {
  const [now, setNow] = useState<string>("--:--:--");
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { t, locale, setLocale } = useI18n();
  const { orders, drivers } = useOps();
  const [isTvMode, setIsTvMode] = useState(false);

  useEffect(() => {
    const fmt = () =>
      new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setNow(fmt());
    const id = setInterval(() => setNow(fmt()), 1000);
    return () => clearInterval(id);
  }, []);

  // TV Mode Toggle logic: Hides main sidebars for full-screen dash
  const toggleTvMode = () => {
    const nextVal = !isTvMode;
    setIsTvMode(nextVal);
    const sidebar = document.querySelector("aside");
    const footer = document.querySelector("footer");
    if (nextVal) {
      sidebar?.classList.add("hidden");
      sidebar?.classList.remove("lg:flex");
      footer?.classList.add("hidden");
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      sidebar?.classList.remove("hidden");
      sidebar?.classList.add("lg:flex");
      footer?.classList.remove("hidden");
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      }
    }
  };

  // Telemetry Calculations
  const stats = useMemo(() => {
    const active = orders.filter((o) => o.status !== "entregue" && o.status !== "cancelado");
    const online = drivers.filter((d) => d.status === "disponivel" || d.status === "em_rota" || d.status === "ocioso");
    const critical = active.filter((o) => o.priority === "critica" || o.priority === "alta");
    
    let deliveredRevenue = 0;
    let delayedCount = 0;
    
    orders.forEach((o) => {
      if (o.status === "entregue") {
        deliveredRevenue += Number(o.total_amount ?? 0);
      } else if (o.status !== "cancelado") {
        const placed = new Date(o.placed_at).getTime();
        const elapsed = Math.max(0, Math.floor((Date.now() - placed) / 60000));
        if (elapsed > (o.sla_minutes ?? 40)) {
          delayedCount++;
        }
      }
    });

    // Operational Status determination
    let systemStatus: "saudavel" | "atencao" | "critico" = "saudavel";
    let statusLabel = "SAUDÁVEL";
    let statusTone = "text-success border-success/30 bg-success/10 shadow-success/10";
    
    if (delayedCount > 3 || critical.length > 2) {
      systemStatus = "critico";
      statusLabel = "GARGALO OPERACIONAL";
      statusTone = "text-danger border-danger/40 bg-danger/15 shadow-danger/20 animate-pulse";
    } else if (delayedCount > 1 || critical.length > 0) {
      systemStatus = "atencao";
      statusLabel = "ATENÇÃO SISTEMA";
      statusTone = "text-warning border-warning/35 bg-warning/10 shadow-warning/10";
    }

    const totalActive = active.length;
    const efficiency = totalActive > 0 
      ? Math.max(70, +(100 - (delayedCount / totalActive) * 100).toFixed(1)) 
      : 98.5;

    const avgSlaLeft = totalActive > 0
      ? Math.round(active.reduce((acc, curr) => {
          const elapsed = Math.max(0, Math.floor((Date.now() - new Date(curr.placed_at).getTime()) / 60000));
          return acc + Math.max(0, 100 - (elapsed / curr.sla_minutes) * 100);
        }, 0) / totalActive)
      : 94;

    const avgEta = totalActive > 0 ? Math.round(24 + (delayedCount * 3) - (online.length * 0.4)) : 24;

    return {
      activeCount: totalActive,
      onlineCount: online.length,
      totalDrivers: drivers.length,
      criticalCount: critical.length,
      avgEta,
      efficiency,
      avgSlaLeft,
      revenue: deliveredRevenue || 1240,
      systemStatus,
      statusLabel,
      statusTone,
    };
  }, [orders, drivers, tick]);

  return (
    <header className="h-20 border-b border-border glass-strong flex items-center justify-between gap-4 px-6 sticky top-0 z-30 transition-all duration-300">
      
      {/* Left section: Realtime Operations status & Franchise Switcher */}
      <div className="flex items-center gap-4 shrink-0">
        {/* Multi-unit Switcher */}
        <div className="relative">
          <select
            onChange={(e) => {
              toast.success(`Unidade alterada para: ${e.target.value}. Calibrando buffer de IA...`, { icon: "🏢" });
            }}
            className="bg-[#0f1219] border border-border rounded-lg text-white font-mono text-[10px] font-bold px-2.5 py-1.5 cursor-pointer outline-none focus:border-primary-glow"
          >
            <option value="Painel Consolidado">🏢 Consolidado (3 lojas)</option>
            <option value="Unidade Pinheiros">📍 Pinheiros (HQ)</option>
            <option value="Unidade Moema">📍 Moema</option>
            <option value="Unidade Itaim Bibi">📍 Itaim Bibi</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
          </span>
          <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-muted-foreground hidden xl:inline">
            REALTIME ENGINE
          </span>
        </div>
        
        {/* Dynamic Global Status Indicator */}
        <div className={`px-2.5 py-1 rounded-md border text-[10px] font-mono font-bold tracking-wider flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(0,0,0,0.2)] ${stats.statusTone}`}>
          {stats.systemStatus === "saudavel" ? (
            <ShieldCheck className="size-3.5" />
          ) : stats.systemStatus === "critico" ? (
            <AlertOctagon className="size-3.5 animate-bounce" />
          ) : (
            <Activity className="size-3.5" />
          )}
          {stats.statusLabel}
        </div>
        <span className="font-mono text-xs text-foreground/80 font-semibold hidden md:inline bg-surface/50 px-2 py-0.5 rounded border border-border">{now}</span>
      </div>

      {/* Middle section: Cockpit Telemetry strip of Realtime Counters */}
      <div className="hidden lg:flex items-center gap-2 flex-1 max-w-4xl justify-center">
        
        {/* KPI: Pedidos Ativos */}
        <div className="px-3 py-1.5 rounded-lg border border-border bg-surface/40 flex flex-col items-center min-w-[76px] transition-all hover:bg-surface-elevated/40 relative overflow-hidden group">
          <div className="absolute inset-x-0 top-0 h-[2px] bg-primary/40 opacity-0 group-hover:opacity-100 transition" />
          <span className="text-[8px] uppercase tracking-wider text-muted-foreground leading-none font-bold">ATIVOS</span>
          <span className="text-sm font-bold font-mono text-foreground mt-0.5 leading-none transition duration-500 scale-100 group-hover:scale-105">{stats.activeCount}</span>
        </div>

        {/* KPI: Drivers */}
        <div className="px-3 py-1.5 rounded-lg border border-border bg-surface/40 flex flex-col items-center min-w-[76px] transition-all hover:bg-surface-elevated/40 relative overflow-hidden group">
          <div className="absolute inset-x-0 top-0 h-[2px] bg-primary-glow/40 opacity-0 group-hover:opacity-100 transition" />
          <span className="text-[8px] uppercase tracking-wider text-muted-foreground leading-none font-bold">DRIVERS</span>
          <span className="text-sm font-bold font-mono text-primary-glow mt-0.5 leading-none">{stats.onlineCount}/{stats.totalDrivers}</span>
        </div>

        {/* KPI: Críticos */}
        <div className={`px-3 py-1.5 rounded-lg border flex flex-col items-center min-w-[76px] transition-all hover:bg-surface-elevated/40 relative overflow-hidden group ${
          stats.criticalCount > 0 ? "border-danger/35 bg-danger/5" : "border-border bg-surface/40"
        }`}>
          <div className="absolute inset-x-0 top-0 h-[2px] bg-danger/40 opacity-0 group-hover:opacity-100 transition" />
          <span className="text-[8px] uppercase tracking-wider text-muted-foreground leading-none font-bold">CRÍTICOS</span>
          <span className={`text-sm font-bold font-mono mt-0.5 leading-none ${
            stats.criticalCount > 0 ? "text-danger animate-pulse" : "text-foreground"
          }`}>{stats.criticalCount}</span>
        </div>

        {/* KPI: ETA Médio */}
        <div className="px-3 py-1.5 rounded-lg border border-border bg-surface/40 flex flex-col items-center min-w-[76px] transition-all hover:bg-surface-elevated/40 relative overflow-hidden group">
          <div className="absolute inset-x-0 top-0 h-[2px] bg-warning/40 opacity-0 group-hover:opacity-100 transition" />
          <span className="text-[8px] uppercase tracking-wider text-muted-foreground leading-none font-bold">ETA MÉDIO</span>
          <span className="text-sm font-bold font-mono text-warning mt-0.5 leading-none">{stats.avgEta}m</span>
        </div>

        {/* KPI: SLA Médio */}
        <div className="px-3 py-1.5 rounded-lg border border-border bg-surface/40 flex flex-col items-center min-w-[76px] transition-all hover:bg-surface-elevated/40 relative overflow-hidden group">
          <div className="absolute inset-x-0 top-0 h-[2px] bg-success/40 opacity-0 group-hover:opacity-100 transition" />
          <span className="text-[8px] uppercase tracking-wider text-muted-foreground leading-none font-bold">SLA MÉDIO</span>
          <span className="text-sm font-bold font-mono text-success mt-0.5 leading-none">{stats.avgSlaLeft}%</span>
        </div>

        {/* KPI: Eficiência */}
        <div className="px-3 py-1.5 rounded-lg border border-border bg-surface/40 flex flex-col items-center min-w-[76px] transition-all hover:bg-surface-elevated/40 relative overflow-hidden group">
          <span className="text-[8px] uppercase tracking-wider text-muted-foreground leading-none font-bold">EFICIÊNCIA</span>
          <span className="text-sm font-bold font-mono text-gradient mt-0.5 leading-none">{stats.efficiency}%</span>
        </div>

        {/* KPI: Faturamento Turno */}
        <div className="px-3 py-1.5 rounded-lg border border-border bg-surface/40 flex flex-col items-center min-w-[100px] transition-all hover:bg-surface-elevated/40 relative overflow-hidden group">
          <div className="absolute inset-x-0 top-0 h-[2px] bg-primary/40 opacity-0 group-hover:opacity-100 transition" />
          <span className="text-[8px] uppercase tracking-wider text-muted-foreground leading-none font-bold">FATURAMENTO</span>
          <span className="text-sm font-bold font-mono text-foreground mt-0.5 leading-none">{fmtBRL(stats.revenue)}</span>
        </div>

      </div>

      {/* Right section: Control Actions & Profile */}
      <div className="flex items-center gap-3 shrink-0">
        
        {/* Fullscreen TV Mode Toggle */}
        <button 
          onClick={toggleTvMode}
          title="Modo Fullscreen / TV Operacional"
          className={`size-9 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
            isTvMode ? "bg-primary/20 border-primary text-primary-glow shadow-glow" : "border-border hover:border-border-strong text-muted-foreground hover:text-foreground"
          }`}
        >
          <Monitor className="size-4" />
        </button>

        {/* Language selector */}
        <div className="hidden sm:flex items-center gap-1 p-0.5 rounded-lg border border-border bg-surface/40">
          {(["pt-BR", "en", "es"] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => setLocale(lang)}
              className={`text-[9px] uppercase tracking-wider px-2 py-1 rounded transition-all font-mono font-semibold cursor-pointer ${
                locale === lang 
                  ? "bg-primary/15 text-primary-glow border border-primary/20 font-bold" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {lang === "pt-BR" ? "PT" : lang === "en" ? "EN" : "ES"}
            </button>
          ))}
        </div>

        <button className="relative size-9 rounded-lg border border-border hover:border-border-strong flex items-center justify-center cursor-pointer">
          <Bell className="size-4" />
          <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-danger pulse-dot" />
        </button>

        <div className="flex items-center gap-3 pl-3 border-l border-border">
          <div className="text-right hidden xl:block">
            <div className="text-xs font-semibold leading-none truncate max-w-[120px]">
              {user?.user_metadata?.full_name || user?.email || t("common", "operator")}
            </div>
            <div className="text-[9px] text-muted-foreground mt-1 tracking-wider">
              DISPATCH TOWER
            </div>
          </div>
          <div className="size-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-bold uppercase border border-border">
            {(user?.email || "OP").slice(0, 2)}
          </div>
          <button
            onClick={async () => { await signOut(); navigate({ to: "/login" }); }}
            title={t("common", "logout")}
            className="size-9 rounded-lg border border-border hover:border-danger/40 hover:text-danger flex items-center justify-center text-muted-foreground transition cursor-pointer"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

