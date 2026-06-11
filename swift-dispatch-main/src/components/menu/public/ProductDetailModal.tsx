import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, X } from "lucide-react";
import type { MenuItemDto, MenuItemAddonDto } from "@/functions/menu";
import { formatBRL } from "@/lib/menu/format";
import {
  computeUnitPrice,
  newLineId,
  type CartAddonSelection,
} from "@/lib/menu/cart-line";
import { MenuItemImage } from "@/components/menu/public/MenuItemImage";
import { Dialog, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type ProductConfirmPayload = {
  line_id: string;
  quantity: number;
  notes: string;
  variation_id?: string;
  variation_name?: string;
  addons: CartAddonSelection[];
  unit_price: number;
};

type ProductDetailModalProps = {
  item: MenuItemDto | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (payload: ProductConfirmPayload) => void;
};

export function ProductDetailModal({ item, open, onClose, onConfirm }: ProductDetailModalProps) {
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");
  const [variationId, setVariationId] = useState<string | undefined>();
  const [addonQty, setAddonQty] = useState<Record<string, number>>({});

  useEffect(() => {
    if (open && item) {
      setQty(1);
      setNotes("");
      const defaultVar = item.variations[0]?.id;
      setVariationId(item.variations.length ? defaultVar : undefined);
      const initial: Record<string, number> = {};
      for (const a of item.addons.filter((x) => x.required)) {
        initial[a.id] = 1;
      }
      setAddonQty(initial);
    }
  }, [open, item?.id]);

  const selectedVariation = useMemo(
    () => item?.variations.find((v) => v.id === variationId),
    [item, variationId],
  );

  const addonSelections: CartAddonSelection[] = useMemo(() => {
    if (!item) return [];
    return item.addons
      .filter((a) => (addonQty[a.id] ?? 0) > 0)
      .map((a) => ({
        id: a.id,
        name: a.name,
        price: a.price,
        quantity: addonQty[a.id] ?? 0,
      }));
  }, [item, addonQty]);

  if (!item) return null;

  const unitPrice = computeUnitPrice(item.price, selectedVariation, addonSelections);
  const lineTotal = unitPrice * qty;
  const hasOptions = item.variations.length > 0 || item.addons.length > 0;

  const toggleAddon = (addon: MenuItemAddonDto, delta: number) => {
    setAddonQty((prev) => {
      const current = prev[addon.id] ?? 0;
      const next = Math.max(0, Math.min(addon.max_quantity, current + delta));
      if (next === 0) {
        const { [addon.id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [addon.id]: next };
    });
  };

  const suggested = item.addons.filter((a) => a.is_suggested);
  const otherAddons = item.addons.filter((a) => !a.is_suggested);

  function renderAddonGroup(title: string, addons: MenuItemAddonDto[]) {
    if (!addons.length) return null;
    return (
      <div>
        <p className="mb-2 text-sm font-semibold">
          {title}
          {addons.some((a) => a.required) ? (
            <span className="ml-1 text-[var(--menu-accent)]">*</span>
          ) : null}
        </p>
        <div className="space-y-2">
          {addons.map((a) => {
            const q = addonQty[a.id] ?? 0;
            return (
              <div
                key={a.id}
                className={cn(
                  "flex items-center justify-between rounded-xl border px-3 py-2.5",
                  q > 0
                    ? "border-[var(--menu-accent)]/40 bg-[var(--menu-accent)]/8"
                    : "border-[var(--menu-border)] bg-[var(--menu-surface)]",
                )}
              >
                <div className="min-w-0 flex-1 pr-2">
                  <p className="text-sm font-medium">{a.name}</p>
                  <p className="text-xs text-[var(--menu-muted)]">
                    {a.price > 0 ? `+ ${formatBRL(a.price)}` : "Grátis"}
                  </p>
                </div>
                <div className="flex items-center gap-1 rounded-full bg-[var(--menu-card)] p-0.5 ring-1 ring-[var(--menu-border)]">
                  <button
                    type="button"
                    onClick={() => toggleAddon(a, -1)}
                    className="flex size-8 items-center justify-center rounded-full text-[var(--menu-muted)]"
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <span className="min-w-[20px] text-center text-sm font-bold tabular-nums">
                    {q}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleAddon(a, 1)}
                    className="flex size-8 items-center justify-center rounded-full bg-[var(--menu-gradient)] text-white"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const submit = () => {
    const missingRequired = item.addons.filter(
      (a) => a.required && (addonQty[a.id] ?? 0) < 1,
    );
    if (missingRequired.length) {
      toast.error(`Selecione: ${missingRequired.map((a) => a.name).join(", ")}`);
      return;
    }
    onConfirm({
      line_id: newLineId(),
      quantity: qty,
      notes: notes.trim(),
      variation_id: variationId,
      variation_name: selectedVariation?.name,
      addons: addonSelections,
      unit_price: unitPrice,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <DialogPrimitive.Content
          className="menu-app fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-[1.5rem] bg-[var(--menu-bg)] text-[var(--menu-fg)] shadow-[var(--menu-shadow)] outline-none"
          aria-describedby={undefined}
        >
          <DialogTitle className="sr-only">{item.name}</DialogTitle>

          <div className="relative h-52 w-full bg-[var(--menu-surface)] sm:h-56">
            <MenuItemImage
              imageUrl={item.image_url}
              name={item.name}
              isCombo={item.is_combo}
              isDrink={item.is_drink}
              itemId={item.id}
              fallbackClassName="text-5xl font-bold text-[var(--menu-muted)]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--menu-bg)] via-[var(--menu-bg)/20] to-transparent" />
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm"
              aria-label="Fechar"
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="px-5 py-4">
            <h2 className="font-display text-xl font-bold leading-tight">{item.name}</h2>
            {item.description ? (
              <p className="mt-1.5 text-[15px] leading-relaxed text-[var(--menu-muted)]">
                {item.description}
              </p>
            ) : null}
            {item.is_combo ? (
              <span className="menu-badge menu-badge--hot mt-2">Combo</span>
            ) : null}
          </div>

          <div className="space-y-5 px-5 pb-4">
            {item.variations.length > 0 && (
              <div>
                <p className="menu-label mb-2">Escolha o tamanho</p>
                <div className="space-y-2">
                  {item.variations.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVariationId(v.id)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl border-2 px-4 py-3 text-left transition-colors",
                        variationId === v.id
                          ? "border-[var(--menu-accent)] bg-[var(--menu-accent)]/10"
                          : "border-[var(--menu-border)] bg-[var(--menu-surface)]",
                      )}
                    >
                      <span className="text-sm font-medium">{v.name}</span>
                      <span className="menu-price text-sm">{formatBRL(v.price)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {renderAddonGroup("Sugestões para você", suggested)}
            {renderAddonGroup(otherAddons[0]?.group_name ?? "Adicionais", otherAddons)}

            <div>
              <label className="text-sm font-medium text-[var(--menu-muted)]">
                Observações <span className="font-normal">(opcional)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: sem cebola, ponto da carne…"
                rows={2}
                className="menu-input mt-2 min-h-[4.5rem] resize-none py-2.5"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[15px] font-medium">Quantidade</span>
              <div className="inline-flex items-center gap-3 rounded-full bg-[var(--menu-surface)] px-1.5 py-1 ring-1 ring-[var(--menu-border)]">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="flex size-9 items-center justify-center rounded-full bg-[var(--menu-card)]"
                >
                  <Minus className="size-4" />
                </button>
                <span className="min-w-[1.5rem] text-center font-bold tabular-nums">{qty}</span>
                <button
                  type="button"
                  onClick={() => setQty((q) => q + 1)}
                  className="flex size-9 items-center justify-center rounded-full bg-[var(--menu-gradient)] text-white"
                >
                  <Plus className="size-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 border-t border-[var(--menu-border)] bg-[var(--menu-bg)] px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <button type="button" onClick={submit} className="menu-btn-primary w-full justify-between px-5">
              <span className="font-semibold">
                {hasOptions ? "Adicionar à sacola" : "Adicionar"}
              </span>
              <span className="font-bold tabular-nums">{formatBRL(lineTotal)}</span>
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
