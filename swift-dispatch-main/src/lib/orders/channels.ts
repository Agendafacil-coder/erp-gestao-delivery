/** Canais de origem de pedidos — valores persistidos em orders.channel */
export const ORDER_CHANNELS = [
  "web",
  "ifood",
  "rappi",
  "99food",
  "whatsapp",
  "balcao",
  "manual",
  "site",
  "salao",
] as const;

export type OrderChannel = (typeof ORDER_CHANNELS)[number];

const CHANNEL_ALIASES: Record<string, OrderChannel> = {
  web: "web",
  site: "web",
  cardapio: "web",
  cardápio: "web",
  ifood: "ifood",
  i_food: "ifood",
  rappi: "rappi",
  "99food": "99food",
  "99_food": "99food",
  whatsapp: "whatsapp",
  zap: "whatsapp",
  wa: "whatsapp",
  balcao: "balcao",
  balcão: "balcao",
  manual: "manual",
  telefone: "manual",
  instagram: "manual",
  salao: "salao",
  salão: "salao",
  mesa: "salao",
};

export const CHANNEL_LABEL: Record<OrderChannel, string> = {
  web: "Site",
  ifood: "iFood",
  rappi: "Rappi",
  "99food": "99Food",
  whatsapp: "WhatsApp",
  balcao: "Balcão",
  manual: "Manual",
  site: "Site",
  salao: "Mesa",
};

export const CHANNEL_COLOR: Record<OrderChannel, string> = {
  web: "bg-primary/15 text-primary border-primary/25",
  ifood: "bg-[#EA1D2C]/15 text-[#EA1D2C] border-[#EA1D2C]/25",
  rappi: "bg-[#FF441F]/15 text-[#FF441F] border-[#FF441F]/25",
  "99food": "bg-[#FFD100]/20 text-[#B8860B] border-[#FFD100]/40",
  whatsapp: "bg-success/15 text-success border-success/25",
  balcao: "bg-muted text-muted-foreground border-border",
  manual: "bg-muted text-muted-foreground border-border",
  site: "bg-primary/15 text-primary border-primary/25",
  salao: "bg-warning/15 text-warning border-warning/25",
};

/** Normaliza valor legado do banco para canal conhecido ou retorna texto original */
export function normalizeOrderChannel(raw: string | null | undefined): OrderChannel | string {
  const key = raw?.trim().toLowerCase().replace(/\s+/g, "_") ?? "";
  if (!key) return "manual";
  return CHANNEL_ALIASES[key] ?? raw!.trim();
}

export function channelLabel(raw: string | null | undefined): string {
  const norm = normalizeOrderChannel(raw);
  if (typeof norm === "string" && norm in CHANNEL_LABEL) {
    return CHANNEL_LABEL[norm as OrderChannel];
  }
  return raw?.trim() || "Outros";
}

export function channelColorClass(raw: string | null | undefined): string {
  const norm = normalizeOrderChannel(raw);
  if (typeof norm === "string" && norm in CHANNEL_COLOR) {
    return CHANNEL_COLOR[norm as OrderChannel];
  }
  return "bg-muted text-muted-foreground border-border";
}
