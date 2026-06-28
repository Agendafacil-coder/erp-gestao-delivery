import { useEffect, useState } from "react";
import { Radio } from "lucide-react";

type TrackingLiveBadgeProps = {
  lastUpdatedAt: Date | null;
  isDelivered?: boolean;
};

export function TrackingLiveBadge({ lastUpdatedAt, isDelivered }: TrackingLiveBadgeProps) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  void tick;

  if (isDelivered) {
    return (
      <span className="tracking-live-badge tracking-live-badge--done">
        Pedido finalizado
      </span>
    );
  }

  const secondsSinceUpdate = lastUpdatedAt
    ? Math.max(0, Math.floor((Date.now() - lastUpdatedAt.getTime()) / 1000))
    : null;

  const label =
    secondsSinceUpdate == null
      ? "Conectando…"
      : secondsSinceUpdate < 8
        ? "Ao vivo"
        : `Atualizado há ${secondsSinceUpdate}s`;

  return (
    <span className="tracking-live-badge">
      <Radio className="size-3" />
      {label}
    </span>
  );
}
