import { useEffect, useRef } from "react";
import type { MenuItemDto } from "@/functions/menu";
import { formatBRL } from "@/lib/menu/format";
import { MenuItemImage } from "@/components/menu/public/MenuItemImage";
import { X } from "lucide-react";
import { Dialog, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

type DrinkSuggestSheetProps = {
  drinks: MenuItemDto[];
  open: boolean;
  /** Usado no cardápio após adicionar um item */
  addedItemName?: string;
  /** Texto customizado (sacola/checkout) */
  subtitle?: string;
  dismissLabel?: string;
  /** Fechar (X) ou após adicionar bebida */
  onClose: () => void;
  /** "Continuar sem bebida" — dispensa o bump na sessão */
  onDismiss?: () => void;
  /** Chamado quando o sheet realmente abre (para marcar sessão) */
  onOpened?: () => void;
  onAdd: (item: MenuItemDto) => void;
};

export function DrinkSuggestSheet({
  drinks,
  open,
  addedItemName,
  subtitle,
  dismissLabel = "Continuar sem bebida",
  onClose,
  onDismiss,
  onOpened,
  onAdd,
}: DrinkSuggestSheetProps) {
  const skip = onDismiss ?? onClose;
  const onOpenedRef = useRef(onOpened);
  onOpenedRef.current = onOpened;

  useEffect(() => {
    if (open && drinks.length > 0) onOpenedRef.current?.();
  }, [open, drinks.length]);

  if (!drinks.length) return null;

  const contextText =
    subtitle ??
    (addedItemName
      ? `Você adicionou ${addedItemName}`
      : "Escolha uma bebida para acompanhar");

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPortal>
        <DialogOverlay
          className={cn(
            "menu-app menu-suggest-sheet__overlay fixed inset-0 z-50",
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            "menu-app menu-suggest-sheet fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md outline-none",
            "rounded-t-[1.25rem] px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]",
            "sm:max-w-xl lg:max-w-2xl",
          )}
        >
          <DialogTitle className="sr-only">Sugestão de bebida</DialogTitle>

          <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-[var(--menu-border)]" />

          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0 pr-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--menu-accent)]">
                Quase lá
              </p>
              <h3 className="mt-0.5 font-display text-[1.125rem] font-bold leading-tight text-[var(--menu-fg)]">
                Que tal uma bebida?
              </h3>
              <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-[var(--menu-muted)]">
                {contextText}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--menu-surface)] text-[var(--menu-muted)] ring-1 ring-[var(--menu-border)]"
              aria-label="Fechar"
            >
              <X className="size-4" />
            </button>
          </div>

          <ul className="max-h-[min(38dvh,14rem)] space-y-2 overflow-y-auto overscroll-contain">
            {drinks.map((drink) => (
              <li key={drink.id}>
                <button
                  type="button"
                  onClick={() => {
                    onAdd(drink);
                    onClose();
                  }}
                  className="menu-suggest-sheet__option"
                >
                  <div className="size-11 shrink-0 overflow-hidden rounded-lg ring-1 ring-[var(--menu-border)]">
                    <MenuItemImage
                      imageUrl={drink.image_url}
                      name={drink.name}
                      isDrink
                      itemId={drink.id}
                      fallbackClassName="text-sm font-bold text-[var(--menu-muted)]"
                      withShine={false}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--menu-fg)]">
                      {drink.name}
                    </p>
                    <p className="text-xs font-bold tabular-nums text-[var(--menu-accent)]">
                      {formatBRL(drink.price)}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[var(--menu-gradient)] px-3 py-1.5 text-[11px] font-semibold text-white">
                    Adicionar
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={skip}
            className="mt-3 w-full rounded-xl py-2.5 text-sm font-medium text-[var(--menu-muted)] transition-colors hover:bg-[var(--menu-surface)] hover:text-[var(--menu-fg)]"
          >
            {dismissLabel}
          </button>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
