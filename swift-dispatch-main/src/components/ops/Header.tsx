import { Bell, Command, LogOut, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "@tanstack/react-router";
import { useI18n } from "@/hooks/useI18n";

export function OpsHeader({ tick }: { tick: number }) {
  const [now, setNow] = useState<string>("--:--:--");
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { t, locale, setLocale } = useI18n();

  useEffect(() => {
    const fmt = () =>
      new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setNow(fmt());
    const id = setInterval(() => setNow(fmt()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="h-16 border-b border-border glass-strong flex items-center gap-4 px-6 sticky top-0 z-30">
      <div className="flex items-center gap-2">
        <span className="size-2 rounded-full bg-success pulse-dot" />
        <span className="text-xs uppercase tracking-widest text-muted-foreground">
          {t("common", "realtime")}
        </span>
        <span className="font-mono text-xs text-foreground/80 ml-2">{now}</span>
      </div>
      <div className="flex-1 max-w-md mx-auto">
        <div className="relative">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder={t("common", "searchPlaceholder")}
            className="w-full h-9 bg-surface/60 border border-border rounded-lg pl-9 pr-16 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition"
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            <Command className="size-3" /> K
          </kbd>
        </div>
      </div>

      {/* Modern Dynamic Language Selector Dropbar */}
      <div className="flex items-center gap-1 p-0.5 rounded-lg border border-border bg-surface/40">
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
            {lang === "pt-BR" ? "PT 🇧🇷" : lang === "en" ? "EN 🇺🇸" : "ES 🇪🇸"}
          </button>
        ))}
      </div>

      <button className="relative size-9 rounded-lg border border-border hover:border-border-strong flex items-center justify-center cursor-pointer">
        <Bell className="size-4" />
        <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-danger pulse-dot" />
      </button>
      <div className="flex items-center gap-3 pl-3 border-l border-border">
        <div className="text-right hidden sm:block">
          <div className="text-xs font-medium leading-none truncate max-w-[140px]">
            {user?.user_metadata?.full_name || user?.email || t("common", "operator")}
          </div>
          <div className="text-[10px] text-muted-foreground mt-1">
            Dispatcher · {t("common", "activeShift").toLowerCase()}
          </div>
        </div>
        <div className="size-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-semibold uppercase">
          {(user?.email || "OP").slice(0, 2)}
        </div>
        <button
          onClick={async () => { await signOut(); navigate({ to: "/login" }); }}
          title={t("common", "logout")}
          className="size-9 rounded-lg border border-border hover:border-border-strong flex items-center justify-center text-muted-foreground hover:text-foreground transition cursor-pointer"
        >
          <LogOut className="size-4" />
        </button>
      </div>
      <span className="sr-only">tick {tick}</span>
    </header>
  );
}
