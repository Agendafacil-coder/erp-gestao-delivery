export type WhatsappTemplateKey =
  | "order_received"
  | "preparing"
  | "dispatched"
  | "delivered"
  | "driver_arriving"
  | "driver_assigned"
  | "manager_sla_alert";

export const WHATSAPP_TEMPLATE_KEYS: WhatsappTemplateKey[] = [
  "order_received",
  "preparing",
  "dispatched",
  "delivered",
  "driver_arriving",
  "driver_assigned",
  "manager_sla_alert",
];

export const WHATSAPP_TEMPLATE_META: Record<
  WhatsappTemplateKey,
  { label: string; audience: "cliente" | "entregador" }
> = {
  order_received: { label: "Pedido recebido", audience: "cliente" },
  preparing: { label: "Em preparo", audience: "cliente" },
  dispatched: { label: "Saiu para entrega", audience: "cliente" },
  delivered: { label: "Pedido finalizado", audience: "cliente" },
  driver_arriving: { label: "Entregador chegando", audience: "cliente" },
  driver_assigned: { label: "Nova entrega", audience: "entregador" },
  manager_sla_alert: { label: "Alerta SLA", audience: "gerente" },
};

export const DEFAULT_WHATSAPP_TEMPLATES: Record<WhatsappTemplateKey, string> = {
  order_received:
    "Olá {{cliente}}, recebemos seu pedido {{pedido}}! Já estamos preparando tudo. ETA: {{eta}} min. Acompanhe: {{link_rastreio}}",
  preparing:
    "Olá {{cliente}}! Seu pedido {{pedido}} entrou em preparo na cozinha. ETA: {{eta}} min.",
  dispatched:
    "🚀 Saiu para entrega! Seu pedido {{pedido}} está a caminho. Acompanhe em tempo real: {{link_rastreio}}",
  delivered:
    "Pedido {{pedido}} finalizado! Obrigado, {{cliente}}. Esperamos você de novo em breve.",
  driver_arriving:
    "🛵 {{entregador}} está chegando com seu pedido {{pedido}} (~{{distancia}} m)! Acompanhe: {{link_rastreio}}",
  driver_assigned:
    "🏍️ Nova entrega: {{pedido}} · {{cliente}} · {{bairro}}. Endereço: {{endereco}}. Retire no restaurante quando estiver pronto.",
  manager_sla_alert:
    "🚨 SLA em risco · {{pedido}} · {{cliente}} · {{minutos}} min (SLA {{sla}} min). Região: {{bairro}}.",
};

export function renderWhatsappTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}
