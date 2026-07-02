const TAB_COPY: Record<string, { title: string; description: string }> = {
  resumo: {
    title: "Resumo financeiro",
    description:
      "Quanto vendeu, quanto sobrou e como os clientes pagaram no período selecionado.",
  },
  despesas: {
    title: "Despesas e custos fixos",
    description: "Registre gastos do dia a dia e custos recorrentes usados no cálculo de lucro.",
  },
  relatorio: {
    title: "Resultado do período",
    description: "Quanto entrou, quanto saiu e o lucro — visão completa do período.",
  },
  fechamento: {
    title: "Fechamento do dia",
    description: "Conferência de caixa e registro do fechamento diário.",
  },
  estoque: {
    title: "Estoque e custo dos produtos",
    description: "Controle de estoque e custo do que foi vendido, com base no cardápio.",
  },
  entregadores: {
    title: "Ganhos dos entregadores",
    description: "Quanto cada entregador faturou e recebeu no período.",
  },
  pagamentos: {
    title: "Pagamentos online",
    description: "Configure Mercado Pago, Stripe ou Asaas para cobrar no pedido online.",
  },
  canais: {
    title: "Marketplaces",
    description: "Compare o que o iFood repassou com os pedidos registrados aqui.",
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
