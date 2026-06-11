/** Automações reais do sistema (server-side ou hooks globais) */
export type LiveAutomation = {
  id: string;
  name: string;
  description: string;
  /** Sempre ativa quando requisitos mínimos estão ok */
  alwaysOn?: boolean;
  serverSide?: boolean;
  schedule?: string;
};

export const LIVE_AUTOMATIONS: LiveAutomation[] = [
  {
    id: "sla-whatsapp",
    name: "SLA crítico → WhatsApp gerente",
    description: "Pedidos atrasados disparam alerta ao gerente via WhatsApp (cooldown 30 min).",
    alwaysOn: true,
    serverSide: true,
    schedule: "A cada 60s",
  },
  {
    id: "geofence-arriving",
    name: "Geofence 500 m → WhatsApp cliente",
    description: "Entregador a ≤500 m avisa o cliente por WhatsApp (uma vez por pedido).",
    alwaysOn: true,
    serverSide: true,
  },
  {
    id: "geofence-arrived",
    name: "Chegada 100 m → marcar destino",
    description: "Grava arrived_at quando o entregador entra no raio de 100 m.",
    alwaysOn: true,
    serverSide: true,
  },
  {
    id: "auto-complete",
    name: "Auto-finalizar após chegada",
    description: "Marca pedido como entregue 3 min após arrived_at (geofence).",
    alwaysOn: true,
    serverSide: true,
  },
  {
    id: "ifood-poll",
    name: "Polling iFood",
    description: "Importa eventos iFood quando OAuth está configurado.",
    serverSide: true,
    schedule: "A cada 30s",
  },
  {
    id: "driver-push",
    name: "Push → entregador",
    description: "Web Push quando um pedido é atribuído ao entregador (PWA /entregador).",
    alwaysOn: true,
    serverSide: true,
  },
  {
    id: "auto-dispatch",
    name: "Despacho automático",
    description: "Atribui entregador disponível quando auto-dispatch está ligado.",
    serverSide: true,
  },
  {
    id: "ops-alerts",
    name: "Alertas sonoros na operação",
    description: "Som + toast para pedidos novos, proximidade e chegada ao cliente.",
    alwaysOn: true,
  },
  {
    id: "kitchen-bottleneck",
    name: "Gargalo de cozinha",
    description: "Detecta fila alta em preparo conforme limiar em Configurações → SLA.",
    alwaysOn: true,
    serverSide: true,
  },
  {
    id: "sla-delay",
    name: "Pedido em atraso (SLA)",
    description: "Monitora pedidos que ultrapassaram o SLA configurado.",
    alwaysOn: true,
    serverSide: true,
  },
];
