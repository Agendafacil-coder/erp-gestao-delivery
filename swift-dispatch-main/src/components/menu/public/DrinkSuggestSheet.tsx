import type { MenuItemDto } from "@/functions/menu";
import { formatBRL } from "@/lib/menu/format";
import { X, Plus } from "lucide-react";
import { Dialog, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";

type DrinkSuggestSheetProps = {
  drinks: MenuItemDto[];
  open: boolean;
  addedItemName: string;
  onClose: () => void;
  onAdd: (item: MenuItemDto) => void;
};

export function DrinkSuggestSheet({
  drinks,
  open,
  addedItemName,
  onClose,
  onAdd,
}: DrinkSuggestSheetProps) {
  if (!drinks.length) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 z-50 bg-black/40" />
        <DialogPrimitive.Content className="fixed inset-x-0 bottom-0 z-50 max-h-[70dvh] rounded-t-2xl bg-white px-4 py-5 shadow-xl outline-none">
          <DialogTitle className="sr-only">Sugestão de bebida</DialogTitle>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[#ea1d2c]">
                Quase lá!
              </p>
              <h3 className="text-lg font-bold text-[#1c1c1e]">Que tal uma bebida?</h3>
              <p className="mt-1 text-sm text-[#888]">
                Você adicionou <span className="font-medium text-[#555]">{addedItemName}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex size-9 items-center justify-center rounded-full bg-[#f0f0f2]"
              aria-label="Fechar"
            >
              <X className="size-5" />
            </button>
          </div>
          <ul className="max-h-[45dvh] space-y-2 overflow-y-auto">
            {drinks.slice(0, 5).map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => {
                    onAdd(d);
                    onClose();
                  }}
                  className="flex w-full items-center gap-3 rounded-xl border border-black/[0.06] bg-[#fafafa] p-3 text-left active:bg-[#fff5f5]"
                >
                  <span className="text-2xl">🥤</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-[#1c1c1e]">{d.name}</p>
                    <p className="text-sm font-bold text-[#ea1d2c]">{formatBRL(d.price)}</p>
                  </div>
                  <span className="flex size-9 items-center justify-center rounded-full bg-[#ea1d2c] text-white">
                    <Plus className="size-4" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={onClose}
            className="mt-4 w-full py-3 text-sm font-medium text-[#888]"
          >
            Continuar sem bebida
          </button>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
