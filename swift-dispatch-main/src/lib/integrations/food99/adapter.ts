import type {
  MarketplaceAdapter,
  MarketplaceProcessResult,
} from "@/lib/integrations/aggregator/types";
import type { Food99WebhookPayload } from "./types";
import { extractFood99EventFromWebhook, processFood99Event } from "./processOrder";

export const food99Adapter: MarketplaceAdapter = {
  id: "99food",

  async processInbound(input): Promise<MarketplaceProcessResult> {
    const payload = input.payload as Food99WebhookPayload;
    const event = extractFood99EventFromWebhook(payload);
    if (!event) {
      return { orderId: null, eventId: input.externalEventId ?? "ignored", action: "ignored" };
    }

    const result = await processFood99Event({
      tenantId: input.tenantId,
      event,
      embeddedOrder: payload.order ?? payload.data ?? null,
      source: input.source,
    });

    return {
      orderId: result.orderId,
      eventId: input.externalEventId ?? event.id ?? result.orderId ?? "99food-event",
      action: result.orderId ? "created" : "ignored",
    };
  },
};
