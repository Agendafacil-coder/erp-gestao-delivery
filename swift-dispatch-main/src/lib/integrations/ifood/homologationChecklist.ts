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
      label: "Modo de testes iFood ativo",
      ok: isIfoodHomologationMode(),
      hint: "Necessário para testes oficiais e conferência financeira",
    },
    {
      id: "oauth",
      label: "Login no iFood conectado",
      ok: config.oauth_connected,
    },
    {
      id: "merchant",
      label: "ID da loja no iFood informado",
      ok: !!config.merchant_id?.trim(),
    },
    {
      id: "webhook",
      label: "Senha de segurança dos avisos configurada",
      ok: config.webhook_secret_set,
      hint: "Recomendado em produção",
    },
    {
      id: "polling",
      label: "Busca automática de pedidos ativa",
      ok: config.enabled && config.polling_enabled,
    },
    {
      id: "integration",
      label: "Integração iFood ligada",
      ok: config.enabled,
    },
  ];
}
