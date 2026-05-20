import { useEffect, useState } from "react";
import { Minus, Plus, X } from "lucide-react";
import type { MenuItemDto } from "@/functions/menu";
import { formatBRL } from "@/lib/menu/format";
import { Dialog, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";

type ProductDetailModalProps = {
  item: MenuItemDto | null;
  open: boolean;
  cartQuantity: number;
  onClose: () => void;
  onConfirm: (quantity: number, notes: string) => void;
};

/** Toque no card (texto) → detalhes, preço, observações e sacola — sem foto gigante */
export function ProductDetailModal({
  item,
  open,
  cartQuantity,
  onClose,
  onConfirm,
}: ProductDetailModalProps) {
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open && item) {
      setQty(cartQuantity > 0 ? cartQuantity : 1);
      setNotes("");
    }
  }, [open, item?.id, cartQuantity]);

  if (!item) return null;

  const lineTotal = item.price * qty;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 z-50 bg-black/45" />
        <DialogPrimitive.Content
          className="fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto rounded-t-[1.25rem] bg-white text-[#1c1c1e] shadow-[0_-8px_40px_rgba(0,0,0,0.12)] outline-none sm:left-1/2 sm:top-1/2 sm:max-h-[90vh] sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:shadow-2xl"
          aria-describedby={undefined}
        >
          <DialogTitle className="sr-only">{item.name}</DialogTitle>

          <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-[#ebebef] bg-white px-5 py-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold leading-tight text-[#1c1c1e]">{item.name}</h2>
              {item.description ? (
                <p className="mt-1.5 text-[15px] leading-relaxed text-[#6b6b6f]">
                  {item.description}
                </p>
              ) : null}
              <p className="mt-2 text-xl font-bold tabular-nums text-[#ea1d2c]">
                {formatBRL(item.price)}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#f5f5f7] text-[#555]"
              aria-label="Fechar"
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="space-y-5 px-5 py-4">
            <div>
              <label
                htmlFor="product-notes"
                className="text-[13px] font-medium text-[#6b6b6f]"
              >
                Observações <span className="font-normal text-[#999]">(opcional)</span>
              </label>
              <textarea
                id="product-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: sem cebola, ponto da carne…"
                rows={2}
                className="mt-2 w-full resize-none rounded-xl border border-[#e5e5ea] bg-[#fafafa] px-3.5 py-3 text-[15px] text-[#1c1c1e] placeholder:text-[#aeaeb2] focus:border-[#ea1d2c]/40 focus:outline-none focus:ring-2 focus:ring-[#ea1d2c]/15"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[15px] font-medium text-[#1c1c1e]">Quantidade</span>
              <div className="inline-flex items-center gap-3 rounded-full border border-[#e5e5ea] bg-[#fafafa] px-1.5 py-1">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="flex size-9 items-center justify-center rounded-full bg-white text-[#444] shadow-sm ring-1 ring-black/[0.04]"
                >
                  <Minus className="size-4" strokeWidth={2.5} />
                </button>
                <span className="min-w-[1.5rem] text-center text-base font-bold tabular-nums text-[#1c1c1e]">
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={() => setQty((q) => q + 1)}
                  className="flex size-9 items-center justify-center rounded-full bg-[#ea1d2c] text-white"
                >
                  <Plus className="size-4" strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 border-t border-[#ebebef] bg-white px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={() => {
                onConfirm(qty, notes.trim());
                onClose();
              }}
              className="flex w-full items-center justify-between rounded-2xl bg-[#ea1d2c] px-5 py-4 text-white shadow-[0_6px_24px_rgba(234,29,44,0.28)] active:scale-[0.98]"
            >
              <span className="text-[15px] font-semibold">
                {cartQuantity > 0 ? "Atualizar sacola" : "Adicionar à sacola"}
              </span>
              <span className="text-[15px] font-bold tabular-nums">{formatBRL(lineTotal)}</span>
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
