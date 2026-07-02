/** Modo homologação iFood — header x-request-homologation em todas as chamadas */
export function isIfoodHomologationMode(): boolean {
  const raw = process.env.IFOOD_HOMOLOGATION?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

export function buildIfoodApiHeaders(
  accessToken: string,
  extra?: Record<string, string>,
): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    accept: "application/json",
    ...extra,
  };
  if (isIfoodHomologationMode()) {
    headers["x-request-homologation"] = "true";
  }
  return headers;
}
