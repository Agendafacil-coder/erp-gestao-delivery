import { parseSistemaSection, type SistemaSection } from "@/lib/sistema/sections";

export type WhatsappAba = "logs" | "templates" | "campaigns" | "api";
export type AutomacoesAba = "regras" | "ifood";
export type ConfigsAba = "loja" | "operacao" | "equipe";

export type SistemaAba = WhatsappAba | AutomacoesAba | ConfigsAba;

export type SistemaSearch = {
  secao: SistemaSection;
  aba?: SistemaAba;
};

const WHATSAPP_ABAS: WhatsappAba[] = ["logs", "templates", "campaigns", "api"];
const AUTOMACOES_ABAS: AutomacoesAba[] = ["regras", "ifood"];
const CONFIGS_ABAS: ConfigsAba[] = ["loja", "operacao", "equipe"];

export function defaultSistemaAba(secao: SistemaSection): SistemaAba | undefined {
  switch (secao) {
    case "whatsapp":
      return "logs";
    case "automacoes":
      return "regras";
    case "configs":
      return "loja";
    default:
      return undefined;
  }
}

export function parseSistemaAba(
  secao: SistemaSection,
  value: unknown,
): SistemaAba | undefined {
  if (typeof value !== "string") return defaultSistemaAba(secao);

  if (secao === "whatsapp" && WHATSAPP_ABAS.includes(value as WhatsappAba)) {
    return value as WhatsappAba;
  }
  if (secao === "automacoes" && AUTOMACOES_ABAS.includes(value as AutomacoesAba)) {
    return value as AutomacoesAba;
  }
  if (secao === "configs" && CONFIGS_ABAS.includes(value as ConfigsAba)) {
    return value as ConfigsAba;
  }

  return defaultSistemaAba(secao);
}

export function validateSistemaSearch(search: Record<string, unknown>): SistemaSearch {
  const secao = parseSistemaSection(search.secao);
  if (secao === "auditoria") return { secao };
  const aba = parseSistemaAba(secao, search.aba);
  return aba ? { secao, aba } : { secao };
}
