import { BarChart3, FileBarChart, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GestaoSection } from "@/lib/gestao/sections";

const PAGES: Array<{
  key: GestaoSection;
  icon: typeof Wallet;
  title: string;
  summary: string;
}> = [
  {
    key: "financeiro",
    icon: Wallet,
    title: "Financeiro",
    summary: "Lucro, despesas, CMV, fechamento de caixa e pagamentos online.",
  },
  {
    key: "indicadores",
    icon: BarChart3,
    title: "Indicadores",
    summary: "Como está a operação agora: cozinha, entregadores e filas do turno.",
  },
  {
    key: "relatorios",
    icon: FileBarChart,
    title: "Relatórios",
    summary: "Histórico por período: vendas, produtos, clientes e operação.",
  },
];

type Props = {
  current: GestaoSection;
  onChange: (section: GestaoSection) => void;
  available?: GestaoSection[];
  className?: string;
};

/** Seletor das três áreas de gestão na mesma página. */
export function ManagementPagesGuide({ current, onChange, available, className }: Props) {
  const visible = available?.length
    ? PAGES.filter((p) => available.includes(p.key))
    : PAGES;

  return (
    <div
      className={cn(
        "grid gap-2 rounded-2xl border border-border/60 bg-muted/30 p-2",
        visible.length === 1 && "sm:grid-cols-1",
        visible.length === 2 && "sm:grid-cols-2",
        visible.length === 3 && "sm:grid-cols-3",
        className,
      )}
      role="tablist"
      aria-label="Áreas de gestão"
    >
      {visible.map((page) => {
        const Icon = page.icon;
        const active = page.key === current;

        return (
          <button
            key={page.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(page.key)}
            className={cn(
              "rounded-xl px-3 py-2.5 text-left transition",
              active
                ? "border border-primary/25 bg-card shadow-sm"
                : "border border-transparent bg-card/60 hover:border-border hover:bg-card",
            )}
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-lg",
                  active ? "bg-primary/15 text-primary" : "bg-background text-muted-foreground",
                )}
              >
                <Icon className="size-3.5" aria-hidden />
              </span>
              <span className={cn("text-xs font-semibold", active && "text-foreground")}>
                {page.title}
                {active ? (
                  <span className="ml-1.5 text-[10px] font-medium text-primary">· você está aqui</span>
                ) : null}
              </span>
            </div>
            <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">{page.summary}</p>
          </button>
        );
      })}
    </div>
  );
}

export type { GestaoSection as ManagementPageKey };
