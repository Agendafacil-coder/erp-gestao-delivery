import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FinancialSummaryTab } from "@/components/finance/FinancialSummaryTab";
import { ExpenseEntryTab } from "@/components/finance/ExpenseEntryTab";
import { PeriodReportTab } from "@/components/finance/PeriodReportTab";
import { DailyClosingTab } from "@/components/finance/DailyClosingTab";
import { InventoryCmvTab } from "@/components/finance/InventoryCmvTab";
import { DriverEarningsTab } from "@/components/finance/DriverEarningsTab";
import { PaymentIntegrationTab } from "@/components/finance/PaymentIntegrationTab";
import { IfoodReconciliationPanel } from "@/components/finance/IfoodReconciliationPanel";
import { RecipeInventoryPanel } from "@/components/finance/RecipeInventoryPanel";
import { monthStartIsoDate, todayIsoDate } from "@/components/finance/FinancialDateFilter";
import { FinanceTabDescription } from "@/components/finance/FinanceTabDescriptions";
import { useFinance } from "@/hooks/useFinance";
import { useFinancialCmv } from "@/hooks/useFinancialCmv";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import type { LocalOrder } from "@/lib/db/localDb";
import type { FinanceTab } from "@/lib/gestao/financeTabs";

type Props = {
  tenantId: string | undefined;
  tenantSlug: string | undefined;
  orders: LocalOrder[];
  activeTab?: FinanceTab;
  onTabChange?: (tab: FinanceTab) => void;
};

export function FinanceiroSection({
  tenantId,
  tenantSlug,
  orders,
  activeTab: controlledTab,
  onTabChange,
}: Props) {
  const finance = useFinance(tenantId);
  const { enabled: featureEnabled } = useFeatureFlags(tenantId);
  const driverCommissionEnabled = featureEnabled("driver_commission");
  const recipeInventoryEnabled = featureEnabled("recipe_inventory");
  const checkoutUrl =
    typeof window !== "undefined" && tenantSlug
      ? `${window.location.origin}/${tenantSlug}/checkout`
      : undefined;

  const [from, setFrom] = useState(monthStartIsoDate());
  const [to, setTo] = useState(todayIsoDate());
  const [internalTab, setInternalTab] = useState<FinanceTab>("resumo");
  const activeTab = controlledTab ?? internalTab;
  const setActiveTab = (tab: FinanceTab) => {
    onTabChange?.(tab);
    if (!onTabChange) setInternalTab(tab);
  };
  const cmv = useFinancialCmv(tenantId, orders, { from, to });

  return (
    <Tabs
      value={activeTab}
      onValueChange={(v) => setActiveTab(v as FinanceTab)}
      className="space-y-4"
    >
      <TabsList className="segmented-control flex flex-wrap h-auto w-full gap-1">
        <TabsTrigger
          value="resumo"
          className="segmented-item text-xs flex-1 sm:flex-none min-h-[2.5rem]"
        >
          Resumo
        </TabsTrigger>
        <TabsTrigger
          value="despesas"
          className="segmented-item text-xs flex-1 sm:flex-none min-h-[2.5rem]"
        >
          Despesas
        </TabsTrigger>
        <TabsTrigger
          value="relatorio"
          className="segmented-item text-xs flex-1 sm:flex-none min-h-[2.5rem]"
        >
          Resultado
        </TabsTrigger>
        <TabsTrigger
          value="fechamento"
          className="segmented-item text-xs flex-1 sm:flex-none min-h-[2.5rem]"
        >
          Fechamento
        </TabsTrigger>
        <TabsTrigger
          value="estoque"
          className="segmented-item text-xs flex-1 sm:flex-none min-h-[2.5rem]"
        >
          Custos
        </TabsTrigger>
        {driverCommissionEnabled ? (
          <TabsTrigger
            value="entregadores"
            className="segmented-item text-xs flex-1 sm:flex-none min-h-[2.5rem]"
          >
            Entregadores
          </TabsTrigger>
        ) : null}
        <TabsTrigger
          value="pagamentos"
          className="segmented-item text-xs flex-1 sm:flex-none min-h-[2.5rem]"
        >
          Pagamentos
        </TabsTrigger>
        <TabsTrigger
          value="canais"
          className="segmented-item text-xs flex-1 sm:flex-none min-h-[2.5rem]"
        >
          iFood
        </TabsTrigger>
      </TabsList>

      <FinanceTabDescription activeTab={activeTab} />

      <TabsContent value="resumo">
        <FinancialSummaryTab
          orders={orders}
          expenses={finance.expenses}
          costSettings={finance.costSettings}
          from={from}
          to={to}
          onFromChange={setFrom}
          onToChange={setTo}
          cmvOverride={{ total: cmv.cmvTotal, source: cmv.source }}
          cmvMeta={cmv}
        />
      </TabsContent>

      <TabsContent value="despesas">
        <ExpenseEntryTab
          expenses={finance.expenses}
          costSettings={finance.costSettings}
          onAddExpense={finance.addExpense}
          onRemoveExpense={finance.removeExpense}
          onSaveCost={finance.saveCostSetting}
          onRemoveCost={finance.removeCostSetting}
        />
      </TabsContent>

      <TabsContent value="relatorio">
        <PeriodReportTab
          orders={orders}
          expenses={finance.expenses}
          costSettings={finance.costSettings}
          from={from}
          to={to}
          onFromChange={setFrom}
          onToChange={setTo}
          cmvOverride={{ total: cmv.cmvTotal, source: cmv.source }}
        />
      </TabsContent>

      <TabsContent value="fechamento">
        <DailyClosingTab
          orders={orders}
          expenses={finance.expenses}
          costSettings={finance.costSettings}
          closings={finance.closings}
          onRegisterClosing={finance.registerClosing}
        />
      </TabsContent>

      <TabsContent value="estoque">
        <div className="space-y-6">
          <InventoryCmvTab tenantId={tenantId} />
          {recipeInventoryEnabled ? <RecipeInventoryPanel tenantId={tenantId} /> : null}
        </div>
      </TabsContent>

      {driverCommissionEnabled ? (
        <TabsContent value="entregadores">
          <DriverEarningsTab tenantId={tenantId} />
        </TabsContent>
      ) : null}

      <TabsContent value="pagamentos">
        <PaymentIntegrationTab
          tenantId={tenantId}
          checkoutUrl={checkoutUrl}
          tenantSlug={tenantSlug}
        />
      </TabsContent>

      <TabsContent value="canais">
        <IfoodReconciliationPanel tenantId={tenantId} />
      </TabsContent>
    </Tabs>
  );
}
