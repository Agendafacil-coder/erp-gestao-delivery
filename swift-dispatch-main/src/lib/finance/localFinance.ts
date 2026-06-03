import { localDb, type LocalFinancialCostSetting, type LocalFinancialDailyClosing, type LocalFinancialExpense } from "@/lib/db/localDb";

const EXPENSES_KEY = "financial_expenses";
const COSTS_KEY = "financial_cost_settings";
const CLOSINGS_KEY = "financial_daily_closings";

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export const localFinance = {
  listExpenses(tenantId: string): LocalFinancialExpense[] {
    return localDb
      .get<LocalFinancialExpense>(EXPENSES_KEY)
      .filter((e) => e.tenant_id === tenantId)
      .sort((a, b) => b.expense_date.localeCompare(a.expense_date));
  },

  createExpense(
    data: Omit<LocalFinancialExpense, "id" | "created_at">,
  ): LocalFinancialExpense {
    const all = localDb.get<LocalFinancialExpense>(EXPENSES_KEY);
    const row: LocalFinancialExpense = {
      ...data,
      id: uid("exp"),
      created_at: new Date().toISOString(),
    };
    all.unshift(row);
    localDb.set(EXPENSES_KEY, all);
    return row;
  },

  deleteExpense(id: string, tenantId: string): void {
    const all = localDb.get<LocalFinancialExpense>(EXPENSES_KEY);
    localDb.set(
      EXPENSES_KEY,
      all.filter((e) => !(e.id === id && e.tenant_id === tenantId)),
    );
  },

  listCostSettings(tenantId: string): LocalFinancialCostSetting[] {
    return localDb.get<LocalFinancialCostSetting>(COSTS_KEY).filter((c) => c.tenant_id === tenantId);
  },

  upsertCostSetting(
    data: Omit<LocalFinancialCostSetting, "id"> & { id?: string },
  ): LocalFinancialCostSetting {
    const all = localDb.get<LocalFinancialCostSetting>(COSTS_KEY);
    if (data.id) {
      const idx = all.findIndex((c) => c.id === data.id && c.tenant_id === data.tenant_id);
      if (idx >= 0) {
        all[idx] = { ...all[idx], ...data };
        localDb.set(COSTS_KEY, all);
        return all[idx];
      }
    }
    const row: LocalFinancialCostSetting = { ...data, id: uid("cost") };
    all.push(row);
    localDb.set(COSTS_KEY, all);
    return row;
  },

  deleteCostSetting(id: string, tenantId: string): void {
    const all = localDb.get<LocalFinancialCostSetting>(COSTS_KEY);
    localDb.set(
      COSTS_KEY,
      all.filter((c) => !(c.id === id && c.tenant_id === tenantId)),
    );
  },

  listClosings(tenantId: string): LocalFinancialDailyClosing[] {
    return localDb
      .get<LocalFinancialDailyClosing>(CLOSINGS_KEY)
      .filter((c) => c.tenant_id === tenantId)
      .sort((a, b) => b.closing_date.localeCompare(a.closing_date));
  },

  createClosing(
    data: Omit<LocalFinancialDailyClosing, "id" | "created_at">,
  ): LocalFinancialDailyClosing {
    const all = localDb.get<LocalFinancialDailyClosing>(CLOSINGS_KEY);
    const row: LocalFinancialDailyClosing = {
      ...data,
      id: uid("close"),
      created_at: new Date().toISOString(),
    };
    all.unshift(row);
    localDb.set(CLOSINGS_KEY, all);
    return row;
  },
};
