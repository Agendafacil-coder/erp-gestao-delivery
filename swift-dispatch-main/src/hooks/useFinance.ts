import { useCallback, useEffect, useState } from "react";
import { USE_POSTGRES } from "@/lib/repositories";
import { localFinance } from "@/lib/finance/localFinance";
import type {
  FinancialCostSetting,
  FinancialDailyClosing,
  FinancialExpense,
  FinancialExpenseCategory,
  FinancialCostType,
} from "@/lib/finance/types";
import {
  createFinancialClosingFn,
  createFinancialExpenseFn,
  deleteFinancialCostSettingFn,
  deleteFinancialExpenseFn,
  listFinancialClosingsFn,
  listFinancialCostSettingsFn,
  listFinancialExpensesFn,
  upsertFinancialCostSettingFn,
} from "@/functions/finance";

export function useFinance(tenantId: string | undefined) {
  const [expenses, setExpenses] = useState<FinancialExpense[]>([]);
  const [costSettings, setCostSettings] = useState<FinancialCostSetting[]>([]);
  const [closings, setClosings] = useState<FinancialDailyClosing[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      if (USE_POSTGRES) {
        const [exp, costs, close] = await Promise.all([
          listFinancialExpensesFn({ data: { tenantId } }),
          listFinancialCostSettingsFn({ data: { tenantId } }),
          listFinancialClosingsFn({ data: { tenantId } }),
        ]);
        setExpenses(exp);
        setCostSettings(costs);
        setClosings(close);
      } else {
        setExpenses(localFinance.listExpenses(tenantId));
        setCostSettings(localFinance.listCostSettings(tenantId));
        setClosings(localFinance.listClosings(tenantId));
      }
    } catch {
      if (!USE_POSTGRES && tenantId) {
        setExpenses(localFinance.listExpenses(tenantId));
        setCostSettings(localFinance.listCostSettings(tenantId));
        setClosings(localFinance.listClosings(tenantId));
      }
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addExpense = useCallback(
    async (input: {
      description: string;
      amount: number;
      category?: FinancialExpenseCategory;
      expense_date?: string;
      notes?: string;
    }) => {
      if (!tenantId) return;
      if (USE_POSTGRES) {
        await createFinancialExpenseFn({ data: { tenantId, ...input } });
      } else {
        localFinance.createExpense({
          tenant_id: tenantId,
          description: input.description,
          amount: input.amount,
          category: input.category ?? "manual",
          expense_date: input.expense_date ?? new Date().toISOString(),
          notes: input.notes,
        });
      }
      await refresh();
    },
    [tenantId, refresh],
  );

  const removeExpense = useCallback(
    async (expenseId: string) => {
      if (!tenantId) return;
      if (USE_POSTGRES) {
        await deleteFinancialExpenseFn({ data: { tenantId, expenseId } });
      } else {
        localFinance.deleteExpense(expenseId, tenantId);
      }
      await refresh();
    },
    [tenantId, refresh],
  );

  const saveCostSetting = useCallback(
    async (input: {
      id?: string;
      name: string;
      amount: number;
      cost_type: FinancialCostType;
      active?: boolean;
      notes?: string;
    }) => {
      if (!tenantId) return;
      if (USE_POSTGRES) {
        await upsertFinancialCostSettingFn({ data: { tenantId, ...input } });
      } else {
        localFinance.upsertCostSetting({
          tenant_id: tenantId,
          name: input.name,
          amount: input.amount,
          cost_type: input.cost_type,
          active: input.active ?? true,
          notes: input.notes,
          id: input.id,
        });
      }
      await refresh();
    },
    [tenantId, refresh],
  );

  const removeCostSetting = useCallback(
    async (costId: string) => {
      if (!tenantId) return;
      if (USE_POSTGRES) {
        await deleteFinancialCostSettingFn({ data: { tenantId, costId } });
      } else {
        localFinance.deleteCostSetting(costId, tenantId);
      }
      await refresh();
    },
    [tenantId, refresh],
  );

  const registerClosing = useCallback(
    async (payload: Omit<FinancialDailyClosing, "id" | "tenant_id" | "created_at">) => {
      if (!tenantId) return;
      if (USE_POSTGRES) {
        await createFinancialClosingFn({
          data: {
            tenantId,
            closing_date: payload.closing_date,
            revenue: payload.revenue,
            delivery_fees: payload.delivery_fees,
            expenses_total: payload.expenses_total,
            fixed_costs: payload.fixed_costs,
            variable_costs: payload.variable_costs,
            estimated_profit: payload.estimated_profit,
            orders_delivered: payload.orders_delivered,
            notes: payload.notes ?? undefined,
          },
        });
      } else {
        localFinance.createClosing({ tenant_id: tenantId, ...payload });
      }
      await refresh();
    },
    [tenantId, refresh],
  );

  return {
    expenses,
    costSettings,
    closings,
    loading,
    refresh,
    addExpense,
    removeExpense,
    saveCostSetting,
    removeCostSetting,
    registerClosing,
  };
}
