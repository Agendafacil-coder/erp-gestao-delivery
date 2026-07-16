/** Mensagens amigáveis — seguro para o cliente (sem DB). */

export function friendlyWhatsappSaveError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  const lower = raw.toLowerCase();
  if (lower.includes("url") || lower.includes("endereço")) {
    return "Informe o endereço do serviço (URL).";
  }
  if (lower.includes("instância") || lower.includes("instance")) {
    return "Informe o nome da instância ou ID.";
  }
  if (lower.includes("token") || lower.includes("senha") || lower.includes("api key")) {
    return "Informe o token / senha de acesso.";
  }
  if (raw.trim() && !lower.includes("error") && raw.length < 120) {
    return raw;
  }
  return "Não foi possível salvar a conexão. Confira os dados.";
}

export function friendlyIfoodConnectError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  const lower = raw.toLowerCase();
  if (lower.includes("id") && lower.includes("senha")) {
    return raw;
  }
  if (
    lower.includes("oauth") ||
    lower.includes("unauthorized") ||
    lower.includes("invalid_client")
  ) {
    return "ID ou senha do aplicativo incorretos. Confira no Portal do Parceiro iFood.";
  }
  if (raw.trim() && raw.length < 160 && !lower.startsWith("error")) {
    return raw;
  }
  return "Não foi possível conectar ao iFood. Confira os dados e tente de novo.";
}
