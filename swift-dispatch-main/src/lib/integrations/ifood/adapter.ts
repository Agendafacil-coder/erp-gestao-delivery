import type { MarketplaceAdapter, MarketplaceProcessResult } from "@/lib/integrations/aggregator/types";
import type { IfoodWebhookPayload } from "./types";
import { processIfoodWebhook } from "./processEvent";

/** Adapter iFood — delega para processIfoodWebhook (comportamento inalterado) */
export const ifoodAdapter: MarketplaceAdapter = {
  id: "ifood",

  async processInbound(input): Promise<MarketplaceProcessResult> {
    const result = await processIfoodWebhook({
      tenantId: input.tenantId,
      payload: input.payload as IfoodWebhookPayload,
      source: input.source,
      ifoodEventId: input.externalEventId,
    });

    return {
      orderId: result.orderId,
      eventId: result.eventId,
      action: result.orderId ? "created" : "ignored",
    };
  },
};
