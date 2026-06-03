export type PaymentMethodGroup = "pix" | "dinheiro" | "cartao" | "online" | "outros";

export type FinancialExpenseCategory = "manual" | "fixed" | "variable";
export type FinancialCostType = "fixed" | "variable";

export type FinancialExpense = {
  id: string;
  tenant_id: string;
  description: string;
  amount: number;
  category: FinancialExpenseCategory;
  expense_date: string;
  notes?: string | null;
  created_at: string;
};

export type FinancialCostSetting = {
  id: string;
  tenant_id: string;
  name: string;
  amount: number;
  cost_type: FinancialCostType;
  active: boolean;
  notes?: string | null;
};

export type FinancialDailyClosing = {
  id: string;
  tenant_id: string;
  closing_date: string;
  revenue: number;
  delivery_fees: number;
  expenses_total: number;
  fixed_costs: number;
  variable_costs: number;
  estimated_profit: number;
  orders_delivered: number;
  notes?: string | null;
  created_at: string;
};

export type PaymentBreakdown = Record<PaymentMethodGroup, number>;

export type FinancialSummary = {
  dailyRevenue: number;
  periodRevenue: number;
  monthlyRevenue: number;
  paidOrdersCount: number;
  paidOrdersTotal: number;
  pendingOrdersCount: number;
  pendingOrdersTotal: number;
  deliveryFeesReceived: number;
  paymentBreakdown: PaymentBreakdown;
  manualExpenses: number;
  fixedCosts: number;
  variableCosts: number;
  totalExpenses: number;
  estimatedProfit: number;
  deliveredOrdersCount: number;
  /** Reservado para CMV — fase futura */
  cmvTotal: number;
  grossProductRevenue: number;
};

export type FinancialDateRange = {
  from: string;
  to: string;
};

export type PeriodReport = FinancialSummary & {
  dailySeries: Array<{ date: string; revenue: number; profit: number }>;
  paymentBreakdown: PaymentBreakdown;
};
