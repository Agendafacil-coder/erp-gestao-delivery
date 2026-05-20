import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type CartItemNotesButtonProps = {
  notes?: string;
  onSave: (notes: string) => void;
};

export function CartItemNotesButton({ notes, onSave }: CartItemNotesButtonProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(notes ?? "");

  const hasNotes = !!notes?.trim();

  const openChange = (next: boolean) => {
    if (next) setDraft(notes ?? "");
    setOpen(next);
  };

  const save = () => {
    onSave(draft.trim());
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={openChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
            hasNotes
              ? "border-[#ea1d2c]/25 bg-[#fff5f5] text-[#ea1d2c]"
              : "border-[#e5e5ea] bg-[#fafafa] text-[#888] hover:border-[#ccc] hover:text-[#555]",
          )}
          aria-label={hasNotes ? "Editar observações" : "Adicionar observações"}
        >
          <MessageSquare className="size-3.5" strokeWidth={2} />
          {hasNotes ? "Obs." : "Observações"}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[min(100vw-2rem,280px)] border-[#e5e5ea] bg-white p-3 shadow-lg"
      >
        <p className="text-xs font-medium text-[#1c1c1e]">Observações do item</p>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ex: sem cebola, bem passado…"
          rows={3}
          className="mt-2 w-full resize-none rounded-lg border border-[#e5e5ea] bg-[#fafafa] px-3 py-2 text-sm text-[#1c1c1e] placeholder:text-[#aeaeb2] focus:border-[#ea1d2c]/40 focus:outline-none focus:ring-2 focus:ring-[#ea1d2c]/15"
        />
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={save}
            className="flex-1 rounded-lg bg-[#ea1d2c] py-2 text-xs font-semibold text-white"
          >
            Salvar
          </button>
          {hasNotes && (
            <button
              type="button"
              onClick={() => {
                onSave("");
                setDraft("");
                setOpen(false);
              }}
              className="rounded-lg border border-[#e5e5ea] px-3 py-2 text-xs text-[#888]"
            >
              Limpar
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
