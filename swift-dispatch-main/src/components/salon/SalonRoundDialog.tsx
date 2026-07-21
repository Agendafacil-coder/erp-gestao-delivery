import { useEffect, useMemo, useState } from "react";
import { Loader2, Minus, Plus, Search, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTenant } from "@/hooks/useTenant";
import { getPublicMenuFn, type MenuItemDto } from "@/functions/menu";
import { addSalonTabRoundFn } from "@/functions/salon";
import type { CartLine } from "@/functions/publicOrders";
import { formatBRL } from "@/lib/menu/format";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  tabId: string;
  tabLabel: string;
  onAdded: () => void;
};

type DraftLine = CartLine & { key: string };

function newLineKey(): string {
  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function SalonRoundDialog({
  open,
  onOpenChange,
  tenantId,
  tabId,
  tabLabel,
  onAdded,
}: Props) {
  const { current: tenant } = useTenant();
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItemDto[]>([]);
  const [menuSearch, setMenuSearch] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !tenant?.slug) return;
    setMenuLoading(true);
    getPublicMenuFn({ data: { tenantSlug: tenant.slug } })
      .then((menu) => setMenuItems(menu.categories.flatMap((c) => c.items)))
      .catch(() => setMenuItems([]))
      .finally(() => setMenuLoading(false));
  }, [open, tenant?.slug]);

  const filtered = useMemo(() => {
    const q = menuSearch.trim().toLowerCase();
    if (!q) return menuItems;
    return menuItems.filter(
      (i) =>
        i.name.toLowerCase().includes(q) || (i.description?.toLowerCase().includes(q) ?? false),
    );
  }, [menuItems, menuSearch]);

  const total = useMemo(() => lines.reduce((s, l) => s + l.unit_price * l.quantity, 0), [lines]);

  const addItem = (item: MenuItemDto) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.menu_item_id === item.id && !l.notes?.trim());
      if (existing) {
        return prev.map((l) =>
          l.key === existing.key ? { ...l, quantity: l.quantity + 1 } : l,
        );
      }
      return [
        ...prev,
        {
          key: newLineKey(),
          menu_item_id: item.id,
          name: item.name,
          unit_price: item.price,
          quantity: 1,
          notes: "",
        },
      ];
    });
  };

  const updateLine = (key: string, patch: Partial<DraftLine>) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  };

  const removeLine = (key: string) => {
    setLines((prev) => prev.filter((l) => l.key !== key));
  };

  const reset = () => {
    setLines([]);
    setNotes("");
    setMenuSearch("");
  };

  const handleSubmit = async () => {
    if (lines.length === 0) {
      toast.error("Adicione ao menos um item");
      return;
    }
    setBusy(true);
    try {
      const cartLines: CartLine[] = lines.map(({ key: _k, ...line }) => ({
        menu_item_id: line.menu_item_id,
        name: line.name,
        quantity: line.quantity,
        unit_price: line.unit_price,
        notes: line.notes?.trim() || undefined,
      }));
      const created = await addSalonTabRoundFn({
        data: { tenantId, tabId, lines: cartLines, notes: notes.trim() || undefined },
      });
      toast.success(`Rodada ${created.code} enviada para a cozinha`, { icon: "🍽️" });
      reset();
      onOpenChange(false);
      onAdded();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao lançar rodada");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-2xl border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova rodada — {tabLabel}</DialogTitle>
          <DialogDescription>
            Os itens vão direto para a fila da cozinha e entram na conta da comanda.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">Cardápio</span>
            {menuLoading ? (
              <div className="flex items-center justify-center py-6 text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
              </div>
            ) : menuItems.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                Nenhum item disponível no cardápio.
              </p>
            ) : (
              <>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="search"
                    value={menuSearch}
                    onChange={(e) => setMenuSearch(e.target.value)}
                    placeholder="Buscar item…"
                    className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                {filtered.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                    Nenhum item encontrado.
                  </p>
                ) : (
                  <ul className="max-h-44 space-y-1 overflow-y-auto rounded-lg border border-border p-1">
                    {filtered.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => addItem(item)}
                          className="flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-sm hover:bg-muted/60 transition-colors"
                        >
                          <span className="min-w-0 truncate font-medium text-foreground">
                            {item.name}
                          </span>
                          <span className="shrink-0 tabular-nums text-muted-foreground">
                            {formatBRL(item.price)}
                          </span>
                          <Plus className="size-4 shrink-0 text-primary" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>

          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">Itens da rodada</span>
            {lines.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                Toque em um item do cardápio para adicionar.
              </p>
            ) : (
              <ul className="space-y-2">
                {lines.map((line) => (
                  <li
                    key={line.key}
                    className="rounded-lg border border-border bg-muted/20 p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{line.name}</p>
                        <p className="text-xs tabular-nums text-muted-foreground">
                          {formatBRL(line.unit_price)} · {formatBRL(line.unit_price * line.quantity)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            updateLine(line.key, { quantity: Math.max(1, line.quantity - 1) })
                          }
                          className="flex size-7 items-center justify-center rounded-md border border-border bg-background"
                          aria-label="Diminuir"
                        >
                          <Minus className="size-3.5" />
                        </button>
                        <span className="min-w-[1.25rem] text-center text-sm font-semibold tabular-nums">
                          {line.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateLine(line.key, { quantity: line.quantity + 1 })}
                          className="flex size-7 items-center justify-center rounded-md border border-border bg-background"
                          aria-label="Aumentar"
                        >
                          <Plus className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeLine(line.key)}
                          className="flex size-7 items-center justify-center rounded-md text-destructive hover:bg-destructive/10 ml-1"
                          aria-label="Remover"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                    <input
                      value={line.notes ?? ""}
                      onChange={(e) => updateLine(line.key, { notes: e.target.value })}
                      placeholder="Obs.: sem cebola, ao ponto…"
                      className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Observação da rodada (opcional)
            </span>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex.: servir sobremesa depois…"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>

          <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
            <span className="text-sm font-medium text-muted-foreground">Total da rodada</span>
            <span className="text-lg font-bold tabular-nums text-foreground">
              {formatBRL(total)}
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <button
            type="button"
            className="erp-btn-secondary"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </button>
          <button
            type="button"
            disabled={busy || lines.length === 0}
            onClick={() => void handleSubmit()}
            className="erp-btn-primary gap-2 disabled:opacity-50"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Enviar para a cozinha
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
