import { CheckCircle, Server, Zap } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { groupAutomationsByCategory } from "@/lib/ops/automationCategories";
import type { LiveAutomation } from "@/lib/ops/automationRegistry";
import { cn } from "@/lib/utils";

type Props = {
  selectedId: string;
  onSelect: (id: string) => void;
  isRuleEnabled: (ruleId: string) => boolean;
  onToggleRule: (ruleId: string, enabled: boolean) => void;
  togglesBusy?: boolean;
  eventCounts: Map<string, number>;
  lastEventAt: Map<string, string>;
  sseConnected?: boolean;
};

function RuleCard({
  rule,
  selected,
  enabled,
  count,
  lastAt,
  togglesBusy,
  onSelect,
  onToggleRule,
}: {
  rule: LiveAutomation;
  selected: boolean;
  enabled: boolean;
  count: number;
  lastAt?: string;
  togglesBusy?: boolean;
  onSelect: () => void;
  onToggleRule: (enabled: boolean) => void;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3 transition",
        selected
          ? "border-primary/45 bg-primary/10 shadow-glow"
          : "border-border/40 bg-surface/30 hover:bg-surface/50",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <button type="button" onClick={onSelect} className="min-w-0 flex-1 text-left">
          <h4 className="text-xs font-semibold text-foreground leading-snug">{rule.name}</h4>
          <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{rule.description}</p>
        </button>
        <div className="shrink-0 flex flex-col items-end gap-1">
          <Switch
            checked={enabled}
            disabled={togglesBusy}
            onCheckedChange={onToggleRule}
            className="scale-75 data-[state=checked]:bg-primary"
            aria-label={`${rule.name}: ${enabled ? "ligada" : "pausada"}`}
          />
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[9px] font-semibold",
              enabled ? "text-success" : "text-muted-foreground",
            )}
          >
            <CheckCircle className="size-3" />
            {enabled ? "Ativa" : "Pausada"}
          </span>
          {rule.serverSide ? (
            <span className="inline-flex items-center gap-0.5 text-[8px] text-muted-foreground">
              <Server className="size-2.5" />
              automático
            </span>
          ) : null}
        </div>
      </div>
      <p className="erp-meta mt-1.5">
        {count} evento{count !== 1 ? "s" : ""}
        {lastAt ? ` · último ${lastAt}` : count === 0 ? " · aguardando" : ""}
        {rule.schedule ? ` · ${rule.schedule}` : ""}
      </p>
    </div>
  );
}

export function AutomationRulesList({
  selectedId,
  onSelect,
  isRuleEnabled,
  onToggleRule,
  togglesBusy,
  eventCounts,
  lastEventAt,
  sseConnected = false,
}: Props) {
  const groups = groupAutomationsByCategory();

  return (
    <div className="erp-card flex flex-col min-h-0 min-w-0">
      <div className="flex items-center justify-between gap-2 border-b border-border/40 px-4 py-3 shrink-0">
        <span className="erp-section-label font-semibold text-foreground flex items-center gap-1.5">
          <Zap className="size-3.5 text-primary" />
          Regras
        </span>
        {sseConnected ? (
          <span className="erp-meta text-success flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-success animate-pulse" />
            Ao vivo
          </span>
        ) : (
          <span className="erp-meta">Atualizando…</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4 max-h-[min(70vh,640px)]">
        {groups.map(({ category, rules }) => (
          <section key={category.id} className="space-y-2">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
              {category.label}
            </h3>
            <div className="space-y-2">
              {rules.map((rule) => (
                <RuleCard
                  key={rule.id}
                  rule={rule}
                  selected={selectedId === rule.id}
                  enabled={isRuleEnabled(rule.id)}
                  count={eventCounts.get(rule.id) ?? 0}
                  lastAt={lastEventAt.get(rule.id)}
                  togglesBusy={togglesBusy}
                  onSelect={() => onSelect(rule.id)}
                  onToggleRule={(enabled) => onToggleRule(rule.id, enabled)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
