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
      actionLabel: "Conexão API",
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
    // WhatsApp
    whatsapp_evolution: {
      kind: "route",
      to: "/sistema",
      search: { secao: "whatsapp", aba: "api" },
      actionLabel: "Conexão API",
    },
    whatsapp_manager_phone: {
      kind: "server",
      actionLabel: "Variável WHATSAPP_MANAGER_PHONE no servidor",
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
      actionLabel: "Webhook no painel do PSP",
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
      actionLabel: "Webhook Mercado Pago",
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
      actionLabel: "Webhook Stripe",
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
      actionLabel: "Webhook Asaas",
    },
    mock_ok: {
      kind: "route",
      to: "/financeiro",
      search: { secao: "financeiro", aba: "pagamentos" },
      actionLabel: "Pagamentos",
    },
    // Integrações
    ifood_cron: {
      kind: "route",
      to: "/sistema",
      search: { secao: "automacoes", aba: "ifood" },
      actionLabel: "Integração iFood",
    },
    // Infra / env — sem tela no app
    database: {
      kind: "server",
      actionLabel: "DATABASE_URL no servidor ou Docker",
    },
    session_secret: {
      kind: "server",
      actionLabel: "SESSION_SECRET no .env do servidor",
    },
    public_url: {
      kind: "server",
      actionLabel: "PUBLIC_APP_URL no .env do servidor",
    },
    vapid: {
      kind: "server",
      actionLabel: "VAPID_* no .env do servidor",
    },
    vapid_subject: {
      kind: "server",
      actionLabel: "VAPID_SUBJECT no .env do servidor",
    },
    mapbox: {
      kind: "server",
      actionLabel: "VITE_MAPBOX_TOKEN no .env do servidor",
    },
  };

  return map[itemId] ?? null;
}
