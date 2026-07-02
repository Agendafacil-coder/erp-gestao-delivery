/** Feature flags por tenant — desligadas por padrão para deploy seguro */
export const FEATURE_FLAG_KEYS = [
  "crm_profiles",
  "customer_favorites",
  "thermal_print",
  "driver_commission",
  "whatsapp_campaigns",
  "marketplace_rappi",
  "marketplace_99food",
  "multi_store",
  "salon_mode",
  "recipe_inventory",
  "demand_forecast",
] as const;

export type FeatureFlagKey = (typeof FEATURE_FLAG_KEYS)[number];

export type TenantFeatureFlags = Partial<Record<FeatureFlagKey, boolean>>;

export const FEATURE_FLAG_META: Record<
  FeatureFlagKey,
  { label: string; description: string; phase: string }
> = {
  crm_profiles: {
    label: "Histórico do cliente",
    description: "Veja pedidos anteriores e dados por telefone na central.",
    phase: "Essenciais",
  },
  customer_favorites: {
    label: "Favoritos no cardápio",
    description: "Cliente salva produtos preferidos no cardápio online.",
    phase: "Essenciais",
  },
  thermal_print: {
    label: "Impressora térmica na cozinha",
    description: "Imprime comanda direto na impressora 80mm (Chrome ou Edge).",
    phase: "Essenciais",
  },
  driver_commission: {
    label: "Comissão do entregador",
    description: "Calcula quanto cada entregador ganhou por entrega.",
    phase: "Essenciais",
  },
  whatsapp_campaigns: {
    label: "Mensagens em massa no WhatsApp",
    description: "Envie campanhas para clientes VIP ou inativos.",
    phase: "Essenciais",
  },
  marketplace_rappi: {
    label: "Pedidos do Rappi",
    description: "Importa pedidos do Rappi na central de pedidos.",
    phase: "Marketplaces",
  },
  marketplace_99food: {
    label: "Pedidos da 99Food",
    description: "Importa pedidos da 99Food na central de pedidos.",
    phase: "Marketplaces",
  },
  multi_store: {
    label: "Várias unidades",
    description: "Gerencie filiais e veja relatórios por loja.",
    phase: "Marketplaces",
  },
  salon_mode: {
    label: "Salão e mesas",
    description: "Mapa de mesas, comandas e QR na mesa.",
    phase: "Salão",
  },
  recipe_inventory: {
    label: "Ingredientes por prato",
    description: "Cadastre receitas e calcule o custo real de cada item.",
    phase: "Marketplaces",
  },
  demand_forecast: {
    label: "Sugestão de preparo",
    description: "Indica quanto preparar por horário na tela da cozinha.",
    phase: "Marketplaces",
  },
};

export const DEFAULT_FEATURE_FLAGS: TenantFeatureFlags = {};

export function parseFeatureFlagsJson(raw: string | null | undefined): TenantFeatureFlags {
  if (!raw?.trim()) return { ...DEFAULT_FEATURE_FLAGS };
  try {
    const parsed = JSON.parse(raw) as TenantFeatureFlags;
    if (!parsed || typeof parsed !== "object") return { ...DEFAULT_FEATURE_FLAGS };
    const out: TenantFeatureFlags = {};
    for (const key of FEATURE_FLAG_KEYS) {
      if (typeof parsed[key] === "boolean") out[key] = parsed[key];
    }
    return out;
  } catch {
    return { ...DEFAULT_FEATURE_FLAGS };
  }
}

export function serializeFeatureFlags(flags: TenantFeatureFlags): string {
  const out: TenantFeatureFlags = {};
  for (const key of FEATURE_FLAG_KEYS) {
    if (typeof flags[key] === "boolean") out[key] = flags[key];
  }
  return JSON.stringify(out);
}

export function isFeatureEnabled(
  flags: TenantFeatureFlags,
  key: FeatureFlagKey,
): boolean {
  return flags[key] === true;
}
