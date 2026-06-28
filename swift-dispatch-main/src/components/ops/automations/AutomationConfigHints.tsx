import { Link } from "@tanstack/react-router";
import { AUTOMATION_CONFIG_HINTS } from "@/lib/ops/automationFlowSteps";

export function AutomationConfigHints() {
  return (
    <div className="erp-card p-4 text-xs text-muted-foreground space-y-2 min-w-0">
      <p className="font-semibold text-foreground">Onde configurar</p>
      <ul className="space-y-1.5">
        {AUTOMATION_CONFIG_HINTS.map((hint) => (
          <li key={hint.label} className="flex flex-wrap gap-x-1 leading-relaxed">
            <span className="text-foreground font-medium">{hint.label}:</span>
            {"to" in hint && hint.to ? (
              <Link
                to={hint.to}
                search={hint.search}
                className="text-primary hover:underline font-medium"
              >
                {hint.where}
              </Link>
            ) : (
              <span>{hint.where}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
