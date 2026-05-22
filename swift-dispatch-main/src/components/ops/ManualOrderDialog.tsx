import { useEffect, useMemo, useState } from "react";
import { Plus, Loader2, Minus, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { useOps } from "@/hooks/useOps";
import { useI18n } from "@/hooks/useI18n";
import { useTenant } from "@/hooks/useTenant";
import { getPublicMenuFn, type MenuItemDto } from "@/functions/menu";
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

type ManualOrderDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const CHANNELS = ["Balcão", "Telefone", "WhatsApp", "iFood", "App Próprio"] as const;

type DraftLine = CartLine & { key: string };

function randomSPCoord(): [number, number] {
  const minLat = -23.6;
  const maxLat = -23.52;
  const minLng = -46.7;
  const maxLng = -46.6;
  const lat = minLat + Math.random() * (maxLat - minLat);
  const lng = minLng + Math.random() * (maxLng - minLng);
  return [lng, lat];
}

function nextOrderCode(existingCodes: string[]): string {
  const nums = existingCodes
    .map((c) => parseInt(c.replace(/\D/g, ""), 10))
    .filter((n) => Number.isFinite(n));
  const base = nums.length > 0 ? Math.max(...nums) + 1 : 5000 + Math.floor(Math.random() * 200);
  return `#${base}`;
}

function newLineKey(): string {
  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function buildDeliveryAddress(
  street: string,
  number: string,
  neighborhood: string,
  complement?: string,
): string {
  const parts = [street, number];
  if (complement) parts.push(complement);
  parts.push(neighborhood);
  return parts.join(", ");
}

function lineFromMenuItem(item: MenuItemDto): DraftLine {
  return {
    key: newLineKey(),
    menu_item_id: item.id,
    name: item.name,
    unit_price: item.price,
    quantity: 1,
    notes: "",
  };
}

export function ManualOrderDialog({ open, onOpenChange }: ManualOrderDialogProps) {
  const { t } = useI18n();
  const { current: tenant } = useTenant();
  const { orders, createNewOrder } = useOps();
  const [busy, setBusy] = useState(false);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItemDto[]>([]);
  const [menuSearch, setMenuSearch] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [addressStreet, setAddressStreet] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [addressComplement, setAddressComplement] = useState("");
  const [addressNeighborhood, setAddressNeighborhood] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [channel, setChannel] = useState<(typeof CHANNELS)[number]>("Balcão");

  useEffect(() => {
    if (!open || !tenant?.slug) return;
    setMenuLoading(true);
    getPublicMenuFn({ data: { tenantSlug: tenant.slug } })
      .then((menu) => {
        const flat = menu.categories.flatMap((c) => c.items);
        setMenuItems(flat);
      })
      .catch(() => setMenuItems([]))
      .finally(() => setMenuLoading(false));
  }, [open, tenant?.slug]);

  const total = useMemo(
    () => lines.reduce((s, l) => s + l.unit_price * l.quantity, 0),
    [lines],
  );

  const filteredMenuItems = useMemo(() => {
    const q = menuSearch.trim().toLowerCase();
    if (!q) return menuItems;
    return menuItems.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        (i.description?.toLowerCase().includes(q) ?? false),
    );
  }, [menuItems, menuSearch]);

  const reset = () => {
    setCustomerName("");
    setCustomerPhone("");
    setAddressStreet("");
    setAddressNumber("");
    setAddressComplement("");
    setAddressNeighborhood("");
    setOrderNotes("");
    setLines([]);
    setMenuSearch("");
    setChannel("Balcão");
  };

  const addItem = (item: MenuItemDto) => {
    setLines((prev) => [...prev, lineFromMenuItem(item)]);
  };

  const updateLine = (key: string, patch: Partial<DraftLine>) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  };

  const removeLine = (key: string) => {
    setLines((prev) => prev.filter((l) => l.key !== key));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = customerName.trim();
    const street = addressStreet.trim();
    const number = addressNumber.trim();
    const complement = addressComplement.trim();
    const neighborhood = addressNeighborhood.trim();

    if (!name) {
      toast.error(t("central", "manualOrderValidation"));
      return;
    }
    if (!street || !number || !neighborhood) {
      toast.error(t("central", "manualOrderAddressValidation"));
      return;
    }
    const addr = buildDeliveryAddress(street, number, neighborhood, complement || undefined);
    if (lines.length === 0) {
      toast.error(t("central", "manualOrderNoItems"));
      return;
    }

    const cartLines: CartLine[] = lines.map(({ key: _k, ...line }) => ({
      menu_item_id: line.menu_item_id,
      name: line.name,
      quantity: line.quantity,
      unit_price: line.unit_price,
      notes: line.notes?.trim() || undefined,
    }));

    setBusy(true);
    try {
      const [lng, lat] = randomSPCoord();
      const code = nextOrderCode(orders.map((o) => o.code));
      const itemsCount = cartLines.reduce((s, l) => s + l.quantity, 0);
      const created = await createNewOrder(
        {
          code,
          customer_name: name,
          customer_phone: customerPhone.trim() || "+5511990000000",
          address: addr,
          items_count: itemsCount,
          total_amount: total,
          channel,
          sla_minutes: 45,
          driver_id: null,
          status: "novo",
          priority: "normal",
          lat,
          lng,
        },
        {
          lines: cartLines,
          order_notes: orderNotes.trim() || undefined,
        },
      );
      toast.success(t("central", "manualOrderSuccess"), {
        description: `${created.code} · ${created.customer_name}`,
      });
      reset();
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao criar pedido";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setMenuSearch("");
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-lg rounded-2xl border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("central", "manualOrderTitle")}</DialogTitle>
          <DialogDescription>{t("central", "manualOrderDesc")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-xs font-medium text-muted-foreground">
                {t("central", "manualOrderCustomer")}
              </span>
              <input
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="Ex.: Maria Souza"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                {t("central", "manualOrderPhone")}
              </span>
              <input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="+5511999999999"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                {t("central", "manualOrderChannel")}
              </span>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as (typeof CHANNELS)[number])}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                {CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <fieldset className="space-y-2 sm:col-span-2">
              <legend className="text-xs font-medium text-muted-foreground">
                {t("central", "manualOrderAddress")}
              </legend>
              <div className="grid gap-3 sm:grid-cols-6">
                <label className="space-y-1.5 sm:col-span-4">
                  <span className="text-xs font-medium text-muted-foreground">
                    {t("central", "manualOrderStreet")}
                  </span>
                  <input
                    required
                    value={addressStreet}
                    onChange={(e) => setAddressStreet(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="Ex.: Rua das Flores"
                  />
                </label>
                <label className="space-y-1.5 sm:col-span-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    {t("central", "manualOrderNumber")}
                  </span>
                  <input
                    required
                    value={addressNumber}
                    onChange={(e) => setAddressNumber(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="123"
                  />
                </label>
                <label className="space-y-1.5 sm:col-span-3">
                  <span className="text-xs font-medium text-muted-foreground">
                    {t("central", "manualOrderComplement")}
                  </span>
                  <input
                    value={addressComplement}
                    onChange={(e) => setAddressComplement(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="Ex.: Apto 12, Bloco B"
                  />
                </label>
                <label className="space-y-1.5 sm:col-span-3">
                  <span className="text-xs font-medium text-muted-foreground">
                    {t("central", "manualOrderNeighborhood")}
                  </span>
                  <input
                    required
                    value={addressNeighborhood}
                    onChange={(e) => setAddressNeighborhood(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="Ex.: Centro"
                  />
                </label>
              </div>
            </fieldset>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">
              {t("central", "manualOrderMenu")}
            </span>
            {menuLoading ? (
              <div className="flex items-center justify-center py-6 text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
              </div>
            ) : menuItems.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                {t("central", "manualOrderMenuEmpty")}
              </p>
            ) : (
              <>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="search"
                    value={menuSearch}
                    onChange={(e) => setMenuSearch(e.target.value)}
                    placeholder={t("central", "manualOrderMenuSearch")}
                    className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                {filteredMenuItems.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                    {t("central", "manualOrderMenuNoResults")}
                  </p>
                ) : (
                  <ul className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border p-1">
                    {filteredMenuItems.map((item) => (
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
            <span className="text-xs font-medium text-muted-foreground">
              {t("central", "manualOrderCart")}
            </span>
            {lines.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                {t("central", "manualOrderCartEmpty")}
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
                          {formatBRL(line.unit_price)} ·{" "}
                          {formatBRL(line.unit_price * line.quantity)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            updateLine(line.key, {
                              quantity: Math.max(1, line.quantity - 1),
                            })
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
                    <label className="block space-y-1">
                      <span className="text-[11px] text-muted-foreground">
                        {t("central", "manualOrderLineNotes")}
                      </span>
                      <input
                        value={line.notes ?? ""}
                        onChange={(e) => updateLine(line.key, { notes: e.target.value })}
                        placeholder="Ex.: sem cebola, bem passado…"
                        className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              {t("central", "manualOrderOrderNotes")}
            </span>
            <textarea
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              rows={2}
              placeholder="Ex.: troco para R$ 100, interfone 12…"
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>

          <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
            <span className="text-sm font-medium text-muted-foreground">
              {t("central", "manualOrderTotal")}
            </span>
            <span className="text-lg font-bold tabular-nums text-foreground">
              {formatBRL(total)}
            </span>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <button
              type="button"
              className="erp-btn-secondary"
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              {t("common", "close")}
            </button>
            <button type="submit" disabled={busy} className="erp-btn-primary gap-2">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              {t("central", "manualOrderSubmit")}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
