import { OpsPage } from "@/components/ops/OpsPage";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTenant } from "@/hooks/useTenant";
import { useOps } from "@/hooks/useOps";
import { useFinance } from "@/hooks/useFinance";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FinancialSummaryTab } from "@/components/finance/FinancialSummaryTab";
import { ExpenseEntryTab } from "@/components/finance/ExpenseEntryTab";
import { PeriodReportTab } from "@/components/finance/PeriodReportTab";
import { DailyClosingTab } from "@/components/finance/DailyClosingTab";
import { InventoryCmvTab } from "@/components/finance/InventoryCmvTab";
import { PaymentIntegrationTab } from "@/components/finance/PaymentIntegrationTab";
import { monthStartIsoDate, todayIsoDate } from "@/components/finance/FinancialDateFilter";
import { useFinancialCmv } from "@/hooks/useFinancialCmv";
import { OpsPageHeader } from "@/components/ops/OpsPageHeader";
import { Wallet } from "lucide-react";

export const Route = createFileRoute("/_authenticated/financeiro")({
  component: FinancialPage,
});

function FinancialPage() {
  const { current } = useTenant();
  const { orders } = useOps();
  const tenantId = current?.id;
  const tenantSlug = current?.slug;
  const finance = useFinance(tenantId);
  const checkoutUrl =
    typeof window !== "undefined" && tenantSlug
      ? `${window.location.origin}/${tenantSlug}/checkout`
      : undefined;

  const [from, setFrom] = useState(monthStartIsoDate());
  const [to, setTo] = useState(todayIsoDate());
  const cmv = useFinancialCmv(tenantId, orders, { from, to });

  return (
    <OpsPage className="space-y-6 max-h-[calc(100dvh-8rem)] overflow-y-auto">
      <OpsPageHeader
        subtitle="Gestão financeira"
        icon={Wallet}
        iconClassName="text-success"
        title="Financeiro"
        description="Saiba se o negócio está lucrando de verdade. Faturamento só conta pedidos entregues; cancelados não entram. CMV usa custo unitário do cardápio quando cadastrado."
        className="pb-2"
      />

      <Tabs defaultValue="resumo" className="space-y-5">
        <TabsList className="segmented-control flex flex-wrap h-auto w-full sm:w-auto">
          <TabsTrigger value="resumo" className="segmented-item text-xs flex-1 sm:flex-none min-h-[2.5rem]">
            Resumo
          </TabsTrigger>
          <TabsTrigger value="despesas" className="segmented-item text-xs flex-1 sm:flex-none min-h-[2.5rem]">
            Despesas
          </TabsTrigger>
          <TabsTrigger value="relatorio" className="segmented-item text-xs flex-1 sm:flex-none min-h-[2.5rem]">
            Relatório
          </TabsTrigger>
          <TabsTrigger value="fechamento" className="segmented-item text-xs flex-1 sm:flex-none min-h-[2.5rem]">
            Fechamento diário
          </TabsTrigger>
          <TabsTrigger value="estoque" className="segmented-item text-xs flex-1 sm:flex-none min-h-[2.5rem]">
            Estoque / CMV
          </TabsTrigger>
          <TabsTrigger value="pagamentos" className="segmented-item text-xs flex-1 sm:flex-none min-h-[2.5rem]">
            Pagamentos online
          </TabsTrigger>
        </TabsList>

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
          <InventoryCmvTab tenantId={tenantId} />
        </TabsContent>

        <TabsContent value="pagamentos">
          <PaymentIntegrationTab tenantId={tenantId} checkoutUrl={checkoutUrl} tenantSlug={tenantSlug} />
        </TabsContent>
      </Tabs>
    </OpsPage>
  );
}
