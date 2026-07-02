import { food99ApiBase } from "./apiBase";

export type Food99TokenResponse = {
  accessToken: string;
  expiresIn: number;
};

async function postToken(
  apiBase: string,
  clientId: string,
  clientSecret: string,
): Promise<Food99TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });

  const paths = ["/opendelivery/oauth/token", "/oauth/token", "/v1/oauth/token"];

  let lastError = "Falha ao obter token 99Food";

  for (const path of paths) {
    const res = await fetch(`${apiBase}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        accept: "application/json",
      },
      body,
    });

    const text = await res.text();
    if (!res.ok) {
      lastError = `99Food OAuth ${path}: ${res.status} ${text.slice(0, 200)}`;
      continue;
    }

    const raw = JSON.parse(text) as Record<string, unknown>;
    const accessToken = String(raw.accessToken ?? raw.access_token ?? "").trim();
    if (!accessToken) {
      lastError = `99Food OAuth ${path}: resposta sem access_token`;
      continue;
    }

    return {
      accessToken,
      expiresIn: Number(raw.expiresIn ?? raw.expires_in ?? 3600),
    };
  }

  throw new Error(lastError);
}

export async function fetchFood99ClientCredentialsToken(input: {
  clientId: string;
  clientSecret: string;
  apiBase?: string | null;
}): Promise<Food99TokenResponse> {
  return postToken(food99ApiBase(input.apiBase), input.clientId.trim(), input.clientSecret.trim());
}
