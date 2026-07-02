export type FinanceTab =
  | "resumo"
  | "despesas"
  | "relatorio"
  | "fechamento"
  | "estoque"
  | "entregadores"
  | "pagamentos"
  | "canais";

const FINANCE_TABS: FinanceTab[] = [
  "resumo",
  "despesas",
  "relatorio",
  "fechamento",
  "estoque",
  "entregadores",
  "pagamentos",
  "canais",
];

export function parseFinanceTab(value: unknown): FinanceTab | undefined {
  if (typeof value === "string" && FINANCE_TABS.includes(value as FinanceTab)) {
    return value as FinanceTab;
  }
  return undefined;
}

export type { FinanceTab };
