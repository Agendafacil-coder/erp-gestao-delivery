import { History, MessageCircle, Store, Utensils } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SistemaSection } from "@/lib/sistema/sections";

const PAGES: Array<{
  key: SistemaSection;
  icon: typeof MessageCircle;
  title: string;
  summary: string;
}> = [
  {
    key: "configs",
    icon: Store,
    title: "Minha loja",
    summary: "Endereço, entrega, impressão e equipe.",
  },
  {
    key: "whatsapp",
    icon: MessageCircle,
    title: "WhatsApp",
    summary: "Avisos para clientes e entregadores.",
  },
  {
    key: "automacoes",
    icon: Utensils,
    title: "iFood e avisos",
    summary: "Pedidos do iFood e regras automáticas.",
  },
  {
    key: "auditoria",
    icon: History,
    title: "Histórico",
    summary: "Quem fez o quê na loja.",
  },
];

type Props = {
  current: SistemaSection;
  onChange: (section: SistemaSection) => void;
  available?: SistemaSection[];
  className?: string;
};

/** Seletor das áreas de sistema — linguagem para dono de loja. */
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
              <span className={cn("text-sm font-semibold", active && "text-foreground")}>
                {page.title}
              </span>
            </div>
            <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">{page.summary}</p>
          </button>
        );
      })}
    </div>
  );
}
