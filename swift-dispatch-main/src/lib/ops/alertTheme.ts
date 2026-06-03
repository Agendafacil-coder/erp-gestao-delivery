/** Classes Tailwind para níveis de alerta operacional. */
export const ALERT_COLOR = {
  low: "border-l-muted-foreground text-muted-foreground",
  med: "border-l-warning text-warning",
  high: "border-l-accent text-accent",
  crit: "border-l-danger text-danger",
} as const;

export type AlertLevel = keyof typeof ALERT_COLOR;
