export type Food99TenantConfigDto = {
  tenant_id: string;
  merchant_id: string | null;
  client_id_set: boolean;
  client_secret_set: boolean;
  api_base: string | null;
  webhook_secret_set: boolean;
  enabled: boolean;
  polling_enabled: boolean;
  oauth_connected: boolean;
  webhook_url: string;
  last_poll_at: string | null;
  last_poll_status: string | null;
  last_poll_message: string | null;
};

export type Food99PollResultDto = {
  skipped: boolean;
  reason?: string;
  events_received: number;
  orders_processed: number;
  polled_at: string;
};

/** Evento Open Delivery (polling / webhook) */
export type Food99EventPayload = {
  id?: string;
  eventId?: string;
  eventType?: string;
  type?: string;
  code?: string;
  orderId?: string;
  order_id?: string;
  merchantId?: string;
  merchant_id?: string;
  createdAt?: string;
};

export type Food99WebhookPayload = Food99EventPayload & {
  order?: Food99OrderPayload;
  data?: Food99OrderPayload;
};

/** Pedido Open Delivery — payload flexível */
export type Food99OrderPayload = {
  id?: string;
  orderId?: string;
  displayId?: string;
  type?: string;
  customer?: {
    name?: string;
    phone?: string | { number?: string };
  };
  items?: Array<{
    name?: string;
    quantity?: number;
    unitPrice?: number | { value?: number };
    totalPrice?: number | { value?: number };
    options?: Array<{ name?: string }>;
  }>;
  total?: {
    subTotal?: number | { value?: number };
    deliveryFee?: number | { value?: number };
    orderAmount?: number | { value?: number };
  };
  delivery?: {
    deliveredBy?: string;
    deliveryAddress?: {
      formattedAddress?: string;
      street?: string;
      number?: string;
      complement?: string;
      district?: string;
      neighborhood?: string;
      city?: string;
      state?: string;
    };
  };
};

export const FOOD99_PLACE_EVENT_CODES = new Set([
  "PLACED",
  "CREATED",
  "CONFIRMED",
  "ORDER_PLACED",
  "ORDER_CREATED",
  "ORDER_CONFIRMED",
]);
