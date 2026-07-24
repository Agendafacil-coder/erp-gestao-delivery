import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FinancialSummaryTab } from "@/components/finance/FinancialSummaryTab";
import { ExpenseEntryTab } from "@/components/finance/ExpenseEntryTab";
import { PeriodReportTab } from "@/components/finance/PeriodReportTab";
import { DreReportTab } from "@/components/finance/DreReportTab";
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
import { MultiStoreConsolidatedBanner } from "@/components/ops/MultiStoreConsolidatedBanner";
import { updateFeatureFlagsFn } from "@/functions/featureFlags";
import type { TenantFeatureFlags } from "@/lib/tenant/featureFlags";

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
  const { enabled: featureEnabled, flags, loading: flagsLoading, refresh: refreshFlags } =
    useFeatureFlags(tenantId);
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
  const cmvOverride = cmv.ready
    ? { total: cmv.cmvTotal, source: cmv.source }
    : undefined;

  return (
    <Tabs
      value={activeTab}
      onValueChange={(v) => setActiveTab(v as FinanceTab)}
      className="space-y-4"
    >
      <MultiStoreConsolidatedBanner />

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
          value="dre"
          className="segmented-item text-xs flex-1 sm:flex-none min-h-[2.5rem]"
        >
          DRE
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
          tenantId={tenantId}
          orders={orders}
          expenses={finance.expenses}
          costSettings={finance.costSettings}
          from={from}
          to={to}
          onFromChange={setFrom}
          onToChange={setTo}
          cmvOverride={cmvOverride}
          cmvMeta={cmv}
          onOpenCustos={() => setActiveTab("estoque")}
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
          cmvOverride={cmvOverride}
        />
      </TabsContent>

      <TabsContent value="dre">
        <DreReportTab
          orders={orders}
          expenses={finance.expenses}
          costSettings={finance.costSettings}
          from={from}
          to={to}
          onFromChange={setFrom}
          onToChange={setTo}
          cmvOverride={cmvOverride}
        />
      </TabsContent>

      <TabsContent value="fechamento">
        <DailyClosingTab
          tenantId={tenantId}
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
          {recipeInventoryEnabled ? (
            <RecipeInventoryPanel tenantId={tenantId} />
          ) : (
            <RecipeInventoryUpsell
              tenantId={tenantId}
              flags={flags}
              flagsLoading={flagsLoading}
              onEnabled={() => void refreshFlags()}
            />
          )}
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

function RecipeInventoryUpsell({
  tenantId,
  flags,
  flagsLoading,
  onEnabled,
}: {
  tenantId: string | undefined;
  flags: TenantFeatureFlags;
  flagsLoading: boolean;
  onEnabled: () => void;
}) {
  const [busy, setBusy] = useState(false);

  const enable = async () => {
    if (!tenantId || flagsLoading) return;
    setBusy(true);
    try {
      const { getFeatureFlagsFn } = await import("@/functions/featureFlags");
      const fresh = await getFeatureFlagsFn({ data: { tenantId } });
      await updateFeatureFlagsFn({
        data: { tenantId, flags: { ...fresh, ...flags, recipe_inventory: true } },
      });
      toast.success("Ingredientes por prato ativado");
      onEnabled();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao ativar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 px-4 py-5 text-sm space-y-3">
      <p className="font-medium text-foreground">Ficha técnica e CMV automático</p>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Cadastre insumos, monte a receita de cada prato e veja a margem real no Resumo e no DRE.
        Na venda, o estoque de ingredientes baixa sozinho.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy || flagsLoading || !tenantId}
          onClick={() => void enable()}
          className="erp-btn-primary text-xs h-9 px-3 disabled:opacity-50"
        >
          {busy || flagsLoading ? <Loader2 className="size-3.5 animate-spin" /> : null}
          Ativar agora
        </button>
        <Link
          to="/sistema"
          search={{ secao: "configs", aba: "operacao" }}
          className="inline-flex text-xs font-medium text-primary hover:underline"
        >
          Ou em Sistema → Operação → Mais recursos
        </Link>
      </div>
    </div>
  );
}
