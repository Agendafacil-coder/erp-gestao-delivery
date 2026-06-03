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

export const paymentProviderEnum = pgEnum("payment_provider", ["mock", "stripe", "mercadopago", "asaas"]);

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
    neighborhood: text("neighborhood"),
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
  imageUrl: text("image_url"),
  available: boolean("available").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  isFeatured: boolean("is_featured").notNull().default(false),
  isCombo: boolean("is_combo").notNull().default(false),
  isDrink: boolean("is_drink").notNull().default(false),
  salesCount: integer("sales_count").notNull().default(0),
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
  category: one(menuCategories, { fields: [menuItems.categoryId], references: [menuCategories.id] }),
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
