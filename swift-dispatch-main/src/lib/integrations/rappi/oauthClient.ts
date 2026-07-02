const TOKEN_CACHE = new Map<string, { token: string; expiresAt: number }>();

function rappiApiBase(): string {
  return (
    process.env.RAPPI_API_BASE?.trim() ||
    process.env.RAPPI_COUNTRY_DOMAIN?.trim() ||
    "https://services.rappi.com.br"
  ).replace(/\/$/, "");
}

function rappiClientCredentials(): { clientId: string; clientSecret: string } | null {
  const clientId = process.env.RAPPI_CLIENT_ID?.trim();
  const clientSecret = process.env.RAPPI_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

/** OAuth client credentials — credenciais globais do integrador Rappi */
export async function ensureRappiAccessToken(): Promise<string | null> {
  const creds = rappiClientCredentials();
  if (!creds) return null;

  const cacheKey = creds.clientId;
  const hit = TOKEN_CACHE.get(cacheKey);
  if (hit && hit.expiresAt > Date.now() + 60_000) return hit.token;

  const res = await fetch(`${rappiApiBase()}/restaurants/auth/v1/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      grant_type: "client_credentials",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Rappi OAuth: ${res.status} ${text.slice(0, 200)}`);
  }

  const body = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
  };

  const token = body.access_token?.trim();
  if (!token) throw new Error("Rappi OAuth: resposta sem access_token");

  const expiresIn = typeof body.expires_in === "number" ? body.expires_in : 3600;
  TOKEN_CACHE.set(cacheKey, {
    token,
    expiresAt: Date.now() + expiresIn * 1000,
  });

  return token;
}

export function isRappiOAuthConfigured(): boolean {
  return rappiClientCredentials() !== null;
}

export { rappiApiBase };
