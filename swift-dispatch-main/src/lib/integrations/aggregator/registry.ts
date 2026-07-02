import type { MarketplaceAdapter } from "@/lib/integrations/aggregator/types";
import { food99Adapter } from "@/lib/integrations/food99/adapter";
import { ifoodAdapter } from "@/lib/integrations/ifood/adapter";
import { rappiAdapter } from "@/lib/integrations/rappi/adapter";

/** Registro central de adapters de marketplace */
export const MARKETPLACE_ADAPTERS: Record<string, MarketplaceAdapter> = {
  ifood: ifoodAdapter,
  rappi: rappiAdapter,
  "99food": food99Adapter,
};

export function getMarketplaceAdapter(id: string): MarketplaceAdapter | null {
  return MARKETPLACE_ADAPTERS[id] ?? null;
}
