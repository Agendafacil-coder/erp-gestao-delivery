import { LIVE_AUTOMATIONS, type LiveAutomation } from "@/lib/ops/automationRegistry";

export type AutomationCategory = {
  id: string;
  label: string;
  ruleIds: string[];
};

export const AUTOMATION_CATEGORIES: AutomationCategory[] = [
  {
    id: "whatsapp",
    label: "WhatsApp",
    ruleIds: ["sla-whatsapp", "geofence-arriving", "abandoned-cart-whatsapp"],
  },
  {
    id: "entrega",
    label: "Entrega & GPS",
    ruleIds: ["geofence-arrived", "auto-complete", "auto-dispatch", "driver-push"],
  },
  {
    id: "operacao",
    label: "Operação",
    ruleIds: ["ops-alerts", "kitchen-bottleneck", "sla-delay"],
  },
  {
    id: "integracoes",
    label: "Integrações",
    ruleIds: ["ifood-poll", "rappi-poll", "food99-poll"],
  },
];

export function groupAutomationsByCategory(): Array<{
  category: AutomationCategory;
  rules: LiveAutomation[];
}> {
  const byId = new Map(LIVE_AUTOMATIONS.map((r) => [r.id, r]));
  const used = new Set<string>();

  const grouped = AUTOMATION_CATEGORIES.map((category) => {
    const rules = category.ruleIds
      .map((id) => byId.get(id))
      .filter((r): r is LiveAutomation => !!r);
    rules.forEach((r) => used.add(r.id));
    return { category, rules };
  }).filter((g) => g.rules.length > 0);

  const uncategorized = LIVE_AUTOMATIONS.filter((r) => !used.has(r.id));
  if (uncategorized.length) {
    grouped.push({
      category: { id: "outros", label: "Outras", ruleIds: uncategorized.map((r) => r.id) },
      rules: uncategorized,
    });
  }

  return grouped;
}
