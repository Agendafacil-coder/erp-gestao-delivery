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
    label: "CRM — perfil do cliente",
    description: "Histórico e segmentação por telefone na central.",
    phase: "Fase 1",
  },
  customer_favorites: {
    label: "Favoritos no cardápio",
    description: "Cliente salva produtos preferidos no cardápio público.",
    phase: "Fase 1",
  },
  thermal_print: {
    label: "Impressora térmica ESC/POS",
    description: "Impressão direta na cozinha via Web Serial/USB.",
    phase: "Fase 1",
  },
  driver_commission: {
    label: "Comissão do entregador",
    description: "Calcula ganhos por entrega no financeiro e app entregador.",
    phase: "Fase 1",
  },
  whatsapp_campaigns: {
    label: "Campanhas WhatsApp",
    description: "Disparos segmentados (VIP, inativos) pelo hub WhatsApp.",
    phase: "Fase 1",
  },
  marketplace_rappi: {
    label: "Integração Rappi",
    description: "Importa pedidos Rappi na central unificada.",
    phase: "Fase 2",
  },
  marketplace_99food: {
    label: "Integração 99Food",
    description: "Importa pedidos 99Food na central unificada.",
    phase: "Fase 2",
  },
  multi_store: {
    label: "Multi-loja",
    description: "Operação com filtro por unidade e relatórios consolidados.",
    phase: "Fase 2",
  },
  salon_mode: {
    label: "Salão / mesas",
    description: "Mapa de mesas, comandas e QR na mesa.",
    phase: "Fase 3",
  },
  recipe_inventory: {
    label: "Ficha técnica (BOM)",
    description: "Baixa de insumos por receita e CMV real.",
    phase: "Fase 2",
  },
  demand_forecast: {
    label: "Previsão de demanda",
    description: "Sugestão de preparo por horário no KDS.",
    phase: "Fase 2",
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
