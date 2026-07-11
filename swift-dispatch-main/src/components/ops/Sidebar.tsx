import {
  Activity,
  Bike,
  Wallet,
  Settings2,
  Kanban,
  Flame,
  Compass,
  UtensilsCrossed,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { Link, useLocation } from "@tanstack/react-router";
import { useI18n } from "@/hooks/useI18n";
import { useAuthAccess } from "@/hooks/useAuthAccess";
import { useTenant } from "@/hooks/useTenant";
import { UnitSelector } from "@/components/ops/UnitSelector";
import { useOpsLayout } from "@/hooks/useOpsLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import { canAccessGestao } from "@/lib/gestao/sections";
import { canAccessSistema } from "@/lib/sistema/sections";
import { canAccessNav, type NavKey } from "@/lib/roles";
import { BrandLogo } from "@/components/brand/BrandLogo";
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
  { icon: UtensilsCrossed, key: "cardapio", to: "/cardapio" },
  { icon: Users, key: "clientes", to: "/clientes" },
  { icon: Wallet, key: "financeiro", to: "/financeiro" },
  { icon: Settings2, key: "sistema", to: "/sistema" },
];

const NAV_GROUPS: { labelKey: "groupOperacao" | "groupGestao" | "groupSistema"; keys: NavKey[] }[] = [
  {
    labelKey: "groupOperacao",
    keys: ["central", "kanban", "kds", "tracking", "entregador"],
  },
  {
    labelKey: "groupGestao",
    keys: ["cardapio", "clientes", "financeiro"],
  },
  {
    labelKey: "groupSistema",
    keys: ["sistema"],
  },
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
            className="ops-sidebar-sheet w-[min(100vw-3rem,17.5rem)] border-r-0 p-0"
          >
            <SheetTitle className="sr-only">Menu Delivery OS</SheetTitle>
            <SidebarPanel drawer onClose={() => setMobileNavOpen(false)} />
          </SheetContent>
        </Sheet>
      ) : null}
    </>
  );
}

function SidebarPanel({ drawer, onClose }: { drawer?: boolean; onClose?: () => void }) {
  const { t } = useI18n();
  const { role } = useAuthAccess();
  const { current } = useTenant();
  const items = NAV_ITEMS.filter((it) => {
    if (it.key === "financeiro") return canAccessGestao(role);
    if (it.key === "sistema") return canAccessSistema(role);
    return canAccessNav(role, it.key);
  });
  const itemByKey = Object.fromEntries(items.map((it) => [it.key, it])) as Partial<
    Record<NavKey, (typeof NAV_ITEMS)[number]>
  >;

  return (
    <div className="flex h-full flex-col bg-[var(--color-sidebar)]">
      <div className="ops-sidebar-brand">
        <BrandLogo
          size="sm"
          showTagline
          tagline={current?.name ?? t("nav", "sidebarTagline")}
          className="flex-1 min-w-0"
        />
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
        {NAV_GROUPS.map((group) => {
          const groupItems = group.keys
            .map((key) => itemByKey[key])
            .filter((it): it is (typeof NAV_ITEMS)[number] => Boolean(it));
          if (!groupItems.length) return null;

          return (
            <div key={group.labelKey} className="ops-sidebar-group">
              <div className="ops-sidebar-group-label">{t("nav", group.labelKey)}</div>
              {groupItems.map((it) => (
                <SidebarLink key={it.key} item={it} label={t("nav", it.key)} onNavigate={onClose} />
              ))}
            </div>
          );
        })}
      </nav>

      <div className="ops-sidebar-footer">
        <UnitSelector compact />
        <div className="mt-3 flex items-center gap-2 text-[11px] font-medium text-success">
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
  const active =
    location.pathname === item.to ||
    location.pathname.startsWith(`${item.to}/`) ||
    (item.key === "sistema" &&
      (location.pathname === "/whatsapp" ||
        location.pathname.startsWith("/whatsapp/") ||
        location.pathname === "/automacoes" ||
        location.pathname.startsWith("/automacoes/") ||
        location.pathname === "/auditoria" ||
        location.pathname.startsWith("/auditoria/") ||
        location.pathname === "/configs" ||
        location.pathname.startsWith("/configs/")));
  const Icon = item.icon;

  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      className={cn("ops-sidebar-link", active && "ops-sidebar-link--active")}
      aria-current={active ? "page" : undefined}
    >
      <span className="ops-sidebar-link-icon" aria-hidden>
        <Icon className="size-4" strokeWidth={2} />
      </span>
      <span className="truncate">{label}</span>
    </Link>
  );
}
