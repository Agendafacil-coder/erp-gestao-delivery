import {
  Activity,
  Map,
  Bike,
  MessageCircle,
  BarChart3,
  FileBarChart,
  Wallet,
  Settings,
  Kanban,
  Flame,
  Compass,
  History,
  UtensilsCrossed,
  Zap,
  X,
  type LucideIcon,
} from "lucide-react";
import { Link, useLocation } from "@tanstack/react-router";
import { useI18n } from "@/hooks/useI18n";
import { useAuthAccess } from "@/hooks/useAuthAccess";
import { UnitSelector } from "@/components/ops/UnitSelector";
import { useOpsLayout } from "@/hooks/useOpsLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import { canAccessNav, type NavKey } from "@/lib/roles";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const NAV_ITEMS: Array<{
  icon: LucideIcon;
  key: NavKey;
  to: string;
}> = [
  { icon: Activity, key: "central", to: "/central" },
  { icon: Kanban, key: "kanban", to: "/kanban" },
  { icon: Flame, key: "kds", to: "/kds" },
  { icon: Compass, key: "tracking", to: "/tracking" },
  { icon: Bike, key: "entregador", to: "/entregador" },
  { icon: Map, key: "mapa", to: "/mapa" },
  { icon: MessageCircle, key: "whatsapp", to: "/whatsapp" },
  { icon: BarChart3, key: "analytics", to: "/analytics" },
  { icon: FileBarChart, key: "relatorios", to: "/relatorios" },
  { icon: Zap, key: "automacoes", to: "/automacoes" },
  { icon: History, key: "auditoria", to: "/auditoria" },
  { icon: UtensilsCrossed, key: "cardapio", to: "/cardapio" },
  { icon: Wallet, key: "financeiro", to: "/financeiro" },
  { icon: Settings, key: "configs", to: "/configs" },
];

export function OpsSidebar() {
  const isMobile = useIsMobile();
  const { mobileNavOpen, setMobileNavOpen } = useOpsLayout();

  return (
    <>
      <aside className="ops-sidebar hidden md:flex" aria-label="Menu principal">
        <SidebarPanel />
      </aside>

      {isMobile ? (
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent
            side="left"
            showClose={false}
            className="ops-sidebar-sheet w-[min(100vw-3rem,18rem)] p-0 border-r"
          >
            <SheetTitle className="sr-only">Menu Delivery OS</SheetTitle>
            <SidebarPanel
              drawer
              onClose={() => setMobileNavOpen(false)}
            />
          </SheetContent>
        </Sheet>
      ) : null}
    </>
  );
}

function SidebarPanel({
  drawer,
  onClose,
}: {
  drawer?: boolean;
  onClose?: () => void;
}) {
  const { t } = useI18n();
  const { role } = useAuthAccess();
  const items = NAV_ITEMS.filter((it) => canAccessNav(role, it.key));

  return (
    <div className="flex h-full flex-col">
      <div className="ops-sidebar-brand">
        <div className="ops-sidebar-logo">
          <Zap className="size-[18px] text-primary-foreground" strokeWidth={2.5} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display font-semibold text-sm text-foreground leading-none tracking-tight">
            Delivery OS
          </div>
          <div className="text-[11px] text-muted-foreground mt-1 truncate">
            {t("nav", "sidebarTagline")}
          </div>
        </div>
        {drawer && onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="ops-icon-btn size-9 shrink-0"
            aria-label="Fechar menu"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      <nav className="ops-sidebar-nav flex-1 overflow-y-auto" aria-label="Navegação">
        {items.map((it) => (
          <SidebarLink
            key={it.key}
            item={it}
            label={t("nav", it.key)}
            onNavigate={onClose}
          />
        ))}
      </nav>

      <div className="ops-sidebar-footer">
        <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {t("common", "realtime")}
        </div>
        <UnitSelector compact />
        <div className="flex items-center gap-2 mt-2 text-xs text-success font-medium">
          <span className="relative size-2 rounded-full bg-success shrink-0">
            <span className="absolute inset-0 rounded-full bg-success live-dot" />
          </span>
          {t("common", "activeShift")}
        </div>
      </div>
    </div>
  );
}

function SidebarLink({
  item,
  label,
  onNavigate,
}: {
  item: (typeof NAV_ITEMS)[number];
  label: string;
  onNavigate?: () => void;
}) {
  const location = useLocation();
  const active = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
  const Icon = item.icon;

  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      className={cn("ops-sidebar-link min-h-[2.75rem] md:min-h-0", active && "ops-sidebar-link--active")}
      aria-current={active ? "page" : undefined}
    >
      <Icon className="size-[18px] shrink-0" aria-hidden />
      <span className="truncate">{label}</span>
    </Link>
  );
}
