import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={theme === "light" ? "Ativar modo escuro" : "Ativar modo claro"}
      aria-label={theme === "light" ? "Ativar modo escuro" : "Ativar modo claro"}
      className="size-9 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center justify-center transition-colors"
    >
      {theme === "light" ? <Moon className="size-4" /> : <Sun className="size-4" />}
    </button>
  );
}
