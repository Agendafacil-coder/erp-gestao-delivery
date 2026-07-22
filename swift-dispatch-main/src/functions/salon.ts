/**
 * Módulo Salão — mesas e comandas (feature flag salon_mode).
 * Rodadas de pedido reutilizam a tabela orders (channel "salao", fulfillment "dine_in", tab_id).
 * Não altera nenhum fluxo de delivery.
 */
import { createServerFn } from "@tanstack/react-start";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { getDb, type Db } from "@/db/connection.server";
import { schema } from "@/db";
import { assertRole } from "@/lib/rbac";
import { normalizeOrderStatus } from "@/lib/ops/orderWorkflow";
import { aggregateMenuItemQuantities, validateMenuStock } from "@/lib/menu/menu-stock";
import { deductMenuStock, restoreMenuStockForOrder } from "@/lib/menu/menu-stock.server";
import { deductRecipeStock, restoreRecipeStockForOrder } from "@/lib/menu/recipe-stock.server";
import { assertTenantFeatureEnabled } from "@/lib/tenant/featureFlags.server";
import type { CartLine } from "./publicOrders";
import { requireSessionUser } from "./session";
import type { SessionUser } from "./session";

const SALON_MANAGEMENT_ROLES = ["owner", "admin", "manager", "dispatcher", "cashier"] as const;
const SALON_SERVICE_ROLES = [...SALON_MANAGEMENT_ROLES, "waiter"] as const;

async function assertSalonEnabled(tenantId: string) {
  await assertTenantFeatureEnabled(tenantId, "salon_mode");
}

export type SalonTabStatus = "aberta" | "conta_pedida" | "paga" | "cancelada";

export type SalonTableItem = {
  id: string;
  name: string;
  capacity: number;
  area: string | null;
  sort_order: number;
  active: boolean;
  public_token: string | null;
  open_tabs: Array<{
    id: string;
    code: string;
    status: SalonTabStatus;
    customer_name: string | null;
    people_count: number;
    opened_at: string;
    total: number;
    rounds_count: number;
  }>;
};

export type SalonTabRound = {
  id: string;
  code: string;
  status: string;
  placed_at: string;
  total_amount: number;
  notes: string | null;
  items: Array<{ name: string; quantity: number; unit_price: number; notes: string | null }>;
};

export type SalonTabDetail = {
  id: string;
  code: string;
  status: SalonTabStatus;
  table_id: string | null;
  table_name: string | null;
  customer_name: string | null;
  people_count: number;
  service_fee_percent: number;
  discount_amount: number;
  payment_method: string | null;
  notes: string | null;
  opened_at: string;
  closed_at: string | null;
  rounds: SalonTabRound[];
  subtotal: number;
  service_fee: number;
  total: number;
};

async function assertTenantAccess(userId: string, tenantId: string) {
  const db = getDb();
  const [row] = await db
    .select({ id: schema.userRoles.id })
    .from(schema.userRoles)
    .where(and(eq(schema.userRoles.userId, userId), eq(schema.userRoles.tenantId, tenantId)))
    .limit(1);
  if (!row) throw new Error("Sem permissão para este tenant");
}

function assertCanManageSalon(user: SessionUser, tenantId: string) {
  assertRole(
    user,
    tenantId,
    [...SALON_MANAGEMENT_ROLES],
    "Somente caixa ou gerência pode executar esta ação",
  );
}

function assertCanServeSalon(user: SessionUser, tenantId: string) {
  return assertRole(
    user,
    tenantId,
    [...SALON_SERVICE_ROLES],
    "Sem permissão para atender mesas",
  );
}

function isTabOpen(status: string): boolean {
  return status === "aberta" || status === "conta_pedida";
}

/** Soma das rodadas não canceladas da comanda. */
async function computeTabSubtotal(tabId: string): Promise<number> {
  const db = getDb();
  const rows = await db
    .select({ status: schema.orders.status, totalAmount: schema.orders.totalAmount })
    .from(schema.orders)
    .where(eq(schema.orders.tabId, tabId));
  return rows
    .filter((r) => normalizeOrderStatus(r.status) !== "cancelado")
    .reduce((sum, r) => sum + Number(r.totalAmount), 0);
}

function computeTotals(tab: {
  serviceFeePercent: string;
  discountAmount: string;
}, subtotal: number) {
  const feePercent = Number(tab.serviceFeePercent);
  const discount = Number(tab.discountAmount);
  const serviceFee = (subtotal * feePercent) / 100;
  const total = Math.max(0, subtotal + serviceFee - discount);
  return { serviceFee, total };
}

async function nextTabCode(tenantId: string): Promise<string> {
  const db = getDb();
  const rows = await db
    .select({ code: schema.salonTabs.code })
    .from(schema.salonTabs)
    .where(eq(schema.salonTabs.tenantId, tenantId));
  const nums = rows
    .map((r) => parseInt(r.code.replace(/\D/g, ""), 10))
    .filter((n) => Number.isFinite(n));
  const next = (nums.length > 0 ? Math.max(...nums) : 0) + 1;
  return `M-${String(next).padStart(4, "0")}`;
}

// ---------------------------------------------------------------------------
// Mesas
// ---------------------------------------------------------------------------

export const listSalonTablesFn = createServerFn({ method: "GET" })
  .inputValidator((data: { tenantId: string }) => data)
  .handler(async ({ data }): Promise<SalonTableItem[]> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    await assertSalonEnabled(data.tenantId);

    const db = getDb();
    const tables = await db
      .select()
      .from(schema.salonTables)
      .where(eq(schema.salonTables.tenantId, data.tenantId))
      .orderBy(asc(schema.salonTables.sortOrder), asc(schema.salonTables.name));

    const openTabs = await db
      .select()
      .from(schema.salonTabs)
      .where(
        and(
          eq(schema.salonTabs.tenantId, data.tenantId),
          inArray(schema.salonTabs.status, ["aberta", "conta_pedida"]),
        ),
      );

    const tabIds = openTabs.map((t) => t.id);
    const rounds =
      tabIds.length > 0
        ? await db
            .select({
              tabId: schema.orders.tabId,
              status: schema.orders.status,
              totalAmount: schema.orders.totalAmount,
            })
            .from(schema.orders)
            .where(inArray(schema.orders.tabId, tabIds))
        : [];

    return tables.map((tb) => {
      const tableTabs = openTabs.filter((tab) => tab.tableId === tb.id);
      const openTabsForTable: SalonTableItem["open_tabs"] = tableTabs.map((tab) => {
        const tabRounds = rounds.filter(
          (r) => r.tabId === tab.id && normalizeOrderStatus(r.status) !== "cancelado",
        );
        const subtotal = tabRounds.reduce((s, r) => s + Number(r.totalAmount), 0);
        const { total } = computeTotals(tab, subtotal);
        return {
          id: tab.id,
          code: tab.code,
          status: tab.status as SalonTabStatus,
          customer_name: tab.customerName,
          people_count: tab.peopleCount,
          opened_at: tab.openedAt.toISOString(),
          total,
          rounds_count: tabRounds.length,
        };
      });
      return {
        id: tb.id,
        name: tb.name,
        capacity: tb.capacity,
        area: tb.area,
        sort_order: tb.sortOrder,
        active: tb.active,
        public_token: tb.publicToken ?? null,
        open_tabs: openTabsForTable,
      };
    });
  });

export const createSalonTableFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { tenantId: string; name: string; capacity?: number; area?: string }) => data,
  )
  .handler(async ({ data }): Promise<{ id: string }> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    await assertSalonEnabled(data.tenantId);
    assertCanManageSalon(user, data.tenantId);

    const rawNumber = data.name.trim();
    if (!/^\d+$/.test(rawNumber) || Number(rawNumber) < 1 || Number(rawNumber) > 9999) {
      throw new Error("Informe um número de mesa válido");
    }
    const name = String(Number(rawNumber));

    const db = getDb();
    try {
      const [row] = await db
        .insert(schema.salonTables)
        .values({
          tenantId: data.tenantId,
          name,
          sortOrder: Number(name),
          capacity: Math.max(1, Math.min(data.capacity ?? 4, 50)),
          area: data.area?.trim() || null,
        })
        .returning({ id: schema.salonTables.id });
      return { id: row.id };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("salon_tables_tenant_name") || msg.includes("duplicate")) {
        throw new Error(`Já existe uma mesa chamada "${name}"`);
      }
      if (msg.includes("does not exist") || msg.includes("não existe")) {
        throw new Error(
          "Banco de dados desatualizado. Na pasta swift-dispatch-main, execute: npm run db:migrate",
        );
      }
      throw err;
    }
  });

export const updateSalonTableFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      tenantId: string;
      tableId: string;
      name?: string;
      capacity?: number;
      area?: string | null;
      active?: boolean;
    }) => data,
  )
  .handler(async ({ data }): Promise<void> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    await assertSalonEnabled(data.tenantId);
    assertCanManageSalon(user, data.tenantId);

    const db = getDb();

    if (data.active === false) {
      const [openTab] = await db
        .select({ id: schema.salonTabs.id })
        .from(schema.salonTabs)
        .where(
          and(
            eq(schema.salonTabs.tenantId, data.tenantId),
            eq(schema.salonTabs.tableId, data.tableId),
            inArray(schema.salonTabs.status, ["aberta", "conta_pedida"]),
          ),
        )
        .limit(1);
      if (openTab) throw new Error("Feche a comanda antes de desativar a mesa");
    }

    const updates: Partial<typeof schema.salonTables.$inferInsert> = { updatedAt: new Date() };
    if (data.name !== undefined) {
      const rawNumber = data.name.trim();
      if (!/^\d+$/.test(rawNumber) || Number(rawNumber) < 1 || Number(rawNumber) > 9999) {
        throw new Error("Informe um número de mesa válido");
      }
      const name = String(Number(rawNumber));
      updates.name = name;
      updates.sortOrder = Number(name);
    }
    if (data.capacity !== undefined) updates.capacity = Math.max(1, Math.min(data.capacity, 50));
    if (data.area !== undefined) updates.area = data.area?.trim() || null;
    if (data.active !== undefined) updates.active = data.active;

    await db
      .update(schema.salonTables)
      .set(updates)
      .where(
        and(
          eq(schema.salonTables.id, data.tableId),
          eq(schema.salonTables.tenantId, data.tenantId),
        ),
      );
  });

export const deleteSalonTableFn = createServerFn({ method: "POST" })
  .inputValidator((data: { tenantId: string; tableId: string }) => data)
  .handler(async ({ data }): Promise<void> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    await assertSalonEnabled(data.tenantId);
    assertCanManageSalon(user, data.tenantId);

    const db = getDb();
    const [openTab] = await db
      .select({ id: schema.salonTabs.id })
      .from(schema.salonTabs)
      .where(
        and(
          eq(schema.salonTabs.tenantId, data.tenantId),
          eq(schema.salonTabs.tableId, data.tableId),
          inArray(schema.salonTabs.status, ["aberta", "conta_pedida"]),
        ),
      )
      .limit(1);
    if (openTab) {
      throw new Error("Feche ou cancele todas as comandas antes de excluir a mesa");
    }

    const deleted = await db
      .delete(schema.salonTables)
      .where(
        and(
          eq(schema.salonTables.id, data.tableId),
          eq(schema.salonTables.tenantId, data.tenantId),
        ),
      )
      .returning({ id: schema.salonTables.id });
    if (deleted.length === 0) throw new Error("Mesa não encontrada");
  });

// ---------------------------------------------------------------------------
// Comandas
// ---------------------------------------------------------------------------

export const openSalonTabFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      tenantId: string;
      tableId?: string | null;
      customerName?: string;
      peopleCount?: number;
    }) => data,
  )
  .handler(async ({ data }): Promise<{ id: string; code: string }> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    await assertSalonEnabled(data.tenantId);
    assertCanServeSalon(user, data.tenantId);

    const db = getDb();

    if (data.tableId) {
      const [table] = await db
        .select()
        .from(schema.salonTables)
        .where(
          and(
            eq(schema.salonTables.id, data.tableId),
            eq(schema.salonTables.tenantId, data.tenantId),
          ),
        )
        .limit(1);
      if (!table) throw new Error("Mesa não encontrada");
      if (!table.active) throw new Error("Mesa desativada");

    }

    const code = await nextTabCode(data.tenantId);
    const [row] = await db
      .insert(schema.salonTabs)
      .values({
        tenantId: data.tenantId,
        tableId: data.tableId ?? null,
        code,
        customerName: data.customerName?.trim() || null,
        peopleCount: Math.max(1, Math.min(data.peopleCount ?? 1, 99)),
        status: "aberta",
        openedBy: user.id,
      })
      .returning({ id: schema.salonTabs.id, code: schema.salonTabs.code });

    return { id: row.id, code: row.code };
  });

export const getSalonTabDetailFn = createServerFn({ method: "GET" })
  .inputValidator((data: { tenantId: string; tabId: string }) => data)
  .handler(async ({ data }): Promise<SalonTabDetail | null> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    await assertSalonEnabled(data.tenantId);

    const db = getDb();
    const [tab] = await db
      .select()
      .from(schema.salonTabs)
      .where(
        and(eq(schema.salonTabs.id, data.tabId), eq(schema.salonTabs.tenantId, data.tenantId)),
      )
      .limit(1);
    if (!tab) return null;

    let tableName: string | null = null;
    if (tab.tableId) {
      const [table] = await db
        .select({ name: schema.salonTables.name })
        .from(schema.salonTables)
        .where(eq(schema.salonTables.id, tab.tableId))
        .limit(1);
      tableName = table?.name ?? null;
    }

    const orders = await db
      .select({
        id: schema.orders.id,
        code: schema.orders.code,
        status: schema.orders.status,
        placedAt: schema.orders.placedAt,
        totalAmount: schema.orders.totalAmount,
        notes: schema.orders.notes,
      })
      .from(schema.orders)
      .where(eq(schema.orders.tabId, tab.id))
      .orderBy(desc(schema.orders.placedAt));

    const orderIds = orders.map((o) => o.id);
    const lineItems =
      orderIds.length > 0
        ? await db
            .select()
            .from(schema.orderLineItems)
            .where(inArray(schema.orderLineItems.orderId, orderIds))
        : [];

    const rounds: SalonTabRound[] = orders.map((o) => ({
      id: o.id,
      code: o.code,
      status: normalizeOrderStatus(o.status),
      placed_at: o.placedAt.toISOString(),
      total_amount: Number(o.totalAmount),
      notes: o.notes,
      items: lineItems
        .filter((li) => li.orderId === o.id)
        .map((li) => ({
          name: li.name,
          quantity: li.quantity,
          unit_price: Number(li.unitPrice),
          notes: li.notes,
        })),
    }));

    const subtotal = rounds
      .filter((r) => r.status !== "cancelado")
      .reduce((s, r) => s + r.total_amount, 0);
    const { serviceFee, total } = computeTotals(tab, subtotal);

    return {
      id: tab.id,
      code: tab.code,
      status: tab.status as SalonTabStatus,
      table_id: tab.tableId,
      table_name: tableName,
      customer_name: tab.customerName,
      people_count: tab.peopleCount,
      service_fee_percent: Number(tab.serviceFeePercent),
      discount_amount: Number(tab.discountAmount),
      payment_method: tab.paymentMethod,
      notes: tab.notes,
      opened_at: tab.openedAt.toISOString(),
      closed_at: tab.closedAt?.toISOString() ?? null,
      rounds,
      subtotal,
      service_fee: serviceFee,
      total,
    };
  });

export const updateSalonTabFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      tenantId: string;
      tabId: string;
      customerName?: string;
      peopleCount?: number;
      serviceFeePercent?: number;
      discountAmount?: number;
      notes?: string;
      status?: "aberta" | "conta_pedida";
    }) => data,
  )
  .handler(async ({ data }): Promise<void> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    await assertSalonEnabled(data.tenantId);
    const role = assertCanServeSalon(user, data.tenantId);

    // Validação em runtime: o inputValidator não restringe o valor recebido.
    if (data.status !== undefined && data.status !== "aberta" && data.status !== "conta_pedida") {
      throw new Error("Status inválido — use fechar/cancelar comanda para encerrar");
    }

    if (role === "waiter") {
      if (data.serviceFeePercent !== undefined || data.discountAmount !== undefined) {
        throw new Error("Garçom não pode alterar taxa de serviço ou desconto");
      }
      if (data.status !== undefined && data.status !== "conta_pedida") {
        throw new Error("Garçom pode apenas solicitar a conta");
      }
    }

    const db = getDb();
    const [tab] = await db
      .select()
      .from(schema.salonTabs)
      .where(
        and(eq(schema.salonTabs.id, data.tabId), eq(schema.salonTabs.tenantId, data.tenantId)),
      )
      .limit(1);
    if (!tab) throw new Error("Comanda não encontrada");
    if (!isTabOpen(tab.status)) throw new Error("Comanda já fechada");

    const updates: Partial<typeof schema.salonTabs.$inferInsert> = { updatedAt: new Date() };
    if (data.customerName !== undefined) updates.customerName = data.customerName.trim() || null;
    if (data.peopleCount !== undefined)
      updates.peopleCount = Math.max(1, Math.min(data.peopleCount, 99));
    if (data.serviceFeePercent !== undefined) {
      const pct = Math.max(0, Math.min(data.serviceFeePercent, 30));
      updates.serviceFeePercent = String(pct);
    }
    if (data.discountAmount !== undefined) {
      updates.discountAmount = String(Math.max(0, data.discountAmount).toFixed(2));
    }
    if (data.notes !== undefined) updates.notes = data.notes.trim() || null;
    if (data.status !== undefined) updates.status = data.status;

    await db
      .update(schema.salonTabs)
      .set(updates)
      .where(eq(schema.salonTabs.id, data.tabId));
  });

/** Lança uma rodada de pedidos na comanda — vai direto para a fila da cozinha (KDS). */
export const addSalonTabRoundFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { tenantId: string; tabId: string; lines: CartLine[]; notes?: string }) => data,
  )
  .handler(async ({ data }): Promise<{ orderId: string; code: string }> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    await assertSalonEnabled(data.tenantId);
    assertCanServeSalon(user, data.tenantId);

    if (!data.lines?.length) throw new Error("Selecione ao menos um item do cardápio");

    const db = getDb();
    const [tab] = await db
      .select()
      .from(schema.salonTabs)
      .where(
        and(eq(schema.salonTabs.id, data.tabId), eq(schema.salonTabs.tenantId, data.tenantId)),
      )
      .limit(1);
    if (!tab) throw new Error("Comanda não encontrada");
    if (!isTabOpen(tab.status)) throw new Error("Comanda já fechada — abra uma nova");

    let tableName: string | null = null;
    if (tab.tableId) {
      const [table] = await db
        .select({ name: schema.salonTables.name })
        .from(schema.salonTables)
        .where(eq(schema.salonTables.id, tab.tableId))
        .limit(1);
      tableName = table?.name ?? null;
    }

    const itemIds = [...new Set(data.lines.map((l) => l.menu_item_id))];
    const menuItems = await db
      .select({
        id: schema.menuItems.id,
        name: schema.menuItems.name,
        available: schema.menuItems.available,
        stockQuantity: schema.menuItems.stockQuantity,
      })
      .from(schema.menuItems)
      .where(
        and(eq(schema.menuItems.tenantId, data.tenantId), inArray(schema.menuItems.id, itemIds)),
      );
    const stockQty = aggregateMenuItemQuantities(data.lines);
    validateMenuStock(menuItems, stockQty);

    const existingRounds = await db
      .select({ id: schema.orders.id })
      .from(schema.orders)
      .where(eq(schema.orders.tabId, tab.id));
    const roundNumber = existingRounds.length + 1;

    const itemsCount = data.lines.reduce((s, l) => s + l.quantity, 0);
    const subtotal = data.lines.reduce((s, l) => s + l.unit_price * l.quantity, 0);
    const label = tableName ? `Mesa ${tableName}` : `Comanda ${tab.code}`;

    const created = await db.transaction(async (tx) => {
      const [orderRow] = await tx
        .insert(schema.orders)
        .values({
          tenantId: data.tenantId,
          tabId: tab.id,
          code: `${tab.code}.${roundNumber}`,
          status: "novo",
          priority: "normal",
          customerName: tab.customerName?.trim() || label,
          customerPhone: null,
          address: `${label} · Salão`,
          itemsCount,
          subtotalAmount: String(subtotal.toFixed(2)),
          deliveryFee: "0",
          discountAmount: "0",
          totalAmount: String(subtotal.toFixed(2)),
          fulfillmentType: "dine_in",
          channel: "salao",
          notes: data.notes?.trim() || null,
          slaMinutes: 30,
          paymentStatus: "pendente",
        })
        .returning();

      for (const line of data.lines) {
        await tx.insert(schema.orderLineItems).values({
          orderId: orderRow.id,
          menuItemId: line.menu_item_id,
          name: line.name,
          quantity: line.quantity,
          unitPrice: String(line.unit_price),
          notes: line.notes?.trim() || null,
        });
      }

      await deductMenuStock(tx as unknown as Db, data.tenantId, stockQty);
      await deductRecipeStock(tx as unknown as Db, data.tenantId, stockQty);

      await tx.insert(schema.orderEvents).values({
        orderId: orderRow.id,
        tenantId: data.tenantId,
        actorId: user.id,
        toStatus: "novo",
        note: `Rodada ${roundNumber} — ${label}`,
      });

      return orderRow;
    });

    await db
      .update(schema.salonTabs)
      .set({ updatedAt: new Date() })
      .where(eq(schema.salonTabs.id, tab.id));

    return { orderId: created.id, code: created.code };
  });

/** Fecha a comanda: marca rodadas ativas como servidas, registra pagamento e libera a mesa. */
export const closeSalonTabFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { tenantId: string; tabId: string; paymentMethod: string; discountAmount?: number }) =>
      data,
  )
  .handler(async ({ data }): Promise<{ total: number }> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    await assertSalonEnabled(data.tenantId);
    assertCanManageSalon(user, data.tenantId);

    const db = getDb();
    const [tab] = await db
      .select()
      .from(schema.salonTabs)
      .where(
        and(eq(schema.salonTabs.id, data.tabId), eq(schema.salonTabs.tenantId, data.tenantId)),
      )
      .limit(1);
    if (!tab) throw new Error("Comanda não encontrada");
    if (!isTabOpen(tab.status)) throw new Error("Comanda já fechada");

    if (data.discountAmount !== undefined) {
      tab.discountAmount = String(Math.max(0, data.discountAmount).toFixed(2));
    }

    const subtotal = await computeTabSubtotal(tab.id);
    if (subtotal <= 0) {
      throw new Error("Comanda sem consumo — cancele a comanda em vez de fechar");
    }
    const { total } = computeTotals(tab, subtotal);

    const rounds = await db
      .select({ id: schema.orders.id, status: schema.orders.status })
      .from(schema.orders)
      .where(eq(schema.orders.tabId, tab.id));

    const now = new Date();
    for (const round of rounds) {
      const norm = normalizeOrderStatus(round.status);
      if (norm === "cancelado") continue;
      const updates: Partial<typeof schema.orders.$inferInsert> = {
        paymentStatus: "pago",
        paymentMethod: data.paymentMethod,
        updatedAt: now,
      };
      if (norm !== "entregue") {
        updates.status = "entregue";
        updates.deliveredAt = now;
        await db.insert(schema.orderEvents).values({
          orderId: round.id,
          tenantId: data.tenantId,
          actorId: user.id,
          fromStatus: norm,
          toStatus: "entregue",
          note: "Comanda fechada no caixa",
        });
      }
      await db.update(schema.orders).set(updates).where(eq(schema.orders.id, round.id));
    }

    await db
      .update(schema.salonTabs)
      .set({
        status: "paga",
        paymentMethod: data.paymentMethod,
        discountAmount: tab.discountAmount,
        closedAt: now,
        updatedAt: now,
      })
      .where(eq(schema.salonTabs.id, tab.id));

    return { total };
  });

/** Cancela a comanda inteira: cancela rodadas ativas e devolve estoque. */
export const cancelSalonTabFn = createServerFn({ method: "POST" })
  .inputValidator((data: { tenantId: string; tabId: string }) => data)
  .handler(async ({ data }): Promise<void> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    await assertSalonEnabled(data.tenantId);
    assertCanManageSalon(user, data.tenantId);

    const db = getDb();
    const [tab] = await db
      .select()
      .from(schema.salonTabs)
      .where(
        and(eq(schema.salonTabs.id, data.tabId), eq(schema.salonTabs.tenantId, data.tenantId)),
      )
      .limit(1);
    if (!tab) throw new Error("Comanda não encontrada");
    if (!isTabOpen(tab.status)) throw new Error("Comanda já fechada");

    const rounds = await db
      .select({ id: schema.orders.id, status: schema.orders.status })
      .from(schema.orders)
      .where(eq(schema.orders.tabId, tab.id));

    const now = new Date();
    for (const round of rounds) {
      const norm = normalizeOrderStatus(round.status);
      if (norm === "cancelado" || norm === "entregue") continue;
      await db
        .update(schema.orders)
        .set({ status: "cancelado", updatedAt: now })
        .where(eq(schema.orders.id, round.id));
      await db.insert(schema.orderEvents).values({
        orderId: round.id,
        tenantId: data.tenantId,
        actorId: user.id,
        fromStatus: norm,
        toStatus: "cancelado",
        note: "Comanda cancelada",
      });
      try {
        await restoreMenuStockForOrder(db, data.tenantId, round.id);
        await restoreRecipeStockForOrder(db, data.tenantId, round.id);
      } catch {
        /* restauração de estoque não bloqueia cancelamento */
      }
    }

    await db
      .update(schema.salonTabs)
      .set({ status: "cancelada", closedAt: now, updatedAt: now })
      .where(eq(schema.salonTabs.id, tab.id));
  });

/** Move comanda aberta para outra mesa. */
export const transferSalonTabFn = createServerFn({ method: "POST" })
  .inputValidator((data: { tenantId: string; tabId: string; tableId: string }) => data)
  .handler(async ({ data }): Promise<void> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    await assertSalonEnabled(data.tenantId);
    assertCanServeSalon(user, data.tenantId);

    const db = getDb();
    const [tab] = await db
      .select()
      .from(schema.salonTabs)
      .where(
        and(eq(schema.salonTabs.id, data.tabId), eq(schema.salonTabs.tenantId, data.tenantId)),
      )
      .limit(1);
    if (!tab) throw new Error("Comanda não encontrada");
    if (!isTabOpen(tab.status)) throw new Error("Comanda já fechada");

    const [table] = await db
      .select()
      .from(schema.salonTables)
      .where(
        and(
          eq(schema.salonTables.id, data.tableId),
          eq(schema.salonTables.tenantId, data.tenantId),
        ),
      )
      .limit(1);
    if (!table) throw new Error("Mesa destino não encontrada");
    if (!table.active) throw new Error("Mesa destino desativada");

    await db
      .update(schema.salonTabs)
      .set({ tableId: data.tableId, updatedAt: new Date() })
      .where(eq(schema.salonTabs.id, data.tabId));
  });

/**
 * Divide comanda: cria nova comanda e move rodadas selecionadas.
 * Ideal para “conta separada” sem re-lançar itens.
 */
export const splitSalonTabFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      tenantId: string;
      tabId: string;
      orderIds: string[];
      targetTableId?: string | null;
      customerName?: string;
    }) => data,
  )
  .handler(async ({ data }): Promise<{ id: string; code: string }> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    await assertSalonEnabled(data.tenantId);
    assertCanManageSalon(user, data.tenantId);

    if (!data.orderIds?.length) throw new Error("Selecione ao menos uma rodada para separar");

    const db = getDb();
    const [tab] = await db
      .select()
      .from(schema.salonTabs)
      .where(
        and(eq(schema.salonTabs.id, data.tabId), eq(schema.salonTabs.tenantId, data.tenantId)),
      )
      .limit(1);
    if (!tab) throw new Error("Comanda não encontrada");
    if (!isTabOpen(tab.status)) throw new Error("Comanda já fechada");

    const rounds = await db
      .select({ id: schema.orders.id })
      .from(schema.orders)
      .where(
        and(
          eq(schema.orders.tabId, tab.id),
          eq(schema.orders.tenantId, data.tenantId),
          inArray(schema.orders.id, data.orderIds),
        ),
      );

    if (rounds.length !== data.orderIds.length) {
      throw new Error("Uma ou mais rodadas não pertencem a esta comanda");
    }

    const remaining = await db
      .select({ id: schema.orders.id })
      .from(schema.orders)
      .where(eq(schema.orders.tabId, tab.id));
    if (remaining.length <= rounds.length) {
      throw new Error("Deixe ao menos uma rodada na comanda original");
    }

    let targetTableId = data.targetTableId ?? tab.tableId ?? null;
    if (data.targetTableId) {
      const [table] = await db
        .select()
        .from(schema.salonTables)
        .where(
          and(
            eq(schema.salonTables.id, data.targetTableId),
            eq(schema.salonTables.tenantId, data.tenantId),
          ),
        )
        .limit(1);
      if (!table) throw new Error("Mesa destino não encontrada");
      if (!table.active) throw new Error("Mesa destino desativada");
      targetTableId = table.id;
    }

    const code = await nextTabCode(data.tenantId);
    const [newTab] = await db
      .insert(schema.salonTabs)
      .values({
        tenantId: data.tenantId,
        tableId: targetTableId,
        code,
        customerName: data.customerName?.trim() || tab.customerName,
        peopleCount: 1,
        status: "aberta",
        openedBy: user.id,
        serviceFeePercent: tab.serviceFeePercent,
      })
      .returning({ id: schema.salonTabs.id, code: schema.salonTabs.code });

    await db
      .update(schema.orders)
      .set({ tabId: newTab.id, updatedAt: new Date() })
      .where(inArray(schema.orders.id, data.orderIds));

    return { id: newTab.id, code: newTab.code };
  });
