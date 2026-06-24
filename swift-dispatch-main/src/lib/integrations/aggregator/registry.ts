import type { MarketplaceAdapter } from "@/lib/integrations/aggregator/types";
import { ifoodAdapter } from "@/lib/integrations/ifood/adapter";

/** Registro central de adapters de marketplace */
export const MARKETPLACE_ADAPTERS: Record<string, MarketplaceAdapter> = {
  ifood: ifoodAdapter,
};

export function getMarketplaceAdapter(id: string): MarketplaceAdapter | null {
  return MARKETPLACE_ADAPTERS[id] ?? null;
}
