/** Passo a passo exibido no painel de detalhe de cada automação */
export const AUTOMATION_FLOW_STEPS: Record<string, string[]> = {
  "sla-whatsapp": [
    "A cada 60s verifica pedidos fora do prazo",
    "Se houver atraso → envia WhatsApp ao gerente",
    "Cooldown de 30 min por pedido",
  ],
  "geofence-arriving": [
    "Atualiza posição do entregador (~15s)",
    "Distância ≤ 500 m ao cliente",
    "WhatsApp ao cliente (uma vez por pedido)",
  ],
  "geofence-arrived": [
    "Atualiza posição do entregador",
    "Distância ≤ 100 m → grava arrived_at",
    "Banner “chegou” no rastreio público",
  ],
  "auto-complete": [
    "Pedido com arrived_at preenchido",
    "Após 3 min → status entregue",
    "Registra CMV e notifica cliente",
  ],
  "ifood-poll": [
    "Consulta API iFood a cada 30s",
    "Importa novos pedidos e eventos",
    "Requer OAuth na aba Integração iFood",
  ],
  "driver-push": [
    "Pedido atribuído a um entregador",
    "Envia Web Push (PWA /entregador)",
    "Requer VAPID_* no servidor",
  ],
  "auto-dispatch": [
    "Ligado em Configurações da loja",
    "Escolhe entregador com menor carga",
    "Push + WhatsApp ao entregador",
  ],
  "ops-alerts": [
    "Monitora novos pedidos e proximidade",
    "Som + toast na Central e Kanban",
    "Alerta entregadores ociosos com fila",
  ],
  "kitchen-bottleneck": [
    "Conta pedidos em preparo",
    "Compara com limiar em Indicadores → Prazos",
    "Registra gargalo no console",
  ],
  "sla-delay": [
    "Compara horário do pedido + prazo SLA",
    "Dispara ao entrar em atraso",
    "Alimenta alertas da operação",
  ],
  "abandoned-cart-whatsapp": [
    "Cliente informa telefone no checkout e não finaliza",
    "Após 15 min envia WhatsApp com link do cardápio",
    "Uma lembrança por carrinho (Evolution API)",
  ],
};

export const AUTOMATION_CONFIG_HINTS = [
  { label: "Prazos e gargalo de cozinha", where: "Indicadores → Prazos" },
  { label: "WhatsApp (gerente e cliente)", where: "Menu WhatsApp + WHATSAPP_* no servidor" },
  { label: "Despacho automático", where: "Configurações da loja" },
  { label: "iFood", where: "Aba Integração iFood ou npm run ifood:poll" },
] as const;
