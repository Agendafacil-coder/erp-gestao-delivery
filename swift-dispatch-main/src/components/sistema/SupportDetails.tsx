import { useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  title?: string;
  hint?: string;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
};

/** Bloco colapsável para credenciais, webhooks e demais detalhes de suporte. */
export function SupportDetails({
  title = "Para o suporte técnico",
  hint = "Você não precisa mexer nisso no dia a dia.",
  defaultOpen = false,
  children,
  className,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={cn("rounded-xl border border-border/50 bg-muted/10", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm"
      >
        <span>
          <span className="font-medium text-muted-foreground block">{title}</span>
          {!open && hint ? (
            <span className="text-[11px] text-muted-foreground/80">{hint}</span>
          ) : null}
        </span>
        <ChevronRight
          className={cn("size-4 shrink-0 text-muted-foreground transition", open && "rotate-90")}
          aria-hidden
        />
      </button>
      {open ? (
        <div className="space-y-4 border-t border-border/40 px-3 pb-3 pt-3">{children}</div>
      ) : null}
    </div>
  );
}
