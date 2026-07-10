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
    name: "Prazo estourado → WhatsApp gerente",
    description: "Pedidos atrasados disparam alerta ao gerente via WhatsApp (cooldown 30 min).",
    alwaysOn: true,
    serverSide: true,
    schedule: "A cada 60s",
  },
  {
    id: "geofence-arriving",
    name: "Perto do cliente → WhatsApp",
    description: "Quando o entregador chega perto (500 m), avisa o cliente por WhatsApp.",
    alwaysOn: true,
    serverSide: true,
  },
  {
    id: "geofence-arrived",
    name: "Chegou no endereço",
    description: "Marca que o entregador chegou quando está a menos de 100 m.",
    alwaysOn: true,
    serverSide: true,
  },
  {
    id: "auto-complete",
    name: "Auto-finalizar após chegada",
    description: "Marca o pedido como entregue 3 min depois que o entregador chega.",
    alwaysOn: true,
    serverSide: true,
  },
  {
    id: "ifood-poll",
    name: "Pedidos do iFood",
    description: "Busca pedidos novos do iFood quando a loja está conectada.",
    serverSide: true,
    schedule: "A cada 30s",
  },
  {
    id: "rappi-poll",
    name: "Pedidos do Rappi",
    description: "Busca pedidos novos do Rappi quando a loja está conectada.",
    serverSide: true,
    schedule: "A cada 30s",
  },
  {
    id: "food99-poll",
    name: "Pedidos da 99Food",
    description: "Busca pedidos novos da 99Food quando a loja está conectada.",
    serverSide: true,
    schedule: "A cada 30s",
  },
  {
    id: "driver-push",
    name: "Aviso no celular do entregador",
    description: "Notifica o entregador no app quando um pedido é atribuído.",
    alwaysOn: true,
    serverSide: true,
  },
  {
    id: "auto-dispatch",
    name: "Despacho automático",
    description: "Atribui entregador disponível quando o despacho automático está ligado.",
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
    description: "Detecta fila alta em preparo conforme limiar em Indicadores → Prazos.",
    alwaysOn: true,
    serverSide: true,
  },
  {
    id: "sla-delay",
    name: "Pedido em atraso",
    description: "Monitora pedidos que ultrapassaram o prazo configurado.",
    alwaysOn: true,
    serverSide: true,
  },
  {
    id: "abandoned-cart-whatsapp",
    name: "Carrinho abandonado → WhatsApp",
    description:
      "Envia lembrete ao cliente 15 min após preencher telefone no checkout sem finalizar.",
    serverSide: true,
    schedule: "A cada 60s",
  },
];
