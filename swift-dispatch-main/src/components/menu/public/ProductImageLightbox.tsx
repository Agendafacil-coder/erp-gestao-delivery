import { X } from "lucide-react";
import { categoryEmoji } from "@/lib/menu/format";
import { Dialog, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";

type ProductImageLightboxProps = {
  imageUrl: string | null;
  productName: string;
  categoryName: string;
  open: boolean;
  onClose: () => void;
};

/** Toque na foto do card → visualização só da imagem */
export function ProductImageLightbox({
  imageUrl,
  productName,
  categoryName,
  open,
  onClose,
}: ProductImageLightboxProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 z-[60] bg-black/85" />
        <DialogPrimitive.Content
          className="fixed inset-3 z-[60] flex items-center justify-center overflow-hidden rounded-2xl bg-black outline-none sm:inset-8 sm:rounded-3xl"
          aria-describedby={undefined}
        >
          <DialogTitle className="sr-only">{productName}</DialogTitle>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={productName}
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <div className="flex size-full min-h-[40vh] items-center justify-center text-8xl">
              {categoryEmoji(categoryName)}
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 flex size-10 items-center justify-center rounded-full bg-white/95 text-[#333] shadow-lg"
            aria-label="Fechar"
          >
            <X className="size-5" strokeWidth={2} />
          </button>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
