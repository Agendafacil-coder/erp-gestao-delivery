/** Caminho público de rastreio — `/rastreio/{orderId}/{token}` */

export function publicTrackingPath(orderId: string, token: string): string {
  return `/rastreio/${orderId}/${token}`;
}

function resolveAppBase(base?: string): string {
  const raw =
    base ??
    (typeof window !== "undefined" ? window.location.origin : undefined) ??
    process.env.PUBLIC_APP_URL ??
    process.env.VITE_APP_URL ??
    "";
  return raw.replace(/\/$/, "");
}

/** URL absoluta do rastreio público (cliente). */
export function publicTrackingUrl(
  orderId: string,
  token: string | null | undefined,
  base?: string,
): string {
  const origin = resolveAppBase(base);
  if (!token) return origin || "/";
  const path = publicTrackingPath(orderId, token);
  return origin ? `${origin}${path}` : path;
}

/** URL de retorno pós-checkout (PSP) com query opcional. */
export function publicTrackingReturnUrl(
  orderId: string,
  token: string,
  search?: Record<string, string>,
  base?: string,
): string {
  const origin = resolveAppBase(base);
  const path = publicTrackingPath(orderId, token);
  const params = new URLSearchParams(search);
  const qs = params.toString();
  return `${origin}${path}${qs ? `?${qs}` : ""}`;
}
