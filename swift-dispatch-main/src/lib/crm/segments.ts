export type CustomerSegment = "vip" | "inactive_30d" | "high_ticket" | "all";

export function segmentLabel(segment: CustomerSegment): string {
  const labels: Record<CustomerSegment, string> = {
    all: "Todos",
    vip: "VIP (5+ pedidos)",
    inactive_30d: "Inativos 30+ dias",
    high_ticket: "Alto ticket (> R$80)",
  };
  return labels[segment];
}
