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
    "A menos de 100 m → marca que chegou",
    "Mostra “chegou” no rastreio do cliente",
  ],
  "auto-complete": [
    "Pedido com chegada registrada",
    "Após 3 min → marca como entregue",
    "Atualiza o custo e avisa o cliente",
  ],
  "ifood-poll": [
    "Busca pedidos do iFood a cada 30s",
    "Importa novos pedidos e avisos",
    "Precisa da loja conectada em iFood e avisos → iFood",
  ],
  "rappi-poll": [
    "Busca pedidos do Rappi a cada 30s",
    "Importa pedidos prontos da loja",
    "Precisa da loja conectada em iFood e avisos → Rappi",
  ],
  "food99-poll": [
    "Busca pedidos da 99Food a cada 30s",
    "Importa pedidos novos e confirma recebimento",
    "Precisa da loja conectada em iFood e avisos → 99Food",
  ],
  "driver-push": [
    "Pedido atribuído a um entregador",
    "Envia aviso no celular do entregador",
    "Configuração feita pelo suporte técnico",
  ],
  "auto-dispatch": [
    "Ligado em iFood e avisos → Avisos automáticos",
    "Escolhe entregador com menor carga",
    "Avisa o entregador no app e no WhatsApp",
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
    "Uma lembrança por carrinho",
  ],
};

export const AUTOMATION_CONFIG_HINTS = [
  {
    label: "Prazos e gargalo de cozinha",
    where: "Gestão → Indicadores → Prazos",
    to: "/financeiro" as const,
    search: { secao: "indicadores" as const },
  },
  {
    label: "WhatsApp (gerente e cliente)",
    where: "WhatsApp → Ligado?",
    to: "/sistema" as const,
    search: { secao: "whatsapp" as const, aba: "api" as const },
  },
  {
    label: "Despacho automático",
    where: "iFood e avisos → Avisos automáticos",
    to: "/sistema" as const,
    search: { secao: "automacoes" as const, aba: "regras" as const },
  },
  {
    label: "iFood",
    where: "iFood e avisos → iFood",
    to: "/sistema" as const,
    search: { secao: "automacoes" as const, aba: "ifood" as const },
  },
] as const;
