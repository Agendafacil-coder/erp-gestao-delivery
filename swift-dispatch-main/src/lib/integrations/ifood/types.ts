/** Tipos simplificados do webhook iFood (eventos de pedido) */

export type IfoodWebhookPayload = {
  id?: string;
  code?: string;
  fullCode?: string;
  orderId?: string;
  merchantId?: string;
  createdAt?: string;
  customer?: {
    name?: string;
    phone?: string;
    documentNumber?: string;
  };
  delivery?: {
    deliveryAddress?: {
      formattedAddress?: string;
      neighborhood?: string;
      streetName?: string;
      streetNumber?: string;
      complement?: string;
    };
  };
  total?: {
    orderAmount?: number;
    deliveryFee?: number;
  };
  items?: Array<{
    name?: string;
    quantity?: number;
    unitPrice?: number;
    totalPrice?: number;
  }>;
};

export type IfoodInboundEventDto = {
  id: string;
  tenant_id: string;
  event_type: string;
  external_order_id: string | null;
  order_id: string | null;
  processed: boolean;
  error_message: string | null;
  source: string;
  created_at: string;
};

export type IfoodTenantConfigDto = {
  tenant_id: string;
  merchant_id: string | null;
  webhook_secret_set: boolean;
  enabled: boolean;
  webhook_url: string;
  client_id: string | null;
  has_client_credentials: boolean;
  oauth_connected: boolean;
  token_expires_at: string | null;
  pending_user_code: string | null;
  verification_url: string | null;
  pending_user_code_expires_at: string | null;
  polling_enabled: boolean;
  last_poll_at: string | null;
  last_poll_status: string | null;
  last_poll_message: string | null;
};

export type IfoodPollResultDto = {
  skipped: boolean;
  error?: boolean;
  reason?: string;
  events_received: number;
  events_processed: number;
  events_acknowledged: number;
  polled_at: string;
};

export type IfoodUserCodeDto = {
  user_code: string;
  verification_url: string;
  expires_at: string;
};

/** Códigos que disparam criação de pedido local */
export const IFOOD_PLACE_EVENT_CODES = new Set(["PLC", "PLACED", "ORDER_PLACED"]);

/** Códigos de cancelamento */
export const IFOOD_CANCEL_EVENT_CODES = new Set(["CAN", "CANCELLED", "ORDER_CANCELLED"]);

/** Pedido concluído / entregue */
export const IFOOD_COMPLETE_EVENT_CODES = new Set(["CON", "CONCLUDED", "DELIVERED", "COMPLETED"]);
