export type RappiTenantConfigDto = {
  tenant_id: string;
  store_id: string | null;
  api_key_set: boolean;
  webhook_secret_set: boolean;
  enabled: boolean;
  polling_enabled: boolean;
  webhook_url: string;
  last_poll_at: string | null;
  last_poll_status: string | null;
  last_poll_message: string | null;
  oauth_configured: boolean;
};

export type RappiPollResultDto = {
  skipped: boolean;
  reason?: string;
  orders_received: number;
  orders_processed: number;
  polled_at: string;
};

/** Payload flexível — Rappi varia por país/versão da API */
export type RappiOrderPayload = {
  order_id?: string | number;
  id?: string | number;
  store_id?: string | number;
  status?: string;
  customer?: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    phone_number?: string;
  };
  delivery?: {
    address?: string;
    neighborhood?: string;
    complement?: string;
  };
  order_details?: Array<{
    name?: string;
    quantity?: number;
    unit_price?: number;
    price?: number;
    comments?: string;
  }>;
  items?: Array<{
    name?: string;
    quantity?: number;
    unit_price?: number;
    price?: number;
  }>;
  totals?: {
    subtotal?: number;
    delivery_fee?: number;
    total?: number;
  };
  total?: number;
  delivery_fee?: number;
};

export type RappiWebhookPayload = {
  event?: string;
  store_id?: string | number;
  order?: RappiOrderPayload;
  order_id?: string | number;
};
