import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type {
  FinancialCostSetting,
  FinancialDailyClosing,
  FinancialExpense,
  FinancialExpenseCategory,
  FinancialCostType,
} from "@/lib/finance/types";
import { requireSessionUser } from "./session";

async function assertTenantAccess(userId: string, tenantId: string) {
  const db = getDb();
  const [row] = await db
    .select({ id: schema.userRoles.id })
    .from(schema.userRoles)
    .where(and(eq(schema.userRoles.userId, userId), eq(schema.userRoles.tenantId, tenantId)))
    .limit(1);
  if (!row) throw new Error("Sem permissão para este tenant");
}

function mapExpense(row: typeof schema.financialExpenses.$inferSelect): FinancialExpense {
  return {
    id: row.id,
    tenant_id: row.tenantId,
    description: row.description,
    amount: Number(row.amount),
    category: row.category as FinancialExpenseCategory,
    expense_date: row.expenseDate.toISOString(),
    notes: row.notes,
    created_at: row.createdAt.toISOString(),
  };
}

function mapCost(row: typeof schema.financialCostSettings.$inferSelect): FinancialCostSetting {
  return {
    id: row.id,
    tenant_id: row.tenantId,
    name: row.name,
    amount: Number(row.amount),
    cost_type: row.costType as FinancialCostType,
    active: row.active,
    notes: row.notes,
  };
}

function mapClosing(row: typeof schema.financialDailyClosings.$inferSelect): FinancialDailyClosing {
  return {
    id: row.id,
    tenant_id: row.tenantId,
    closing_date: row.closingDate.toISOString(),
    revenue: Number(row.revenue),
    delivery_fees: Number(row.deliveryFees),
    expenses_total: Number(row.expensesTotal),
    fixed_costs: Number(row.fixedCosts),
    variable_costs: Number(row.variableCosts),
    estimated_profit: Number(row.estimatedProfit),
    orders_delivered: row.ordersDelivered,
    notes: row.notes,
    created_at: row.createdAt.toISOString(),
  };
}

export const listFinancialExpensesFn = createServerFn({ method: "GET" })
  .inputValidator((data: { tenantId: string; from?: string; to?: string }) => data)
  .handler(async ({ data }): Promise<FinancialExpense[]> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    const db = getDb();
    const conditions = [eq(schema.financialExpenses.tenantId, data.tenantId)];
    if (data.from) {
      conditions.push(gte(schema.financialExpenses.expenseDate, new Date(data.from)));
    }
    if (data.to) {
      const to = new Date(data.to);
      to.setHours(23, 59, 59, 999);
      conditions.push(lte(schema.financialExpenses.expenseDate, to));
    }
    const rows = await db
      .select()
      .from(schema.financialExpenses)
      .where(and(...conditions))
      .orderBy(desc(schema.financialExpenses.expenseDate));
    return rows.map(mapExpense);
  });

export const createFinancialExpenseFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      tenantId: string;
      description: string;
      amount: number;
      category?: FinancialExpenseCategory;
      expense_date?: string;
      notes?: string;
    }) => data,
  )
  .handler(async ({ data }): Promise<FinancialExpense> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    const db = getDb();
    const [created] = await db
      .insert(schema.financialExpenses)
      .values({
        tenantId: data.tenantId,
        description: data.description,
        amount: String(data.amount),
        category: data.category ?? "manual",
        expenseDate: data.expense_date ? new Date(data.expense_date) : new Date(),
        notes: data.notes,
        createdBy: user.id,
      })
      .returning();
    return mapExpense(created);
  });

export const deleteFinancialExpenseFn = createServerFn({ method: "POST" })
  .inputValidator((data: { tenantId: string; expenseId: string }) => data)
  .handler(async ({ data }): Promise<void> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    const db = getDb();
    await db
      .delete(schema.financialExpenses)
      .where(
        and(
          eq(schema.financialExpenses.id, data.expenseId),
          eq(schema.financialExpenses.tenantId, data.tenantId),
        ),
      );
  });

export const listFinancialCostSettingsFn = createServerFn({ method: "GET" })
  .inputValidator((data: { tenantId: string }) => data)
  .handler(async ({ data }): Promise<FinancialCostSetting[]> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    const db = getDb();
    const rows = await db
      .select()
      .from(schema.financialCostSettings)
      .where(eq(schema.financialCostSettings.tenantId, data.tenantId));
    return rows.map(mapCost);
  });

export const upsertFinancialCostSettingFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      tenantId: string;
      id?: string;
      name: string;
      amount: number;
      cost_type: FinancialCostType;
      active?: boolean;
      notes?: string;
    }) => data,
  )
  .handler(async ({ data }): Promise<FinancialCostSetting> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    const db = getDb();
    const values = {
      tenantId: data.tenantId,
      name: data.name,
      amount: String(data.amount),
      costType: data.cost_type,
      active: data.active ?? true,
      notes: data.notes,
      updatedAt: new Date(),
    };
    if (data.id) {
      const [updated] = await db
        .update(schema.financialCostSettings)
        .set(values)
        .where(
          and(
            eq(schema.financialCostSettings.id, data.id),
            eq(schema.financialCostSettings.tenantId, data.tenantId),
          ),
        )
        .returning();
      if (!updated) throw new Error("Custo não encontrado");
      return mapCost(updated);
    }
    const [created] = await db.insert(schema.financialCostSettings).values(values).returning();
    return mapCost(created);
  });

export const deleteFinancialCostSettingFn = createServerFn({ method: "POST" })
  .inputValidator((data: { tenantId: string; costId: string }) => data)
  .handler(async ({ data }): Promise<void> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    const db = getDb();
    await db
      .delete(schema.financialCostSettings)
      .where(
        and(
          eq(schema.financialCostSettings.id, data.costId),
          eq(schema.financialCostSettings.tenantId, data.tenantId),
        ),
      );
  });

export const listFinancialClosingsFn = createServerFn({ method: "GET" })
  .inputValidator((data: { tenantId: string }) => data)
  .handler(async ({ data }): Promise<FinancialDailyClosing[]> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    const db = getDb();
    const rows = await db
      .select()
      .from(schema.financialDailyClosings)
      .where(eq(schema.financialDailyClosings.tenantId, data.tenantId))
      .orderBy(desc(schema.financialDailyClosings.closingDate));
    return rows.map(mapClosing);
  });

export const createFinancialClosingFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      tenantId: string;
      closing_date: string;
      revenue: number;
      delivery_fees: number;
      expenses_total: number;
      fixed_costs: number;
      variable_costs: number;
      estimated_profit: number;
      orders_delivered: number;
      snapshot?: string;
      notes?: string;
    }) => data,
  )
  .handler(async ({ data }): Promise<FinancialDailyClosing> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    const db = getDb();
    const [created] = await db
      .insert(schema.financialDailyClosings)
      .values({
        tenantId: data.tenantId,
        closingDate: new Date(data.closing_date),
        revenue: String(data.revenue),
        deliveryFees: String(data.delivery_fees),
        expensesTotal: String(data.expenses_total),
        fixedCosts: String(data.fixed_costs),
        variableCosts: String(data.variable_costs),
        estimatedProfit: String(data.estimated_profit),
        ordersDelivered: data.orders_delivered,
        snapshot: data.snapshot,
        notes: data.notes,
        closedBy: user.id,
      })
      .returning();
    return mapClosing(created);
  });
