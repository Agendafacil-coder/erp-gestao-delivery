/** Stub Rappi — ativar via feature flag marketplace_rappi (Fase 2) */
import type { MarketplaceAdapter, MarketplaceProcessResult } from "@/lib/integrations/aggregator/types";

export const rappiAdapter: MarketplaceAdapter = {
  id: "rappi",

  async processInbound(): Promise<MarketplaceProcessResult> {
    throw new Error(
      "Integração Rappi em configuração. Configure rappi_tenant_config e credenciais da API.",
    );
  },
};
