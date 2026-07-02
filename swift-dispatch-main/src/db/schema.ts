import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  numeric,
  doublePrecision,
  pgEnum,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const appRoleEnum = pgEnum("app_role", [
  "owner",
  "admin",
  "dispatcher",
  "manager",
  "kitchen",
  "cashier",
  "driver",
  "viewer",
]);

export const tenantPlanEnum = pgEnum("tenant_plan", ["trial", "starter", "pro", "enterprise"]);

export const orderStatusEnum = pgEnum("order_status", [
  "novo",
  "confirmado",
  "em_preparo",
  "pronto",
  "aguardando_entregador",
  "em_rota_coleta",
  "retirado",
  "em_rota_entrega",
  "entregue",
  "cancelado",
]);

export const orderPriorityEnum = pgEnum("order_priority", ["baixa", "normal", "alta", "critica"]);

export const driverStatusEnum = pgEnum("driver_status", [
  "offline",
  "disponivel",
  "em_rota",
  "pausado",
]);

export const vehicleTypeEnum = pgEnum("vehicle_type", ["moto", "bike", "carro", "a_pe"]);

export const alertLevelEnum = pgEnum("alert_level", ["low", "med", "high", "crit"]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pendente",
  "pago",
  "falhou",
  "reembolsado",
]);

export const paymentProviderEnum = pgEnum("payment_provider", [
  "mock",
  "stripe",
  "mercadopago",
  "asaas",
]);

export const financialExpenseCategoryEnum = pgEnum("financial_expense_category", [
  "manual",
  "fixed",
  "variable",
]);

export const financialCostTypeEnum = pgEnum("financial_cost_type", ["fixed", "variable"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  plan: tenantPlanEnum("plan").notNull().default("trial"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const stores = pgTable("stores", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  address: text("address"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const profiles = pgTable("profiles", {
  id: uuid("id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  fullName: text("full_name"),
  avatarUrl: text("avatar_url"),
  phone: text("phone"),
  currentTenantId: uuid("current_tenant_id").references(() => tenants.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userRoles = pgTable(
  "user_roles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    role: appRoleEnum("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("user_roles_unique").on(t.userId, t.tenantId, t.role)],
);

export const drivers = pgTable("drivers", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  phone: text("phone"),
  vehicle: vehicleTypeEnum("vehicle").notNull().default("moto"),
  status: driverStatusEnum("status").notNull().default("offline"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  rating: numeric("rating", { precision: 3, scale: 2 }).default("5.00"),
  activeOrders: integer("active_orders").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Histórico de GPS do entregador (trajeto em tempo real) */
export const driverLocations = pgTable("driver_locations", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  driverId: uuid("driver_id")
    .notNull()
    .references(() => drivers.id, { onDelete: "cascade" }),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  heading: doublePrecision("heading"),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    storeId: uuid("store_id").references(() => stores.id, { onDelete: "set null" }),
    driverId: uuid("driver_id").references(() => drivers.id, { onDelete: "set null" }),
    code: text("code").notNull(),
    status: orderStatusEnum("status").notNull().default("novo"),
    priority: orderPriorityEnum("priority").notNull().default("normal"),
    customerName: text("customer_name").notNull(),
    customerPhone: text("customer_phone"),
    address: text("address").notNull(),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    itemsCount: integer("items_count").notNull().default(1),
    subtotalAmount: numeric("subtotal_amount", { precision: 12, scale: 2 }),
    deliveryFee: numeric("delivery_fee", { precision: 12, scale: 2 }).default("0"),
    discountAmount: numeric("discount_amount", { precision: 12, scale: 2 }).default("0"),
    totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    paymentMethod: text("payment_method"),
    fulfillmentType: text("fulfillment_type").default("delivery"),
    couponCode: text("coupon_code"),
    loyaltyPointsRedeemed: integer("loyalty_points_redeemed").notNull().default(0),
    loyaltyPointsEarned: integer("loyalty_points_earned").notNull().default(0),
    neighborhood: text("neighborhood"),
    postalCode: text("postal_code"),
    channel: text("channel"),
    notes: text("notes"),
    slaMinutes: integer("sla_minutes").notNull().default(45),
    trackingToken: uuid("tracking_token").defaultRandom(),
    paymentStatus: paymentStatusEnum("payment_status").notNull().default("pendente"),
    sourceSessionId: text("source_session_id"),
    placedAt: timestamp("placed_at", { withTimezone: true }).notNull().defaultNow(),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    readyAt: timestamp("ready_at", { withTimezone: true }),
    pickedUpAt: timestamp("picked_up_at", { withTimezone: true }),
    arrivedAt: timestamp("arrived_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("orders_tenant_code").on(t.tenantId, t.code)],
);

export const menuCategories = pgTable("menu_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const menuItems = pgTable("menu_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => menuCategories.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  unitCost: numeric("unit_cost", { precision: 12, scale: 2 }),
  imageUrl: text("image_url"),
  available: boolean("available").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  isFeatured: boolean("is_featured").notNull().default(false),
  isCombo: boolean("is_combo").notNull().default(false),
  isDrink: boolean("is_drink").notNull().default(false),
  salesCount: integer("sales_count").notNull().default(0),
  /** null = estoque não controlado */
  stockQuantity: integer("stock_quantity"),
  stockMin: integer("stock_min").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const menuItemVariations = pgTable("menu_item_variations", {
  id: uuid("id").primaryKey().defaultRandom(),
  menuItemId: uuid("menu_item_id")
    .notNull()
    .references(() => menuItems.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  available: boolean("available").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const menuItemAddons = pgTable("menu_item_addons", {
  id: uuid("id").primaryKey().defaultRandom(),
  menuItemId: uuid("menu_item_id")
    .notNull()
    .references(() => menuItems.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  price: numeric("price", { precision: 12, scale: 2 }).notNull().default("0"),
  groupName: text("group_name").default("Adicionais"),
  required: boolean("required").notNull().default(false),
  maxQuantity: integer("max_quantity").notNull().default(1),
  isSuggested: boolean("is_suggested").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  available: boolean("available").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tenantMenuSettings = pgTable("tenant_menu_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" })
    .unique(),
  minOrderAmount: numeric("min_order_amount", { precision: 12, scale: 2 }).default("0"),
  pickupEnabled: boolean("pickup_enabled").notNull().default(true),
  deliveryEnabled: boolean("delivery_enabled").notNull().default(true),
  defaultDeliveryFee: numeric("default_delivery_fee", { precision: 12, scale: 2 }).default("0"),
  neighborhoodFees: text("neighborhood_fees"),
  coupons: text("coupons"),
  storeAddress: text("store_address"),
  storeCity: text("store_city"),
  storeState: text("store_state"),
  storePostalCode: text("store_postal_code"),
  menuLogoUrl: text("menu_logo_url"),
  menuCoverUrl: text("menu_cover_url"),
  /** classic | gallery | clean — layout do cardápio público */
  menuLayout: text("menu_layout").notNull().default("classic"),
  autoDispatchEnabled: boolean("auto_dispatch_enabled").notNull().default(false),
  /** JSON: limiar SLA, raio de lote, congestionamento — ver SlaSettings */
  slaSettings: text("sla_settings"),
  /** JSON: toggles por automação — ver AutomationSettings */
  automationSettings: text("automation_settings"),
  /** JSON: horário de funcionamento — ver StoreOpeningHours */
  openingHours: text("opening_hours"),
  /** JSON: feature flags por tenant — ver TenantFeatureFlags */
  featureFlags: text("feature_flags"),
  /** JSON: comissão entregador — ver DriverCommissionSettings */
  driverCommissionSettings: text("driver_commission_settings"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orderLineItems = pgTable("order_line_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  menuItemId: uuid("menu_item_id").references(() => menuItems.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  provider: paymentProviderEnum("provider").notNull().default("mock"),
  externalId: text("external_id"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  status: paymentStatusEnum("status").notNull().default("pendente"),
  method: text("method"),
  pixCopyPaste: text("pix_copy_paste"),
  pixQrBase64: text("pix_qr_base64"),
  checkoutUrl: text("checkout_url"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orderEvents = pgTable("order_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
  fromStatus: orderStatusEnum("from_status"),
  toStatus: orderStatusEnum("to_status").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const alerts = pgTable("alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  level: alertLevelEnum("level").notNull().default("med"),
  title: text("title").notNull(),
  detail: text("detail").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const automationEvents = pgTable(
  "automation_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    eventKey: text("event_key").notNull(),
    ruleId: text("rule_id").notNull(),
    message: text("message").notNull(),
    level: text("level").notNull().default("info"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("automation_events_tenant_event_key").on(t.tenantId, t.eventKey)],
);

/** Despesas manuais e lançamentos operacionais */
export const financialExpenses = pgTable("financial_expenses", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  category: financialExpenseCategoryEnum("category").notNull().default("manual"),
  expenseDate: timestamp("expense_date", { withTimezone: true }).notNull().defaultNow(),
  notes: text("notes"),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Custos fixos e variáveis recorrentes do negócio */
export const financialCostSettings = pgTable("financial_cost_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  costType: financialCostTypeEnum("cost_type").notNull(),
  active: boolean("active").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Fechamento diário — snapshot das métricas do dia */
export const financialDailyClosings = pgTable("financial_daily_closings", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  closingDate: timestamp("closing_date", { withTimezone: true }).notNull(),
  revenue: numeric("revenue", { precision: 12, scale: 2 }).notNull().default("0"),
  deliveryFees: numeric("delivery_fees", { precision: 12, scale: 2 }).notNull().default("0"),
  expensesTotal: numeric("expenses_total", { precision: 12, scale: 2 }).notNull().default("0"),
  fixedCosts: numeric("fixed_costs", { precision: 12, scale: 2 }).notNull().default("0"),
  variableCosts: numeric("variable_costs", { precision: 12, scale: 2 }).notNull().default("0"),
  estimatedProfit: numeric("estimated_profit", { precision: 12, scale: 2 }).notNull().default("0"),
  ordersDelivered: integer("orders_delivered").notNull().default(0),
  snapshot: text("snapshot"),
  notes: text("notes"),
  closedBy: uuid("closed_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Reservado para CMV (custo da mercadoria vendida) — fase futura com estoque.
 * Estrutura preparada; integração com order_line_items e estoque virá depois.
 */
export const financialCmvEntries = pgTable("financial_cmv_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
  menuItemId: uuid("menu_item_id").references(() => menuItems.id, { onDelete: "set null" }),
  quantity: integer("quantity").notNull().default(1),
  unitCost: numeric("unit_cost", { precision: 12, scale: 2 }),
  totalCost: numeric("total_cost", { precision: 12, scale: 2 }),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  source: text("source").default("manual"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Log de mensagens WhatsApp (demo ou API real) */
export const whatsappMessageLogs = pgTable("whatsapp_message_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
  recipientType: text("recipient_type").notNull().default("cliente"),
  recipientPhone: text("recipient_phone"),
  recipientLabel: text("recipient_label").notNull(),
  templateKey: text("template_key"),
  content: text("content").notNull(),
  status: text("status").notNull().default("demo"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Templates WhatsApp personalizados por tenant */
export const whatsappTemplates = pgTable(
  "whatsapp_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    templateKey: text("template_key").notNull(),
    content: text("content").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("whatsapp_templates_tenant_key").on(t.tenantId, t.templateKey)],
);

export const ifoodTenantConfig = pgTable("ifood_tenant_config", {
  tenantId: uuid("tenant_id")
    .primaryKey()
    .references(() => tenants.id, { onDelete: "cascade" }),
  merchantId: text("merchant_id"),
  webhookSecret: text("webhook_secret"),
  clientId: text("client_id"),
  clientSecret: text("client_secret"),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
  authorizationCodeVerifier: text("authorization_code_verifier"),
  pendingUserCode: text("pending_user_code"),
  pendingUserCodeExpiresAt: timestamp("pending_user_code_expires_at", { withTimezone: true }),
  verificationUrl: text("verification_url"),
  pollingEnabled: boolean("polling_enabled").notNull().default(true),
  lastPollAt: timestamp("last_poll_at", { withTimezone: true }),
  lastPollStatus: text("last_poll_status"),
  lastPollMessage: text("last_poll_message"),
  enabled: boolean("enabled").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Configuração WhatsApp API por tenant (Evolution / Z-API / Cloud) */
export const whatsappTenantConfig = pgTable("whatsapp_tenant_config", {
  tenantId: uuid("tenant_id")
    .primaryKey()
    .references(() => tenants.id, { onDelete: "cascade" }),
  provider: text("provider").notNull().default("evolution"),
  apiUrl: text("api_url"),
  apiKey: text("api_key"),
  instanceName: text("instance_name"),
  enabled: boolean("enabled").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Web Push — inscrições por usuário (PWA entregador) */
export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("push_subscriptions_endpoint_idx").on(t.endpoint)],
);

export const loyaltyWallets = pgTable(
  "loyalty_wallets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    phone: text("phone").notNull(),
    points: integer("points").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("loyalty_wallets_tenant_phone").on(t.tenantId, t.phone)],
);

export const orderReviews = pgTable("order_reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" })
    .unique(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  score: integer("score").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const abandonedCartLeads = pgTable(
  "abandoned_cart_leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    tenantSlug: text("tenant_slug").notNull(),
    phone: text("phone").notNull(),
    customerName: text("customer_name"),
    cartJson: text("cart_json").notNull(),
    subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
    remindedAt: timestamp("reminded_at", { withTimezone: true }),
    convertedAt: timestamp("converted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("abandoned_cart_tenant_phone").on(t.tenantId, t.phone)],
);

/** Perfil CRM agregado por telefone */
export const customerProfiles = pgTable(
  "customer_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    phone: text("phone").notNull(),
    name: text("name"),
    notes: text("notes"),
    tags: text("tags"),
    orderCount: integer("order_count").notNull().default(0),
    totalSpent: numeric("total_spent", { precision: 12, scale: 2 }).notNull().default("0"),
    lastOrderAt: timestamp("last_order_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("customer_profiles_tenant_phone").on(t.tenantId, t.phone)],
);

/** Favoritos do cliente no cardápio público */
export const customerFavorites = pgTable(
  "customer_favorites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    phone: text("phone").notNull(),
    menuItemId: uuid("menu_item_id")
      .notNull()
      .references(() => menuItems.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("customer_favorites_unique").on(t.tenantId, t.phone, t.menuItemId)],
);

/** Ganhos por entrega — comissão do entregador */
export const driverEarnings = pgTable("driver_earnings", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  driverId: uuid("driver_id")
    .notNull()
    .references(() => drivers.id, { onDelete: "cascade" }),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" })
    .unique(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Insumos para ficha técnica */
export const ingredients = pgTable("ingredients", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  unit: text("unit").notNull().default("un"),
  unitCost: numeric("unit_cost", { precision: 12, scale: 2 }),
  stockQuantity: numeric("stock_quantity", { precision: 12, scale: 3 }),
  stockMin: numeric("stock_min", { precision: 12, scale: 3 }).default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Receita (BOM) por produto do cardápio */
export const recipes = pgTable("recipes", {
  id: uuid("id").primaryKey().defaultRandom(),
  menuItemId: uuid("menu_item_id")
    .notNull()
    .references(() => menuItems.id, { onDelete: "cascade" })
    .unique(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  yield: integer("yield").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const recipeItems = pgTable("recipe_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  recipeId: uuid("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  ingredientId: uuid("ingredient_id")
    .notNull()
    .references(() => ingredients.id, { onDelete: "cascade" }),
  quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull(),
});

/** Config 99Food (Open Delivery) por tenant */
export const food99TenantConfig = pgTable("food99_tenant_config", {
  tenantId: uuid("tenant_id")
    .primaryKey()
    .references(() => tenants.id, { onDelete: "cascade" }),
  merchantId: text("merchant_id"),
  clientId: text("client_id"),
  clientSecret: text("client_secret"),
  apiBase: text("api_base"),
  accessToken: text("access_token"),
  tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
  webhookSecret: text("webhook_secret"),
  enabled: boolean("enabled").notNull().default(false),
  pollingEnabled: boolean("polling_enabled").notNull().default(true),
  lastPollAt: timestamp("last_poll_at", { withTimezone: true }),
  lastPollStatus: text("last_poll_status"),
  lastPollMessage: text("last_poll_message"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Config Rappi por tenant (Fase 2) */
export const rappiTenantConfig = pgTable("rappi_tenant_config", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" })
    .unique(),
  storeId: text("store_id"),
  apiKey: text("api_key"),
  webhookSecret: text("webhook_secret"),
  enabled: boolean("enabled").notNull().default(false),
  pollingEnabled: boolean("polling_enabled").notNull().default(true),
  lastPollAt: timestamp("last_poll_at", { withTimezone: true }),
  lastPollStatus: text("last_poll_status"),
  lastPollMessage: text("last_poll_message"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Importações de conciliação financeira iFood por competência */
export const ifoodReconciliationImports = pgTable(
  "ifood_reconciliation_imports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    competence: text("competence").notNull(),
    ordersCount: integer("orders_count"),
    grossAmount: numeric("gross_amount", { precision: 14, scale: 2 }),
    feesAmount: numeric("fees_amount", { precision: 14, scale: 2 }),
    netAmount: numeric("net_amount", { precision: 14, scale: 2 }),
    downloadUrl: text("download_url"),
    summaryJson: text("summary_json"),
    importedAt: timestamp("imported_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("ifood_reconciliation_unique").on(t.tenantId, t.competence)],
);

export const ifoodInboundEvents = pgTable("ifood_inbound_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  externalOrderId: text("external_order_id"),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
  payload: text("payload").notNull().default("{}"),
  source: text("source").notNull().default("webhook"),
  ifoodEventId: text("ifood_event_id"),
  processed: boolean("processed").notNull().default(false),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles, { fields: [users.id], references: [profiles.id] }),
  roles: many(userRoles),
  sessions: many(sessions),
}));

export const tenantsRelations = relations(tenants, ({ many }) => ({
  stores: many(stores),
  drivers: many(drivers),
  orders: many(orders),
  roles: many(userRoles),
  menuCategories: many(menuCategories),
  menuItems: many(menuItems),
}));

export const menuCategoriesRelations = relations(menuCategories, ({ one, many }) => ({
  tenant: one(tenants, { fields: [menuCategories.tenantId], references: [tenants.id] }),
  items: many(menuItems),
}));

export const menuItemsRelations = relations(menuItems, ({ one, many }) => ({
  category: one(menuCategories, {
    fields: [menuItems.categoryId],
    references: [menuCategories.id],
  }),
  tenant: one(tenants, { fields: [menuItems.tenantId], references: [tenants.id] }),
  variations: many(menuItemVariations),
  addons: many(menuItemAddons),
}));

export const menuItemVariationsRelations = relations(menuItemVariations, ({ one }) => ({
  menuItem: one(menuItems, {
    fields: [menuItemVariations.menuItemId],
    references: [menuItems.id],
  }),
}));

export const menuItemAddonsRelations = relations(menuItemAddons, ({ one }) => ({
  menuItem: one(menuItems, {
    fields: [menuItemAddons.menuItemId],
    references: [menuItems.id],
  }),
}));

export const tenantMenuSettingsRelations = relations(tenantMenuSettings, ({ one }) => ({
  tenant: one(tenants, { fields: [tenantMenuSettings.tenantId], references: [tenants.id] }),
}));

export const ordersRelations = relations(orders, ({ many, one }) => ({
  lineItems: many(orderLineItems),
  payments: many(payments),
  driver: one(drivers, { fields: [orders.driverId], references: [drivers.id] }),
}));

export const orderLineItemsRelations = relations(orderLineItems, ({ one }) => ({
  order: one(orders, { fields: [orderLineItems.orderId], references: [orders.id] }),
}));
