import type {
  MarketplaceAdapter,
  MarketplaceProcessResult,
} from "@/lib/integrations/aggregator/types";
import type { RappiWebhookPayload } from "./types";
import { extractRappiOrderFromWebhook, processRappiOrder } from "./processOrder";

export const rappiAdapter: MarketplaceAdapter = {
  id: "rappi",

  async processInbound(input): Promise<MarketplaceProcessResult> {
    const payload = input.payload as RappiWebhookPayload;
    const order = extractRappiOrderFromWebhook(payload);
    if (!order) {
      return { orderId: null, eventId: input.externalEventId ?? "ignored", action: "ignored" };
    }

    const result = await processRappiOrder({
      tenantId: input.tenantId,
      payload: order,
      source: input.source,
    });

    return {
      orderId: result.orderId,
      eventId: input.externalEventId ?? result.orderId ?? "rappi-event",
      action: result.orderId ? "created" : "ignored",
    };
  },
};
