import { Activity, Map, Bike, MessageCircle, BarChart3, Wallet, Settings, Kanban, Flame, Compass, History, UtensilsCrossed, Zap } from "lucide-react";
import { Link, useLocation } from "@tanstack/react-router";
import { useI18n } from "@/hooks/useI18n";
import { useRole } from "@/hooks/useRole";
import { useTenant } from "@/hooks/useTenant";
import { canAccessNav, type NavKey } from "@/lib/roles";

export function OpsSidebar() {
  const { t } = useI18n();
  const { role } = useRole();
  const { current } = useTenant();

  const allItems: Array<{
    icon: typeof Activity;
    key: NavKey;
    to: string;
    soon?: boolean;
  }> = [
    { icon: Activity, key: "central", to: "/central" },
    { icon: Kanban, key: "kanban", to: "/kanban" },
    { icon: Flame, key: "kds", to: "/kds" },
    { icon: Compass, key: "tracking", to: "/tracking" },
    { icon: Bike, key: "entregador", to: "/entregador" },
    { icon: Map, key: "mapa", to: "/mapa" },
    { icon: MessageCircle, key: "whatsapp", to: "/whatsapp" },
    { icon: BarChart3, key: "analytics", to: "/analytics" },
    { icon: Zap, key: "automacoes", to: "/automacoes" },
    { icon: History, key: "auditoria", to: "/auditoria" },
    { icon: UtensilsCrossed, key: "cardapio", to: "/cardapio" },
    { icon: Wallet, key: "financeiro", to: "/financeiro" },
    { icon: Settings, key: "configs", to: "/configs" },
  ];

  const items = allItems.filter((it) => canAccessNav(role, it.key));

  return (
    <aside className="hidden lg:flex flex-col w-[72px] xl:w-60 shrink-0 border-r border-border bg-sidebar">
      <div className="h-14 flex items-center gap-3 px-4 border-b border-border">
        <div className="size-8 rounded-lg flex items-center justify-center bg-primary text-primary-foreground shrink-0">
          <Zap className="size-4" strokeWidth={2.5} />
        </div>
        <div className="hidden xl:block min-w-0">
          <div className="font-semibold text-sm leading-none text-foreground truncate">Delivery OS</div>
          <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{t("nav", "sidebarTagline")}</div>
        </div>
      </div>
      <SidebarNav items={items} labelFor={(key) => t("nav", key)} />
      <div className="p-3 border-t border-border hidden xl:block">
        <div className="rounded-lg border border-border bg-muted/40 p-3">
          <div className="text-[11px] text-muted-foreground">{t("common", "realtime")}</div>
          <div className="text-sm font-medium mt-1 text-foreground truncate">
            {current?.name ?? "Sem operação"}
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs text-success">
            <span className="relative size-2 rounded-full bg-success">
              <span className="absolute inset-0 rounded-full bg-success live-dot" />
            </span>
            {t("common", "activeShift")}
          </div>
        </div>
      </div>
    </aside>
  );
}

function SidebarNav({
  items,
  labelFor,
}: {
  items: Array<{ icon: typeof Activity; key: NavKey; to: string; soon?: boolean }>;
  labelFor: (key: NavKey) => string;
}) {
  const location = useLocation();

  return (
    <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
      {items.map((it) => {
        const active = !!it.to && location.pathname.startsWith(it.to);
        const label = labelFor(it.key);
        const cls = `w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors group ${
          active
            ? "bg-sidebar-active text-primary font-medium"
            : "text-sidebar-foreground hover:bg-muted/60 hover:text-foreground"
        } ${it.soon ? "opacity-45 cursor-not-allowed" : ""}`;
        const inner = (
          <>
            <it.icon className={`size-4 shrink-0 ${active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
            <span className="hidden xl:inline flex-1 text-left truncate">{label}</span>
          </>
        );
        return it.to && !it.soon ? (
          <Link key={it.key} to={it.to} className={cls}>{inner}</Link>
        ) : (
          <div key={it.key} className={cls} aria-disabled={it.soon}>{inner}</div>
        );
      })}
    </nav>
  );
}
