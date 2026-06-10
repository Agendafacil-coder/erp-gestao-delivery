import { LogOut } from "lucide-react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { useAuthAccess } from "@/hooks/useAuthAccess";
import { pathnameToNavKey, PROFILE_LABELS } from "@/lib/roles";
import { useI18n } from "@/hooks/useI18n";
import { ThemeToggle } from "@/components/ops/ThemeToggle";

/** Cabeçalho enxuto para Cozinha e Entregador (mobile e desktop). */
export function RestrictedHeader() {
  const { user, signOut } = useAuth();
  const { profile } = useAuthAccess();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();

  const navKey = pathnameToNavKey(location.pathname);
  const pageTitle =
    profile === "driver"
      ? "Entregas"
      : profile === "kitchen"
        ? t("nav", "kds")
        : navKey
          ? t("nav", navKey)
          : "Delivery OS";
  const profileLabel = profile ? PROFILE_LABELS[profile] : "Operação";

  return (
    <header className="ops-topbar sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="flex items-center justify-between gap-3 px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-foreground truncate leading-tight">
            {pageTitle}
          </div>
          <div className="text-[10px] text-muted-foreground truncate">
            {profileLabel}
            {user?.user_metadata?.full_name ? ` · ${user.user_metadata.full_name}` : ""}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <ThemeToggle />
          <button
            type="button"
            onClick={async () => {
              await signOut();
              navigate({ to: "/login" });
            }}
            title="Sair"
            className="ops-icon-btn hover:border-danger/40 hover:text-danger"
            aria-label="Sair"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
