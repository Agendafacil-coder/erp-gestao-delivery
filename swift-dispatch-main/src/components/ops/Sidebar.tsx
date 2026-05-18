import { Activity, Map, ListOrdered, Bike, MessageCircle, BarChart3, Brain, Wallet, Settings, Zap, Kanban } from "lucide-react";
import { Link, useLocation } from "@tanstack/react-router";
import { useI18n } from "@/hooks/useI18n";

export function OpsSidebar() {
  const { t } = useI18n();

  const items: { icon: any; label: string; key: "central" | "kanban" | "mapa" | "pedidos" | "entregadores" | "iaOps" | "whatsapp" | "analytics" | "financeiro" | "configs"; to?: string; soon?: boolean }[] = [
    { icon: Activity, label: t("nav", "central"), key: "central", to: "/central" },
    { icon: Kanban, label: t("nav", "kanban"), key: "kanban", to: "/kanban" },
    { icon: Map, label: t("nav", "mapa"), key: "mapa", to: "/mapa" },
    { icon: ListOrdered, label: t("nav", "pedidos"), key: "pedidos", soon: true },
    { icon: Bike, label: t("nav", "entregadores"), key: "entregadores", soon: true },
    { icon: Brain, label: t("nav", "iaOps"), key: "iaOps", soon: true },
    { icon: MessageCircle, label: t("nav", "whatsapp"), key: "whatsapp", soon: true },
    { icon: BarChart3, label: t("nav", "analytics"), key: "analytics", soon: true },
    { icon: Wallet, label: t("nav", "financeiro"), key: "financeiro", soon: true },
    { icon: Settings, label: t("nav", "configs"), key: "configs", soon: true },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-[72px] xl:w-60 shrink-0 border-r border-border glass-strong">
      <div className="h-16 flex items-center gap-3 px-4 border-b border-border">
        <div className="size-9 rounded-xl flex items-center justify-center" style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}>
          <Zap className="size-5 text-primary-foreground" strokeWidth={2.5} />
        </div>
        <div className="hidden xl:block">
          <div className="font-display font-semibold leading-none">Delivery OS</div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Ops Tower</div>
        </div>
      </div>
      <SidebarNav items={items} />
      <div className="p-3 border-t border-border hidden xl:block">
        <div className="glass rounded-lg p-3">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {t("common", "realtime")}
          </div>
          <div className="text-sm font-medium mt-1">Loja Pinheiros</div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-success">
            <span className="size-1.5 rounded-full bg-success pulse-dot" />
            {t("common", "activeShift")}
          </div>
        </div>
      </div>
    </aside>
  );
}

function SidebarNav({ items }: { items: any[] }) {
  const location = useLocation();
  const { t } = useI18n();

  return (
    <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
      {items.map((it) => {
        const active = !!it.to && location.pathname.startsWith(it.to);
        const Inner = (
          <>
            <it.icon className="size-4 shrink-0" />
            <span className="hidden xl:inline flex-1 text-left">{it.label}</span>
            {it.soon && <span className="hidden xl:inline text-[9px] uppercase tracking-widest text-muted-foreground/60">{t("common", "soon")}</span>}
          </>
        );
        const cls = `w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
          active
            ? "bg-primary/15 text-foreground border border-primary/30 shadow-[inset_0_1px_0_0_oklch(1_0_0/0.08)] font-medium"
            : "text-muted-foreground hover:text-foreground hover:bg-surface-elevated"
        } ${it.soon ? "opacity-60 cursor-not-allowed" : ""}`;
        return it.to && !it.soon ? (
          <Link key={it.label} to={it.to} className={cls}>{Inner}</Link>
        ) : (
          <div key={it.label} className={cls} aria-disabled={it.soon}>{Inner}</div>
        );
      })}
    </nav>
  );
}
