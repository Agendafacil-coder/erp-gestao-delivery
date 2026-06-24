import type { OrderChannel } from "@/lib/orders/channels";
import type { OrderStatus } from "@/lib/ops/orderWorkflow";

/** Pedido normalizado antes de inserir no fluxo interno */
export type NormalizedInboundOrder = {
  externalId: string;
  channel: OrderChannel | string;
  customerName: string;
  customerPhone: string | null;
  address: string;
  neighborhood: string | null;
  postalCode: string | null;
  lat: number | null;
  lng: number | null;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    menuItemId?: string | null;
    notes?: string | null;
  }>;
  subtotalAmount: number;
  deliveryFee: number;
  discountAmount: number;
  totalAmount: number;
  paymentMethod: string | null;
  notes: string | null;
  initialStatus?: OrderStatus;
};

export type MarketplaceProcessResult = {
  orderId: string | null;
  eventId: string;
  action: "created" | "updated" | "cancelled" | "ignored";
};

/** Contrato para adapters de marketplace (iFood, Rappi, 99Food…) */
export interface MarketplaceAdapter {
  readonly id: OrderChannel | string;
  processInbound(input: {
    tenantId: string;
    payload: unknown;
    source?: "webhook" | "polling";
    externalEventId?: string;
  }): Promise<MarketplaceProcessResult>;
}
