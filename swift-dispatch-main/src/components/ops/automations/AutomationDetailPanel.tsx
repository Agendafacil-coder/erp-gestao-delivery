import { LIVE_AUTOMATIONS } from "@/lib/ops/automationRegistry";
import { AUTOMATION_FLOW_STEPS } from "@/lib/ops/automationFlowSteps";
import { CheckCircle, Server } from "lucide-react";

type Props = {
  automationId: string;
  enabled: boolean;
};

export function AutomationDetailPanel({ automationId, enabled }: Props) {
  const rule = LIVE_AUTOMATIONS.find((r) => r.id === automationId) ?? LIVE_AUTOMATIONS[0];
  if (!rule) return null;

  const flow = AUTOMATION_FLOW_STEPS[rule.id] ?? [rule.description];

  return (
    <div className="erp-card p-5 space-y-4 min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">{rule.name}</h3>
          <p className="text-xs text-muted-foreground mt-1">{rule.description}</p>
        </div>
        <span
          className={`inline-flex items-center gap-1 text-[10px] font-semibold shrink-0 ${
            enabled ? "text-success" : "text-muted-foreground"
          }`}
        >
          <CheckCircle className="size-3.5" />
          {enabled ? "Ligada" : "Pausada"}
        </span>
      </div>

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Como funciona
        </p>
        <ol className="space-y-2">
          {flow.map((step, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
              <span className="shrink-0 size-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground border-t border-border/40 pt-3">
        {rule.schedule ? (
          <span>
            <strong className="text-foreground font-medium">Agendamento:</strong> {rule.schedule}
          </span>
        ) : null}
        {rule.serverSide ? (
          <span className="inline-flex items-center gap-1">
            <Server className="size-3" />
            Executa no servidor
          </span>
        ) : null}
        {rule.alwaysOn ? (
          <span>Sempre monitora quando os requisitos estão ok</span>
        ) : null}
      </div>
    </div>
  );
}
