import type { IfoodTenantConfigDto } from "./types";
import { isIfoodHomologationMode } from "./ifoodHomologation";

export type IfoodHomologationItem = {
  id: string;
  label: string;
  ok: boolean;
  hint?: string;
};

export function buildIfoodHomologationChecklist(
  config: IfoodTenantConfigDto,
): IfoodHomologationItem[] {
  return [
    {
      id: "homologation_header",
      label: "Modo homologação (IFOOD_HOMOLOGATION=true no servidor)",
      ok: isIfoodHomologationMode(),
      hint: "Obrigatório para testes oficiais e reconciliação financeira",
    },
    {
      id: "oauth",
      label: "OAuth conectado",
      ok: config.oauth_connected,
    },
    {
      id: "merchant",
      label: "Merchant ID configurado",
      ok: !!config.merchant_id?.trim(),
    },
    {
      id: "webhook",
      label: "Webhook secret configurado",
      ok: config.webhook_secret_set,
      hint: "Recomendado em produção",
    },
    {
      id: "polling",
      label: "Polling ativo",
      ok: config.enabled && config.polling_enabled,
    },
    {
      id: "integration",
      label: "Integração iFood ativa",
      ok: config.enabled,
    },
  ];
}
