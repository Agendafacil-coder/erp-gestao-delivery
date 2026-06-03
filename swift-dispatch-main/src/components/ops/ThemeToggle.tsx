import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

type ThemeToggleProps = {
  className?: string;
};

export function ThemeToggle({ className = "ops-icon-btn" }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={theme === "light" ? "Ativar modo escuro" : "Ativar modo claro"}
      aria-label={theme === "light" ? "Ativar modo escuro" : "Ativar modo claro"}
      className={className}
    >
      {theme === "light" ? <Moon className="size-4" /> : <Sun className="size-4" />}
    </button>
  );
}
