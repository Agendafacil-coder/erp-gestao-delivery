import { History, MessageCircle, Settings, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SistemaSection } from "@/lib/sistema/sections";

const PAGES: Array<{
  key: SistemaSection;
  icon: typeof MessageCircle;
  title: string;
  summary: string;
}> = [
  {
    key: "whatsapp",
    icon: MessageCircle,
    title: "WhatsApp",
    summary: "Conexão API, templates, campanhas e histórico de disparos.",
  },
  {
    key: "automacoes",
    icon: Zap,
    title: "Automações",
    summary: "Regras automáticas, console ao vivo e integração iFood.",
  },
  {
    key: "auditoria",
    icon: History,
    title: "Auditoria",
    summary: "Trilha unificada: pedidos, automações e mensagens.",
  },
  {
    key: "configs",
    icon: Settings,
    title: "Configurações",
    summary: "Loja, entrega, impressão, recursos beta e equipe.",
  },
];

type Props = {
  current: SistemaSection;
  onChange: (section: SistemaSection) => void;
  available?: SistemaSection[];
  className?: string;
};

/** Seletor das quatro áreas de sistema na mesma página. */
export function SystemPagesGuide({ current, onChange, available, className }: Props) {
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
        visible.length >= 4 && "sm:grid-cols-2 lg:grid-cols-4",
        className,
      )}
      role="tablist"
      aria-label="Áreas do sistema"
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
