import type { AutomacoesAba, ConfigsAba, WhatsappAba } from "@/lib/sistema/search";
import type { FinanceTab } from "@/lib/gestao/financeTabs";

export type ReadinessDestination =
  | {
      kind: "route";
      to: "/sistema";
      search: {
        secao: "whatsapp" | "automacoes" | "configs";
        aba?: WhatsappAba | AutomacoesAba | ConfigsAba;
      };
      actionLabel: string;
    }
  | {
      kind: "route";
      to: "/financeiro";
      search: { secao: "financeiro"; aba: FinanceTab };
      actionLabel: string;
    }
  | {
      kind: "server";
      actionLabel: string;
    };

/** Para onde ir ao clicar em um item pendente do checklist. */
export function resolveReadinessDestination(itemId: string): ReadinessDestination | null {
  const map: Record<string, ReadinessDestination | null> = {
    // Loja (tenant)
    tenant_whatsapp: {
      kind: "route",
      to: "/sistema",
      search: { secao: "whatsapp", aba: "api" },
      actionLabel: "Ver conexão",
    },
    tenant_region: {
      kind: "route",
      to: "/sistema",
      search: { secao: "configs", aba: "loja" },
      actionLabel: "Região da loja",
    },
    tenant_fulfillment: {
      kind: "route",
      to: "/sistema",
      search: { secao: "configs", aba: "loja" },
      actionLabel: "Formas de pedido",
    },
    tenant_ifood: {
      kind: "route",
      to: "/sistema",
      search: { secao: "automacoes", aba: "ifood" },
      actionLabel: "Conectar iFood",
    },
    tenant_rappi: {
      kind: "route",
      to: "/sistema",
      search: { secao: "automacoes", aba: "rappi" },
      actionLabel: "Conectar Rappi",
    },
    tenant_food99: {
      kind: "route",
      to: "/sistema",
      search: { secao: "automacoes", aba: "99food" },
      actionLabel: "Conectar 99Food",
    },
    // WhatsApp
    whatsapp_evolution: {
      kind: "route",
      to: "/sistema",
      search: { secao: "whatsapp", aba: "api" },
      actionLabel: "Ver conexão",
    },
    whatsapp_manager_phone: {
      kind: "server",
      actionLabel: "Configuração do suporte",
    },
    // Pagamentos
    payment_provider: {
      kind: "route",
      to: "/financeiro",
      search: { secao: "financeiro", aba: "pagamentos" },
      actionLabel: "Integração de pagamentos",
    },
    webhook: {
      kind: "route",
      to: "/financeiro",
      search: { secao: "financeiro", aba: "pagamentos" },
      actionLabel: "Aviso automático de pagamento",
    },
    mp_token: {
      kind: "route",
      to: "/financeiro",
      search: { secao: "financeiro", aba: "pagamentos" },
      actionLabel: "Credenciais Mercado Pago",
    },
    mp_secret: {
      kind: "route",
      to: "/financeiro",
      search: { secao: "financeiro", aba: "pagamentos" },
      actionLabel: "Aviso automático Mercado Pago",
    },
    stripe_key: {
      kind: "route",
      to: "/financeiro",
      search: { secao: "financeiro", aba: "pagamentos" },
      actionLabel: "Credenciais Stripe",
    },
    stripe_wh: {
      kind: "route",
      to: "/financeiro",
      search: { secao: "financeiro", aba: "pagamentos" },
      actionLabel: "Aviso automático Stripe",
    },
    asaas_key: {
      kind: "route",
      to: "/financeiro",
      search: { secao: "financeiro", aba: "pagamentos" },
      actionLabel: "Credenciais Asaas",
    },
    asaas_wh: {
      kind: "route",
      to: "/financeiro",
      search: { secao: "financeiro", aba: "pagamentos" },
      actionLabel: "Aviso automático Asaas",
    },
    mock_ok: {
      kind: "route",
      to: "/financeiro",
      search: { secao: "financeiro", aba: "pagamentos" },
      actionLabel: "Pagamentos",
    },
    // Integrações — secrets de cron são do servidor (dono não resolve na tela)
    ifood_cron: {
      kind: "server",
      actionLabel: "Configuração do suporte técnico",
    },
    rappi_cron: {
      kind: "server",
      actionLabel: "Configuração do suporte técnico",
    },
    food99_cron: {
      kind: "server",
      actionLabel: "Configuração do suporte técnico",
    },
    // Infra / env — sem tela no app
    database: {
      kind: "server",
      actionLabel: "Configuração do suporte técnico",
    },
    session_secret: {
      kind: "server",
      actionLabel: "Configuração do suporte técnico",
    },
    public_url: {
      kind: "server",
      actionLabel: "Configuração do suporte técnico",
    },
    vapid: {
      kind: "server",
      actionLabel: "Configuração do suporte técnico",
    },
    vapid_subject: {
      kind: "server",
      actionLabel: "Configuração do suporte técnico",
    },
    mapbox: {
      kind: "server",
      actionLabel: "Configuração do suporte técnico",
    },
  };

  return map[itemId] ?? null;
}
