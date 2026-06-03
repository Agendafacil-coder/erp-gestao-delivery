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
import { monthStartIsoDate, todayIsoDate } from "@/components/finance/FinancialDateFilter";
import { Wallet } from "lucide-react";

export const Route = createFileRoute("/_authenticated/financeiro")({
  component: FinancialPage,
});

function FinancialPage() {
  const { current } = useTenant();
  const { orders } = useOps();
  const tenantId = current?.id;
  const finance = useFinance(tenantId);

  const [from, setFrom] = useState(monthStartIsoDate());
  const [to, setTo] = useState(todayIsoDate());

  return (
    <OpsPage className="space-y-6 max-h-[calc(100dvh-8rem)] overflow-y-auto">
      <div className="flex items-end justify-between flex-wrap gap-3 border-b border-border/40 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Wallet className="size-4 text-success" />
            <span className="text-xs text-muted-foreground">Gestão financeira</span>
          </div>
          <h1 className="erp-page-title mt-1">Financeiro</h1>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
            Saiba se o negócio está lucrando de verdade. Faturamento só conta pedidos entregues;
            cancelados não entram. CMV e estoque serão integrados em fase futura.
          </p>
        </div>
      </div>

      <Tabs defaultValue="resumo" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/60 p-1">
          <TabsTrigger value="resumo" className="text-xs">
            Resumo
          </TabsTrigger>
          <TabsTrigger value="despesas" className="text-xs">
            Despesas
          </TabsTrigger>
          <TabsTrigger value="relatorio" className="text-xs">
            Relatório
          </TabsTrigger>
          <TabsTrigger value="fechamento" className="text-xs">
            Fechamento diário
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
      </Tabs>
    </OpsPage>
  );
}
