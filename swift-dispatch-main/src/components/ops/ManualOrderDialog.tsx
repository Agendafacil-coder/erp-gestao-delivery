import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useOps } from "@/hooks/useOps";
import { useI18n } from "@/hooks/useI18n";
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

function randomSPCoord(): [number, number] {
  const minLat = -23.6;
  const maxLat = -23.52;
  const minLng = -46.7;
  const maxLng = -46.6;
  const lat = minLat + Math.random() * (maxLat - minLat);
  const lng = minLng + Math.random() * (maxLng - minLng);
  return [lng, lat];
}

function parseAmount(raw: string): number | null {
  const normalized = raw.trim().replace(/\./g, "").replace(",", ".");
  const n = Number(normalized);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100) / 100;
}

function nextOrderCode(existingCodes: string[]): string {
  const nums = existingCodes
    .map((c) => parseInt(c.replace(/\D/g, ""), 10))
    .filter((n) => Number.isFinite(n));
  const base = nums.length > 0 ? Math.max(...nums) + 1 : 5000 + Math.floor(Math.random() * 200);
  return `#${base}`;
}

export function ManualOrderDialog({ open, onOpenChange }: ManualOrderDialogProps) {
  const { t } = useI18n();
  const { orders, createNewOrder } = useOps();
  const [busy, setBusy] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [address, setAddress] = useState("");
  const [itemsCount, setItemsCount] = useState("1");
  const [totalAmount, setTotalAmount] = useState("");
  const [channel, setChannel] = useState<(typeof CHANNELS)[number]>("Balcão");

  const reset = () => {
    setCustomerName("");
    setCustomerPhone("");
    setAddress("");
    setItemsCount("1");
    setTotalAmount("");
    setChannel("Balcão");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = customerName.trim();
    const addr = address.trim();
    const total = parseAmount(totalAmount);
    const items = Math.max(1, parseInt(itemsCount, 10) || 1);

    if (!name || !addr) {
      toast.error(t("central", "manualOrderValidation"));
      return;
    }
    if (total === null) {
      toast.error(t("central", "manualOrderAmountInvalid"));
      return;
    }

    setBusy(true);
    try {
      const [lng, lat] = randomSPCoord();
      const code = nextOrderCode(orders.map((o) => o.code));
      const created = await createNewOrder({
        code,
        customer_name: name,
        customer_phone: customerPhone.trim() || "+5511990000000",
        address: addr,
        items_count: items,
        total_amount: total,
        channel,
        sla_minutes: 45,
        driver_id: null,
        status: "novo",
        priority: "normal",
        lat,
        lng,
      });
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl border-border">
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
            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-xs font-medium text-muted-foreground">
                {t("central", "manualOrderAddress")}
              </span>
              <input
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="Rua, número, bairro"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                {t("central", "manualOrderItems")}
              </span>
              <input
                type="number"
                min={1}
                value={itemsCount}
                onChange={(e) => setItemsCount(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                {t("central", "manualOrderTotal")}
              </span>
              <input
                required
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                inputMode="decimal"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="89,90"
              />
            </label>
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
