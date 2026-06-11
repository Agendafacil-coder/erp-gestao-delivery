import { useEffect, useState } from "react";
import { useI18n } from "@/hooks/useI18n";

type Line = {
  name: string;
  quantity: number;
  unit_price: number;
  notes: string | null;
};

function normalizeLines(data: unknown): Line[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const r = row as Record<string, unknown>;
      const name = typeof r.name === "string" ? r.name : "";
      const quantity = Number(r.quantity) || 0;
      const unit_price = Number(r.unit_price) || 0;
      const notes = typeof r.notes === "string" ? r.notes : null;
      if (!name || quantity <= 0) return null;
      return { name, quantity, unit_price, notes };
    })
    .filter((x): x is Line => x !== null);
}

export function OrderLineItems({
  orderId,
  tenantId,
  itemsCount,
}: {
  orderId: string;
  tenantId: string;
  itemsCount?: number;
}) {
  const { t } = useI18n();
  const [items, setItems] = useState<Line[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const url = `/api/orders/line-items?orderId=${encodeURIComponent(orderId)}&tenantId=${encodeURIComponent(tenantId)}`;

    void fetch(url, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (!cancelled) setItems(normalizeLines(data));
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [orderId, tenantId]);

  if (loading) {
    return <div className="text-xs text-muted-foreground">{t("common", "loading")}</div>;
  }

  if (!items.length) {
    if (itemsCount && itemsCount > 0) {
      return (
        <div className="text-xs text-muted-foreground">
          {itemsCount} {t("kds", "itemsFallback")}
        </div>
      );
    }
    return <div className="text-xs text-muted-foreground italic">{t("kds", "noItems")}</div>;
  }

  return (
    <ul className="text-sm text-foreground space-y-2">
      {items.map((item, i) => (
        <li key={i} className="space-y-0.5">
          <div className="flex justify-between items-start gap-2">
            <span className="font-medium leading-snug">
              {item.quantity}x {item.name}
            </span>
            <span className="text-xs text-muted-foreground tabular-nums shrink-0">
              R$ {(item.unit_price * item.quantity).toFixed(2)}
            </span>
          </div>
          {item.notes?.trim() ? (
            <p className="text-xs text-warning/90 leading-relaxed pl-0.5">↳ {item.notes.trim()}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
