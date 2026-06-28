const TAB_COPY: Record<string, { title: string; description: string }> = {
  resumo: {
    title: "Resumo financeiro",
    description: "Faturamento, lucro estimado, CMV e formas de pagamento no período selecionado.",
  },
  despesas: {
    title: "Despesas e custos fixos",
    description: "Registre gastos do dia a dia e custos recorrentes usados no cálculo de lucro.",
  },
  relatorio: {
    title: "DRE do período",
    description: "Demonstrativo de receitas, custos e resultado — diferente dos relatórios operacionais.",
  },
  fechamento: {
    title: "Fechamento do dia",
    description: "Conferência de caixa e registro do fechamento diário.",
  },
  estoque: {
    title: "Estoque e CMV",
    description: "Custo da mercadoria vendida com base nos custos cadastrados no cardápio.",
  },
  entregadores: {
    title: "Ganhos dos entregadores",
    description: "Quanto cada entregador faturou e recebeu no período.",
  },
  pagamentos: {
    title: "Pagamentos online",
    description: "Integração com gateways para cobrança no checkout.",
  },
};

type Props = {
  activeTab: string;
};

export function FinanceTabDescription({ activeTab }: Props) {
  const copy = TAB_COPY[activeTab];
  if (!copy) return null;

  return (
    <div className="rounded-xl border border-border/50 bg-surface/40 px-4 py-3">
      <p className="text-xs font-semibold text-foreground">{copy.title}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">{copy.description}</p>
    </div>
  );
}
