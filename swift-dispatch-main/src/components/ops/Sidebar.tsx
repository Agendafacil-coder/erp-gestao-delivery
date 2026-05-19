import { Activity, Map, ListOrdered, Bike, MessageCircle, BarChart3, Brain, Wallet, Settings, Zap, Kanban, Flame, Compass, History } from "lucide-react";
import { Link, useLocation } from "@tanstack/react-router";
import { useI18n } from "@/hooks/useI18n";
import { useRole } from "@/hooks/useRole";
import { canAccessNav, type NavKey } from "@/lib/roles";

export function OpsSidebar() {
  const { t } = useI18n();
  const { role } = useRole();

  const allItems: Array<{
    icon: typeof Activity;
    label: string;
    key: NavKey;
    to: string;
    soon?: boolean;
  }> = [
    { icon: Activity, label: t("nav", "central") || "Central", key: "central", to: "/central" },
    { icon: Kanban, label: t("nav", "kanban") || "Kanban", key: "kanban", to: "/kanban" },
    { icon: Map, label: t("nav", "mapa") || "Mapa Live", key: "mapa", to: "/mapa" },
    { icon: Flame, label: "Cozinha KDS", key: "kds", to: "/kds" },
    { icon: Compass, label: "Rastreio Cliente", key: "tracking", to: "/tracking" },
    { icon: Bike, label: "PWA Entregador", key: "entregador", to: "/entregador" },
    { icon: MessageCircle, label: "WhatsApp Hub", key: "whatsapp", to: "/whatsapp" },
    { icon: BarChart3, label: "Analytics & SLA", key: "analytics", to: "/analytics" },
    { icon: Wallet, label: "Financeiro Ops", key: "financeiro", to: "/financeiro" },
    { icon: Zap, label: "Automações IA", key: "automacoes", to: "/automacoes" },
    { icon: History, label: "Auditoria Log", key: "auditoria", to: "/auditoria" },
    { icon: Settings, label: t("nav", "configs") || "Configurações", key: "configs", soon: true },
  ];

  const items = allItems.filter((it) => canAccessNav(role, it.key));

  return (
    <aside className="hidden lg:flex flex-col w-[72px] xl:w-64 shrink-0 border-r border-border/80 bg-surface/95 backdrop-blur-xl">
      <div className="h-16 flex items-center gap-3 px-4 border-b border-border">
        <div className="size-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-primary to-accent shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]">
          <Zap className="size-5 text-primary-foreground" strokeWidth={2.5} />
        </div>
        <div className="hidden xl:block">
          <div className="font-display font-semibold leading-none text-foreground tracking-wide">Delivery OS</div>
          <div className="text-xs text-muted-foreground mt-0.5">Central operacional</div>
        </div>
      </div>
      <SidebarNav items={items} />
      <div className="p-3 border-t border-border hidden xl:block">
        <div className="glass rounded-xl p-3">
          <div className="text-xs text-muted-foreground">
            {t("common", "realtime") || "Tempo real"}
          </div>
          <div className="text-sm font-medium mt-1 text-foreground">Loja Pinheiros</div>
          <div className="flex items-center gap-2 mt-2 text-xs text-success">
            <span className="relative size-2 rounded-full bg-success">
              <span className="absolute inset-0 rounded-full bg-success live-dot" />
            </span>
            {t("common", "activeShift") || "Operação ativa"}
          </div>
        </div>
      </div>
    </aside>
  );
}

function SidebarNav({ items }: { items: any[] }) {
  const location = useLocation();

  return (
    <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
      {items.map((it) => {
        const active = !!it.to && location.pathname.startsWith(it.to);
        const Inner = (
          <>
            <it.icon className={`size-4 shrink-0 transition-transform duration-300 ${active ? "scale-110 text-primary-glow" : "text-muted-foreground group-hover:text-foreground"}`} />
            <span className="hidden xl:inline flex-1 text-left">{it.label}</span>
            {it.soon && <span className="hidden xl:inline text-[9px] uppercase tracking-widest text-muted-foreground/60">breve</span>}
          </>
        );
        const cls = `w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ease-out group cursor-pointer ${
          active
            ? "bg-primary/12 text-foreground border border-primary/20 shadow-[0_0_20px_rgba(var(--primary-rgb),0.12)] font-medium"
            : "text-muted-foreground hover:text-foreground hover:bg-surface-elevated/50 border border-transparent"
        } ${it.soon ? "opacity-45 cursor-not-allowed" : ""}`;
        return it.to && !it.soon ? (
          <Link key={it.label} to={it.to} className={cls}>{Inner}</Link>
        ) : (
          <div key={it.label} className={cls} aria-disabled={it.soon}>{Inner}</div>
        );
      })}
    </nav>
  );
}
