export type FinanceTab =
  | "resumo"
  | "despesas"
  | "relatorio"
  | "fechamento"
  | "estoque"
  | "entregadores"
  | "pagamentos";

const FINANCE_TABS: FinanceTab[] = [
  "resumo",
  "despesas",
  "relatorio",
  "fechamento",
  "estoque",
  "entregadores",
  "pagamentos",
];

export function parseFinanceTab(value: unknown): FinanceTab | undefined {
  if (typeof value === "string" && FINANCE_TABS.includes(value as FinanceTab)) {
    return value as FinanceTab;
  }
  return undefined;
}

export type { FinanceTab };
